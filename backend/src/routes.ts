import { Router } from 'express';
import { query } from './db.js';
import { sendFileToChannel, getFileInfo } from './telegram.js';
import { FileMeta } from './types.js';
import * as crypto from 'crypto';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
// @ts-ignore
import yauzl from 'yauzl';
import * as fs from 'fs';
import { supabase } from './supabase.js';
import AdmZip from 'adm-zip';

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

// POST /upload-chunk
router.post('/upload-chunk', async (req, res) => {
  try {
    // Validate required fields
    const { fileId, chunkIndex, totalChunks, fileName, fileSize, mimetype, checksum, user_id, user_email } = req.body;
    if (
      !fileId ||
      chunkIndex === undefined ||
      !totalChunks ||
      !checksum ||
      !req.files ||
      !req.files.chunk
    ) {
      return res.status(400).json({ error: 'Missing required fields or chunk file.' });
    }
    const chunkFile = Array.isArray(req.files.chunk) ? req.files.chunk[0] : req.files.chunk;
    // Upload chunk to Telegram
    let tgInfo;
    try {
      tgInfo = await sendFileToChannel(chunkFile.data, `${fileName || 'chunk'}.${chunkIndex}`, mimetype || chunkFile.mimetype);
    } catch (err) {
      console.error('Telegram upload failed:', err);
      return res.status(500).json({ error: 'Failed to upload chunk to Telegram.' });
    }
    if (!tgInfo || !tgInfo.file_id) {
      return res.status(500).json({ error: 'Telegram upload did not return a file_id.' });
    }
    // Insert chunk metadata
    await query(
      `INSERT INTO file_chunks (file_id, chunk_index, telegram_file_id, telegram_message_id, size, checksum)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (file_id, chunk_index) DO NOTHING`,
      [fileId, chunkIndex, tgInfo.file_id, tgInfo.message_id, chunkFile.size, checksum]
    );
    // On first chunk, insert into files if not exists
    if (Number(chunkIndex) === 0) {
      const slug = crypto.randomBytes(6).toString('base64url');
      const uploader_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      await query(
        `INSERT INTO files (id, name, size, mimetype, slug, uploader_ip, is_chunked, total_chunks, upload_state)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, 'uploading')
         ON CONFLICT (id) DO NOTHING`,
        [fileId, fileName, fileSize, mimetype || chunkFile.mimetype, slug, uploader_ip, totalChunks]
      );
      // Optionally insert into user_files
      if (user_id) {
        let userEmail = user_email;
        if (!userEmail) {
          const { data: userRows } = await supabase.from('users').select('email').eq('id', user_id).limit(1);
          if (userRows && userRows.length > 0) userEmail = userRows[0].email;
        }
        if (userEmail) {
          await supabase.from('users').upsert([
            { id: user_id, email: userEmail }
          ], { onConflict: 'id' });
        }
        await supabase.from('user_files').insert([
          {
            user_id,
            name: fileName,
            slug,
            mimetype: mimetype || chunkFile.mimetype,
            size: fileSize,
            notes: req.body.notes || null,
            type: 'file',
          }
        ]);
      }
    }
    // On final chunk, mark file as complete
    if (Number(chunkIndex) === Number(totalChunks) - 1) {
      await query(
        `UPDATE files SET upload_state = 'complete' WHERE id = $1`,
        [fileId]
      );
    }
    res.status(201).json({ success: true, chunkIndex, telegram_file_id: tgInfo.file_id });
  } catch (err) {
    console.error('Upload-chunk error:', err);
    res.status(500).json({ error: 'Chunk upload failed.' });
  }
});

