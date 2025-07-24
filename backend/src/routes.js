"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var db_js_1 = require("./db.js");
var telegram_js_1 = require("./telegram.js");
var crypto_1 = require("crypto");
var axios_1 = require("axios");
var express_rate_limit_1 = require("express-rate-limit");
var path_1 = require("path");
var adm_zip_1 = require("adm-zip");
var fs_1 = require("fs");
var supabase_js_1 = require("./supabase.js");
var token = process.env.TELEGRAM_BOT_TOKEN;
if (!token)
    throw new Error('Missing TELEGRAM_BOT_TOKEN env var');
var router = (0, express_1.Router)();
var limiter = (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 30 });
router.use(limiter);
// Add helper at top
function isValidDate(d) { return !isNaN(new Date(d).getTime()); }
// POST /upload
router.post('/upload', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var file, name_1, size, mimetype, data, slug, tgInfo, err_1, uploader_ip, user_agent, expiry_at, insert, fileMeta, userEmail, userRows, isNote, _a, data_1, error, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 12, , 13]);
                console.log('UPLOAD DEBUG req.body:', req.body);
                console.log('UPLOAD DEBUG req.files:', req.files);
                if (!req.files || !req.files.file) {
                    return [2 /*return*/, res.status(400).json({ error: 'No file uploaded.' })];
                }
                file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
                name_1 = file.name, size = file.size, mimetype = file.mimetype, data = file.data;
                if (size > 2 * 1024 * 1024 * 1024) {
                    return [2 /*return*/, res.status(413).json({ error: 'File too large (max 2GB).' })];
                }
                slug = crypto_1.default.randomBytes(6).toString('base64url');
                tgInfo = void 0;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, telegram_js_1.sendFileToChannel)(data, name_1, mimetype)];
            case 2:
                tgInfo = _b.sent();
                return [3 /*break*/, 4];
            case 3:
                err_1 = _b.sent();
                console.error('Telegram upload failed:', err_1);
                return [2 /*return*/, res.status(500).json({ error: 'Failed to upload to Telegram.' })];
            case 4:
                if (!tgInfo || !tgInfo.file_id) {
                    return [2 /*return*/, res.status(500).json({ error: 'Telegram upload did not return a file_id.' })];
                }
                uploader_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
                user_agent = req.headers['user-agent'] || '';
                expiry_at = null;
                if (req.body.expiry_at && isValidDate(req.body.expiry_at)) {
                    expiry_at = new Date(req.body.expiry_at).toISOString();
                }
                else if (req.body.expiry_days && !isNaN(Number(req.body.expiry_days))) {
                    expiry_at = new Date(Date.now() + Number(req.body.expiry_days) * 86400000).toISOString();
                }
                return [4 /*yield*/, (0, db_js_1.query)("INSERT INTO files (name, size, mimetype, slug, uploader_ip, telegram_file_id, telegram_message_id, download_count, expiry_at)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8) RETURNING *", [name_1, size, mimetype, slug, uploader_ip, tgInfo.file_id, tgInfo.message_id, expiry_at])];
            case 5:
                insert = _b.sent();
                fileMeta = insert.rows[0];
                if (!req.body.user_id) return [3 /*break*/, 11];
                userEmail = req.body.user_email;
                if (!!userEmail) return [3 /*break*/, 7];
                return [4 /*yield*/, supabase_js_1.supabase.from('users').select('email').eq('id', req.body.user_id).limit(1)];
            case 6:
                userRows = (_b.sent()).data;
                if (userRows && userRows.length > 0) {
                    userEmail = userRows[0].email;
                }
                else {
                    console.warn('UPLOAD: user_email missing and not found in users table for user_id', req.body.user_id);
                }
                _b.label = 7;
            case 7:
                if (!userEmail) return [3 /*break*/, 9];
                return [4 /*yield*/, supabase_js_1.supabase.from('users').upsert([
                        { id: req.body.user_id, email: userEmail }
                    ], { onConflict: 'id' })];
            case 8:
                _b.sent();
                _b.label = 9;
            case 9:
                isNote = req.body.is_note === 'true';
                return [4 /*yield*/, supabase_js_1.supabase.from('user_files').insert([
                        {
                            user_id: req.body.user_id,
                            name: name_1,
                            slug: slug,
                            mimetype: mimetype,
                            size: size,
                            notes: req.body.notes || null,
                            type: isNote ? 'note' : 'file',
                        }
                    ])];
            case 10:
                _a = _b.sent(), data_1 = _a.data, error = _a.error;
                console.log('SUPABASE INSERT user_files data:', data_1, 'error:', error);
                _b.label = 11;
            case 11:
                res.status(201).json({
                    slug: slug,
                    file: {
                        name: fileMeta.name,
                        size: fileMeta.size,
                        mimetype: fileMeta.mimetype,
                        created_at: fileMeta.created_at,
                        download_count: fileMeta.download_count,
                        expiry_at: fileMeta.expiry_at,
                    },
                });
                return [3 /*break*/, 13];
            case 12:
                err_2 = _b.sent();
                console.error('Upload error:', err_2);
                res.status(500).json({ error: 'Upload failed.' });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
