"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.query = void 0;
var pg_1 = require("pg");
var pool = new pg_1.Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
exports.pool = pool;
var query = function (text, params) { return pool.query(text, params); };
exports.query = query;
