import { Router } from 'express';
import { query } from './db.js';
import { sendFileToChannel, getFileInfo } from './telegram.js';
import { FileMeta } from './types.js';
import crypto from 'crypto';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import path from 'path';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { supabase } from './supabase.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN env var');

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
router.use(limiter);

// Add helper at top
function isValidDate(d: any) { return !isNaN(new Date(d).getTime()); }

// POST /upload
router.post('/upload', async (req, res) => {
  try {
    console.log('UPLOAD DEBUG req.body:', req.body);
    console.log('UPLOAD DEBUG req.files:', req.files);
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
    const { name, size, mimetype, data } = file;
    if (size > 2 * 1024 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (max 2GB).' });
    }
    // Generate slug
    const slug = crypto.randomBytes(6).toString('base64url');
    // Forward to Telegram
    let tgInfo;
    try {
      tgInfo = await sendFileToChannel(data, name, mimetype);
    } catch (err) {
      console.error('Telegram upload failed:', err);
      return res.status(500).json({ error: 'Failed to upload to Telegram.' });
    }
    if (!tgInfo || !tgInfo.file_id) {
      return res.status(500).json({ error: 'Telegram upload did not return a file_id.' });
    }
    // Store metadata in DB
    const uploader_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const user_agent = req.headers['user-agent'] || '';
    let expiry_at = null;
    if (req.body.expiry_at && isValidDate(req.body.expiry_at)) {
      expiry_at = new Date(req.body.expiry_at).toISOString();
    } else if (req.body.expiry_days && !isNaN(Number(req.body.expiry_days))) {
      expiry_at = new Date(Date.now() + Number(req.body.expiry_days) * 86400000).toISOString();
    }
    // Optionally: max_downloads (not in schema, but can be enforced in logic)
    const insert = await query(
      `INSERT INTO files (name, size, mimetype, slug, uploader_ip, telegram_file_id, telegram_message_id, download_count, expiry_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8) RETURNING *`,
      [name, size, mimetype, slug, uploader_ip, tgInfo.file_id, tgInfo.message_id, expiry_at]
    );
    // Optionally log user-agent elsewhere if needed
    const fileMeta = insert.rows[0];
    // Store metadata in Supabase user_files
    if (req.body.user_id) {
      // Insert user if not exists
      let userEmail = req.body.user_email;
      if (!userEmail) {
        // Try to fetch from users table
        const { data: userRows } = await supabase.from('users').select('email').eq('id', req.body.user_id).limit(1);
        if (userRows && userRows.length > 0) {
          userEmail = userRows[0].email;
        } else {
          console.warn('UPLOAD: user_email missing and not found in users table for user_id', req.body.user_id);
        }
      }
      if (userEmail) {
        await supabase.from('users').upsert([
          { id: req.body.user_id, email: userEmail }
        ], { onConflict: 'id' });
      }
      const isNote = req.body.is_note === 'true';
      const { data, error } = await supabase.from('user_files').insert([
        {
          user_id: req.body.user_id,
          name,
          slug,
          mimetype,
          size,
          notes: req.body.notes || null,
          type: isNote ? 'note' : 'file',
        }
      ]);
      console.log('SUPABASE INSERT user_files data:', data, 'error:', error);
    }
    res.status(201).json({
      slug,
      file: {
        name: fileMeta.name,
        size: fileMeta.size,
        mimetype: fileMeta.mimetype,
        created_at: fileMeta.created_at,
        download_count: fileMeta.download_count,
        expiry_at: fileMeta.expiry_at,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

// GET /file/:slug
router.get('/file/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await query('SELECT * FROM files WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found.' });
    }
    const file = result.rows[0];
    // Get Telegram file path (do not construct or log the CDN URL)
    await getFileInfo(file.telegram_file_id); // Only to verify existence
    res.json({
      name: file.name,
      size: file.size,
      mimetype: file.mimetype,
      created_at: file.created_at,
      download_count: file.download_count,
      expiry_at: file.expiry_at,
      download_url: `/api/download/${slug}`,
    });
  } catch (err) {
    console.error('File info error:', err);
    res.status(500).json({ error: 'Failed to fetch file info.' });
  }
});

// GET /download/:slug
router.get('/download/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await query('SELECT * FROM files WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found.' });
    }
    const file = result.rows[0];
    // Check expiry
    if (file.expiry_at && new Date(file.expiry_at) < new Date()) {
      return res.status(410).json({ error: 'File expired.' });
    }
    // Optionally: check max downloads (if you want to enforce a limit)
    if (req.query.max_downloads && file.download_count >= Number(req.query.max_downloads)) {
      return res.status(410).json({ error: 'Max downloads reached.' });
    }
    // Increment download count
    await query('UPDATE files SET download_count = download_count + 1 WHERE id = $1', [file.id]);
    // Get Telegram file path
    const tgFile = await getFileInfo(file.telegram_file_id);
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
    const tgRes = await axios.get(downloadUrl, { responseType: 'stream' });
    // Set headers for download/streaming
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9_\-.]/g, '_');
    if (file.mimetype === 'application/pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    }
    // Pipe the Telegram file stream to the response
    tgRes.data.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download file.' });
  }
});

