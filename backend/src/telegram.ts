import { Telegraf } from 'telegraf';
import axios from 'axios';
import { TelegramFileInfo } from './types.js';
import FormData from 'form-data';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN env variable is required');
if (!CHANNEL_ID) throw new Error('TELEGRAM_CHANNEL_ID env variable is required');
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const bot = new Telegraf(BOT_TOKEN);

export async function sendFileToChannel(fileBuffer: Buffer, filename: string, mimetype: string): Promise<TelegramFileInfo> {
  const formData = new FormData();
  formData.append('chat_id', CHANNEL_ID);
  let endpoint = 'sendDocument';
  let fileField = 'document';
  if (mimetype && mimetype.startsWith('video/')) {
    endpoint = 'sendVideo';
    fileField = 'video';
  } else if (mimetype && mimetype.startsWith('audio/')) {
    endpoint = 'sendAudio';
    fileField = 'audio';
  } else if (mimetype && mimetype.startsWith('image/')) {
    endpoint = 'sendPhoto';
    fileField = 'photo';
  }
  formData.append(fileField, fileBuffer, { filename, contentType: mimetype });

  const res = await axios.post(`${API_URL}/${endpoint}`, formData, {
    headers: formData.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  console.log('TELEGRAM API RESPONSE:', res.data);
  if (!res.data.ok) {
    throw new Error('Telegram API error: ' + (res.data.description || 'Unknown error'));
  }
  const msg = res.data.result;
  // Support all possible file response types
  let fileObj = msg.document || msg.video || msg.audio;
  if (!fileObj && msg.photo) {
    fileObj = Array.isArray(msg.photo) ? msg.photo[msg.photo.length - 1] : msg.photo;
  }
  if (!fileObj) {
    throw new Error('Telegram API: No file object found in response');
  }
  return {
    file_id: fileObj.file_id,
    message_id: msg.message_id,
    file_unique_id: fileObj.file_unique_id,
  };
}

export async function getFileInfo(file_id: string): Promise<{ file_path: string }> {
  const res = await axios.get(`${API_URL}/getFile?file_id=${file_id}`);
  return res.data.result;
}

export async function deleteFile(message_id: string): Promise<boolean> {
  const res = await axios.post(`${API_URL}/deleteMessage`, {
    chat_id: CHANNEL_ID,
    message_id,
  });
  return res.data.ok;
} 