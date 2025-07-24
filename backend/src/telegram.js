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
exports.sendFileToChannel = sendFileToChannel;
exports.getFileInfo = getFileInfo;
exports.deleteFile = deleteFile;
var telegraf_1 = require("telegraf");
var axios_1 = require("axios");
var form_data_1 = require("form-data");
var BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
var CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
if (!BOT_TOKEN)
    throw new Error('TELEGRAM_BOT_TOKEN env variable is required');
if (!CHANNEL_ID)
    throw new Error('TELEGRAM_CHANNEL_ID env variable is required');
var API_URL = "https://api.telegram.org/bot".concat(BOT_TOKEN);
var bot = new telegraf_1.Telegraf(BOT_TOKEN);
function sendFileToChannel(fileBuffer, filename, mimetype) {
    return __awaiter(this, void 0, void 0, function () {
        var formData, endpoint, fileField, res, msg, fileObj;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    formData = new form_data_1.default();
                    formData.append('chat_id', CHANNEL_ID);
                    endpoint = 'sendDocument';
                    fileField = 'document';
                    if (mimetype && mimetype.startsWith('video/')) {
                        endpoint = 'sendVideo';
                        fileField = 'video';
                    }
                    else if (mimetype && mimetype.startsWith('audio/')) {
                        endpoint = 'sendAudio';
                        fileField = 'audio';
                    }
                    else if (mimetype && mimetype.startsWith('image/')) {
                        endpoint = 'sendPhoto';
                        fileField = 'photo';
                    }
                    formData.append(fileField, fileBuffer, { filename: filename, contentType: mimetype });
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/").concat(endpoint), formData, {
                            headers: formData.getHeaders(),
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                        })];
                case 1:
                    res = _a.sent();
                    console.log('TELEGRAM API RESPONSE:', res.data);
                    if (!res.data.ok) {
                        throw new Error('Telegram API error: ' + (res.data.description || 'Unknown error'));
                    }
                    msg = res.data.result;
                    fileObj = msg.document || msg.video || msg.audio;
                    if (!fileObj && msg.photo) {
                        fileObj = Array.isArray(msg.photo) ? msg.photo[msg.photo.length - 1] : msg.photo;
                    }
                    if (!fileObj) {
                        throw new Error('Telegram API: No file object found in response');
                    }
                    return [2 /*return*/, {
                            file_id: fileObj.file_id,
                            message_id: msg.message_id,
                            file_unique_id: fileObj.file_unique_id,
                        }];
            }
        });
    });
}
function getFileInfo(file_id) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.get("".concat(API_URL, "/getFile?file_id=").concat(file_id))];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, res.data.result];
            }
        });
    });
}
function deleteFile(message_id) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/deleteMessage"), {
                        chat_id: CHANNEL_ID,
                        message_id: message_id,
                    })];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, res.data.ok];
            }
        });
    });
}