// POST /flag
router.post('/flag', async (req, res) => {
  try {
    const { file_id, slug, reason } = req.body;
    if (!reason || (!file_id && !slug)) {
      return res.status(400).json({ error: 'Missing file_id/slug or reason.' });
    }
    let fid = file_id;
    if (!fid && slug) {
      const result = await query('SELECT id FROM files WHERE slug = $1', [slug]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File not found.' });
      }
      fid = result.rows[0].id;
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    await query(
      'INSERT INTO abuse_flags (file_id, reason, ip) VALUES ($1, $2, $3)',
      [fid, reason, ip]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Flag error:', err);
    res.status(500).json({ error: 'Failed to flag file.' });
  }
});

// Proxy endpoint for note content
router.get('/note-content/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await query('SELECT * FROM files WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found.' });
    }
    const file = result.rows[0];
    const tgFile = await getFileInfo(file.telegram_file_id);
    // Only use the Telegram CDN URL internally for axios, never in responses or logs
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
    const tgRes = await axios.get(downloadUrl, { responseType: 'text' });
    res.set('Content-Type', 'text/plain');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(tgRes.data);
  } catch (err) {
    console.error('Note content proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch note content.' });
  }
});

// GET /zip-list/:slug
router.get('/zip-list/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log('ZIP list endpoint hit for slug:', slug);
    const result = await query('SELECT * FROM files WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      console.log('ZIP list: file not found');
      return res.status(404).json({ error: 'File not found.' });
    }
    const file = result.rows[0];
    if (file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
      console.log('ZIP list: not a zip file');
      return res.status(400).json({ error: 'Not a ZIP file.' });
    }
    const tgFile = await getFileInfo(file.telegram_file_id);
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
    const tgRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(tgRes.data);
    const debugPath = `debug-${slug}.zip`;
    fs.writeFileSync(debugPath, buffer);
    console.log(`Saved Telegram ZIP buffer to ${debugPath} (${buffer.length} bytes)`);
    const zip = new AdmZip(buffer);
    const files = zip.getEntries().map((e: AdmZip.IZipEntry) => e.entryName);
    console.log('ZIP list: extracted files', files);
    res.json({ files });
  } catch (err) {
    console.error('ZIP list error:', err);
    res.status(500).json({ error: 'Failed to extract ZIP file list.' });
  }
});

// GET /mydrops
router.get('/mydrops', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ files: data });
  } catch (err) {
    console.error('mydrops fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user files.' });
  }
});

// DELETE /mydrops/:slug
router.delete('/mydrops/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    const { error } = await supabase
      .from('user_files')
      .delete()
      .eq('slug', slug)
      .eq('user_id', user_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('mydrops delete error:', err);
    res.status(500).json({ error: 'Failed to delete user file.' });
  }
});

export default router; 