// POST /upload-auto
router.post('/upload-auto', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
    const { name, size, mimetype, data } = file;
    const MAX_DIRECT_SIZE = 20 * 1024 * 1024; // 20MB
    const CHUNK_SIZE = 19 * 1024 * 1024; // 19MB
    if (size <= MAX_DIRECT_SIZE) {
      // Handle as normal upload (reuse /upload logic inline)
      // Generate slug
      const slug = crypto.randomBytes(6).toString('base64url');
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
      const uploader_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const insert = await query(
        `INSERT INTO files (name, size, mimetype, slug, uploader_ip, telegram_file_id, telegram_message_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, size, mimetype, slug, uploader_ip, tgInfo.file_id, tgInfo.message_id]
      );
      // Insert into user_files for My Drops if user_id is provided
      if (req.body.user_id) {
        let userEmail = req.body.user_email;
        if (!userEmail) {
          const { data: userRows } = await supabase.from('users').select('email').eq('id', req.body.user_id).limit(1);
          if (userRows && userRows.length > 0) userEmail = userRows[0].email;
        }
        if (userEmail) {
          await supabase.from('users').upsert([
            { id: req.body.user_id, email: userEmail }
          ], { onConflict: 'id' });
        }
        await supabase.from('user_files').insert([
          {
            user_id: req.body.user_id,
            name,
            slug,
            mimetype,
            size,
            notes: req.body.notes || null,
            type: 'file',
          }
        ]);
      }
      return res.status(201).json({
        fileId: insert.rows[0].id,
        slug,
        status: 'complete',
        is_chunked: false
      });
    } else {
      // Handle as chunked upload
      const totalChunks = Math.ceil(size / CHUNK_SIZE);
      const fileId = crypto.randomUUID();
      const slug = crypto.randomBytes(6).toString('base64url');
      const uploader_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      // Insert the file row BEFORE any chunks
      await query(
        `INSERT INTO files (id, name, size, mimetype, slug, uploader_ip, is_chunked, total_chunks, upload_state)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, 'uploading')
         ON CONFLICT (id) DO NOTHING`,
        [fileId, name, size, mimetype, slug, uploader_ip, totalChunks]
      );
      let allOk = true;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min((i + 1) * CHUNK_SIZE, size);
        const chunkBuffer = data.slice(start, end);
        const checksum = crypto.createHash('sha256').update(chunkBuffer).digest('hex');
        let tgInfo;
        try {
          tgInfo = await sendFileToChannel(chunkBuffer, `${name}.${i}`, mimetype);
        } catch (err) {
          console.error('Telegram upload failed for chunk', i, err);
          allOk = false;
          break;
        }
        if (!tgInfo || !tgInfo.file_id) {
          allOk = false;
          break;
        }
        await query(
          `INSERT INTO file_chunks (file_id, chunk_index, telegram_file_id, telegram_message_id, size, checksum)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (file_id, chunk_index) DO NOTHING`,
          [fileId, i, tgInfo.file_id, tgInfo.message_id, chunkBuffer.length, checksum]
        );
        if (i === totalChunks - 1) {
          await query(
            `UPDATE files SET upload_state = 'complete' WHERE id = $1`,
            [fileId]
          );
        }
      }
      if (allOk) {
        // Insert into user_files for My Drops if user_id is provided
        if (req.body.user_id) {
          let userEmail = req.body.user_email;
          if (!userEmail) {
            const { data: userRows } = await supabase.from('users').select('email').eq('id', req.body.user_id).limit(1);
            if (userRows && userRows.length > 0) userEmail = userRows[0].email;
          }
          if (userEmail) {
            await supabase.from('users').upsert([
              { id: req.body.user_id, email: userEmail }
            ], { onConflict: 'id' });
          }
          await supabase.from('user_files').insert([
            {
              user_id: req.body.user_id,
              name,
              slug,
              mimetype,
              size,
              notes: req.body.notes || null,
              type: 'file',
            }
          ]);
        }
        return res.status(201).json({
          fileId,
          slug,
          status: 'complete',
          is_chunked: true
        });
      } else {
        return res.status(500).json({ error: 'Failed to upload all chunks.' });
      }
    }
  } catch (err) {
    console.error('Upload-auto error:', err);
    res.status(500).json({ error: 'Upload-auto failed.' });
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
    // Always return metadata for chunked files or missing telegram_file_id
    if (file.is_chunked || !file.telegram_file_id) {
      return res.json({
        name: file.name,
        size: file.size,
        mimetype: file.mimetype,
        created_at: file.created_at,
        download_count: file.download_count,
        expiry_at: file.expiry_at,
        download_url: `/api/download/${slug}`,
      });
    }
    // Not chunked: verify Telegram file exists
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
    // If chunked, fetch and join chunks
    if (file.is_chunked) {
      const chunkRows = await query(
        'SELECT * FROM file_chunks WHERE file_id = $1 ORDER BY chunk_index ASC',
        [file.id]
      );
      if (chunkRows.rows.length !== file.total_chunks) {
        return res.status(500).json({ error: 'Incomplete file: missing chunks.' });
      }
      // Download all chunks from Telegram and verify checksum
      const buffers = [];
      for (const chunk of chunkRows.rows) {
        const tgFile = await getFileInfo(chunk.telegram_file_id);
        const downloadUrl = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
        const tgRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
        const buf = Buffer.from(tgRes.data);
        // Verify checksum
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        if (hash !== chunk.checksum) {
          return res.status(500).json({ error: `Checksum mismatch for chunk ${chunk.chunk_index}` });
        }
        buffers.push(buf);
      }
      const fullBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
      const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9_\-.]/g, '_');
      if (file.mimetype === 'application/pdf') {
        res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      }
      res.send(fullBuffer);
      return;
    }
    // Not chunked: original logic
    const tgFile = await getFileInfo(file.telegram_file_id);
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
    const tgRes = await axios.get(downloadUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9_\-.]/g, '_');
    if (file.mimetype === 'application/pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    }
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

    // Use AdmZip for robust ZIP parsing
    try {
      if (file.size > 20 * 1024 * 1024) {
        return res.status(400).json({ error: 'ZIP file too large for preview.' });
      }
      if (file.is_chunked) {
        return res.status(400).json({ error: 'Chunked ZIP files cannot be previewed.' });
      }
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries().map((entry: any) => entry.entryName);
      return res.json({ entries });
    } catch (err) {
      console.error('ZIP parse error:', err);
      return res.status(400).json({ error: 'Invalid ZIP file' });
    }
  } catch (err) {
    console.error('ZIP fetch or parse failed:', err);
    return res.status(500).json({ error: 'ZIP failed to open or fetch' });
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

// GET /public/:publicSlug
router.get('/public/:publicSlug', async (req, res) => {
  const { publicSlug } = req.params;
  // Lookup file by public_slug and enforce ≤ 20MB
  const result = await query(
    'SELECT * FROM files WHERE public_slug = $1 AND size <= $2',
    [publicSlug, 20 * 1024 * 1024]
  );
  if (!result.rows.length) {
    return res.status(404).send('Not found or too large');
  }
  const file = result.rows[0];
  // Stream right through your existing download logic (skip auth)
  const tgFile = await getFileInfo(file.telegram_file_id);
  const url = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
  res.redirect(url);
});

// POST /file/:slug/publicize
router.post('/file/:slug/publicize', async (req, res) => {
  const { slug } = req.params;
  // TODO: Add authMiddleware if needed
  // Make sure the current user owns this file (or is allowed)
  const result = await query('SELECT id FROM files WHERE slug=$1', [slug]);
  if (!result.rows.length) return res.sendStatus(404);
  // Generate a 6‑char public slug
  const publicSlug = crypto.randomBytes(4).toString('hex');
  await query(
    'UPDATE files SET public_slug=$1 WHERE slug=$2',
    [publicSlug, slug]
  );
  res.json({ publicSlug });
});

// GET /public-proxy/:publicSlug
router.get('/public-proxy/:publicSlug', async (req, res) => {
  const { publicSlug } = req.params;
  // Lookup file by public_slug and enforce ≤ 20MB
  const result = await query(
    'SELECT * FROM files WHERE public_slug = $1 AND size <= $2',
    [publicSlug, 20 * 1024 * 1024]
  );
  if (!result.rows.length) {
    return res.status(404).send('Not found or too large');
  }
  const file = result.rows[0];
  // Get Telegram file info
  const tgFile = await getFileInfo(file.telegram_file_id);
  const url = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
  try {
    const tgRes = await axios.get(url, { responseType: 'stream' });
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', file.mimetype || tgRes.headers['content-type'] || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${file.name}"`);
    tgRes.data.pipe(res);
  } catch (err) {
    console.error('Public proxy fetch error:', err);
    res.status(502).send('Failed to fetch file from Telegram');
  }
});

export default router; 