"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var express_1 = require("express");
var express_fileupload_1 = require("express-fileupload");
var cors_1 = require("cors");
var express_rate_limit_1 = require("express-rate-limit");
var body_parser_1 = require("body-parser");
var json = body_parser_1.default.json;
var routes_js_1 = require("./routes.js");
var app = (0, express_1.default)();
var PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(json());
app.use((0, express_fileupload_1.default)({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } })); // 2GB max
// Rate limiting middleware
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
}));
app.use('/api', routes_js_1.default);
app.get('/', function (req, res) {
    res.send('VoidBox backend is running.');
});
app.listen(PORT, function () {
    console.log("VoidBox backend listening on port ".concat(PORT));
});