// GET /file/:slug
router.get('/file/:slug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, result, file, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                slug = req.params.slug;
                return [4 /*yield*/, (0, db_js_1.query)('SELECT * FROM files WHERE slug = $1', [slug])];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'File not found.' })];
                }
                file = result.rows[0];
                // Get Telegram file path (do not construct or log the CDN URL)
                return [4 /*yield*/, (0, telegram_js_1.getFileInfo)(file.telegram_file_id)];
            case 2:
                // Get Telegram file path (do not construct or log the CDN URL)
                _a.sent(); // Only to verify existence
                res.json({
                    name: file.name,
                    size: file.size,
                    mimetype: file.mimetype,
                    created_at: file.created_at,
                    download_count: file.download_count,
                    expiry_at: file.expiry_at,
                    download_url: "/api/download/".concat(slug),
                });
                return [3 /*break*/, 4];
            case 3:
                err_3 = _a.sent();
                console.error('File info error:', err_3);
                res.status(500).json({ error: 'Failed to fetch file info.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /download/:slug
router.get('/download/:slug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, result, file, tgFile, downloadUrl, tgRes, safeName, err_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                slug = req.params.slug;
                return [4 /*yield*/, (0, db_js_1.query)('SELECT * FROM files WHERE slug = $1', [slug])];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'File not found.' })];
                }
                file = result.rows[0];
                // Check expiry
                if (file.expiry_at && new Date(file.expiry_at) < new Date()) {
                    return [2 /*return*/, res.status(410).json({ error: 'File expired.' })];
                }
                // Optionally: check max downloads (if you want to enforce a limit)
                if (req.query.max_downloads && file.download_count >= Number(req.query.max_downloads)) {
                    return [2 /*return*/, res.status(410).json({ error: 'Max downloads reached.' })];
                }
                // Increment download count
                return [4 /*yield*/, (0, db_js_1.query)('UPDATE files SET download_count = download_count + 1 WHERE id = $1', [file.id])];
            case 2:
                // Increment download count
                _a.sent();
                return [4 /*yield*/, (0, telegram_js_1.getFileInfo)(file.telegram_file_id)];
            case 3:
                tgFile = _a.sent();
                downloadUrl = "https://api.telegram.org/file/bot".concat(token, "/").concat(tgFile.file_path);
                return [4 /*yield*/, axios_1.default.get(downloadUrl, { responseType: 'stream' })];
            case 4:
                tgRes = _a.sent();
                // Set headers for download/streaming
                res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
                safeName = path_1.default.basename(file.name).replace(/[^a-zA-Z0-9_\-.]/g, '_');
                if (file.mimetype === 'application/pdf') {
                    res.setHeader('Content-Disposition', "inline; filename=\"".concat(safeName, "\""));
                }
                else {
                    res.setHeader('Content-Disposition', "attachment; filename=\"".concat(safeName, "\""));
                }
                // Pipe the Telegram file stream to the response
                tgRes.data.pipe(res);
                return [3 /*break*/, 6];
            case 5:
                err_4 = _a.sent();
                console.error('Download error:', err_4);
                res.status(500).json({ error: 'Failed to download file.' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST /flag
router.post('/flag', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, file_id, slug, reason, fid, result, ip, err_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, file_id = _a.file_id, slug = _a.slug, reason = _a.reason;
                if (!reason || (!file_id && !slug)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Missing file_id/slug or reason.' })];
                }
                fid = file_id;
                if (!(!fid && slug)) return [3 /*break*/, 2];
                return [4 /*yield*/, (0, db_js_1.query)('SELECT id FROM files WHERE slug = $1', [slug])];
            case 1:
                result = _b.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'File not found.' })];
                }
                fid = result.rows[0].id;
                _b.label = 2;
            case 2:
                ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
                return [4 /*yield*/, (0, db_js_1.query)('INSERT INTO abuse_flags (file_id, reason, ip) VALUES ($1, $2, $3)', [fid, reason, ip])];
            case 3:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                err_5 = _b.sent();
                console.error('Flag error:', err_5);
                res.status(500).json({ error: 'Failed to flag file.' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Proxy endpoint for note content
router.get('/note-content/:slug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, result, file, tgFile, downloadUrl, tgRes, err_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                slug = req.params.slug;
                return [4 /*yield*/, (0, db_js_1.query)('SELECT * FROM files WHERE slug = $1', [slug])];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'File not found.' })];
                }
                file = result.rows[0];
                return [4 /*yield*/, (0, telegram_js_1.getFileInfo)(file.telegram_file_id)];
            case 2:
                tgFile = _a.sent();
                downloadUrl = "https://api.telegram.org/file/bot".concat(token, "/").concat(tgFile.file_path);
                return [4 /*yield*/, axios_1.default.get(downloadUrl, { responseType: 'text' })];
            case 3:
                tgRes = _a.sent();
                res.set('Content-Type', 'text/plain');
                res.set('Access-Control-Allow-Origin', '*');
                res.send(tgRes.data);
                return [3 /*break*/, 5];
            case 4:
                err_6 = _a.sent();
                console.error('Note content proxy error:', err_6);
                res.status(500).json({ error: 'Failed to fetch note content.' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// GET /zip-list/:slug
router.get('/zip-list/:slug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, result, file, tgFile, downloadUrl, tgRes, buffer, debugPath, zip, files, err_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                slug = req.params.slug;
                console.log('ZIP list endpoint hit for slug:', slug);
                return [4 /*yield*/, (0, db_js_1.query)('SELECT * FROM files WHERE slug = $1', [slug])];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    console.log('ZIP list: file not found');
                    return [2 /*return*/, res.status(404).json({ error: 'File not found.' })];
                }
                file = result.rows[0];
                if (file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
                    console.log('ZIP list: not a zip file');
                    return [2 /*return*/, res.status(400).json({ error: 'Not a ZIP file.' })];
                }
                return [4 /*yield*/, (0, telegram_js_1.getFileInfo)(file.telegram_file_id)];
            case 2:
                tgFile = _a.sent();
                downloadUrl = "https://api.telegram.org/file/bot".concat(token, "/").concat(tgFile.file_path);
                return [4 /*yield*/, axios_1.default.get(downloadUrl, { responseType: 'arraybuffer' })];
            case 3:
                tgRes = _a.sent();
                buffer = Buffer.from(tgRes.data);
                debugPath = "debug-".concat(slug, ".zip");
                fs_1.default.writeFileSync(debugPath, buffer);
                console.log("Saved Telegram ZIP buffer to ".concat(debugPath, " (").concat(buffer.length, " bytes)"));
                zip = new adm_zip_1.default(buffer);
                files = zip.getEntries().map(function (e) { return e.entryName; });
                console.log('ZIP list: extracted files', files);
                res.json({ files: files });
                return [3 /*break*/, 5];
            case 4:
                err_7 = _a.sent();
                console.error('ZIP list error:', err_7);
                res.status(500).json({ error: 'Failed to extract ZIP file list.' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// GET /mydrops
router.get('/mydrops', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user_id, _a, data, error, err_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                user_id = req.query.user_id;
                if (!user_id)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing user_id' })];
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('user_files')
                        .select('*')
                        .eq('user_id', user_id)
                        .order('created_at', { ascending: false })];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                res.json({ files: data });
                return [3 /*break*/, 3];
            case 2:
                err_8 = _b.sent();
                console.error('mydrops fetch error:', err_8);
                res.status(500).json({ error: 'Failed to fetch user files.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE /mydrops/:slug
router.delete('/mydrops/:slug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, user_id, error, err_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                slug = req.params.slug;
                user_id = req.query.user_id;
                if (!user_id)
                    return [2 /*return*/, res.status(400).json({ error: 'Missing user_id' })];
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('user_files')
                        .delete()
                        .eq('slug', slug)
                        .eq('user_id', user_id)];
            case 1:
                error = (_a.sent()).error;
                if (error)
                    throw error;
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                err_9 = _a.sent();
                console.error('mydrops delete error:', err_9);
                res.status(500).json({ error: 'Failed to delete user file.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
