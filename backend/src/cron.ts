import { query } from './db';
import { deleteFile } from './telegram';

async function cleanupExpiredFiles() {
  // Find expired files
  const { rows } = await query('SELECT id, telegram_message_id FROM files WHERE expiry_at IS NOT NULL AND expiry_at < NOW()');
  for (const file of rows) {
    try {
      await deleteFile(file.telegram_message_id);
      await query('DELETE FROM files WHERE id = $1', [file.id]);
      console.log(`Deleted expired file ${file.id}`);
    } catch (err) {
      console.error(`Failed to delete file ${file.id}:`, err);
    }
  }
}

cleanupExpiredFiles().then(() => process.exit(0)); 