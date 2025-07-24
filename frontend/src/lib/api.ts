export const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000/api';

export interface UploadResponse {
  slug: string;
  file: {
    name: string;
    size: number;
    mimetype: string;
    created_at: string;
    download_count: number;
    expiry_at: string | null;
  };
}

export async function uploadFile(
  file: File,
  options: any = {},
  onProgress?: (percent: number) => void
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.expiry_at) formData.append('expiry_at', options.expiry_at);
  if (options.expiry_days) formData.append('expiry_days', options.expiry_days);
  if (options.user_id) formData.append('user_id', options.user_id);
  if (options.user_email) formData.append('user_email', options.user_email);
  if (options.notes) formData.append('notes', options.notes);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/upload-auto`);
    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = function () {
      if (xhr.status === 201 || xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({
            slug: res.slug,
            file: { name: file.name },
            ...res,
          });
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(xhr.responseText));
      }
    };
    xhr.onerror = function () {
      reject(new Error('Upload failed'));
    };
    xhr.send(formData);
  });
}

export async function getFileInfo(slug: string) {
  const res = await fetch(`${BASE_URL}/file/${slug}`);
  if (!res.ok) throw new Error('File not found');
  return res.json();
}

export function getDownloadUrl(slug: string) {
  return `${BASE_URL}/download/${slug}`;
}

export async function flagFile({ slug, file_id, reason }: { slug?: string; file_id?: string; reason: string }) {
  const res = await fetch(`${BASE_URL}/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, file_id, reason }),
  });
  if (!res.ok) throw new Error('Flag failed');
  return res.json();
}

export async function uploadNote(title: string, content: string, options?: { expiry_at?: string; expiry_days?: number; user_id?: string; user_email?: string }) {
  const formData = new FormData();
  // Format note: bold title if present, then content
  let noteText = '';
  let filename = 'note.txt';
  if (title) {
    noteText = `${title.toUpperCase()}\n${'='.repeat(Math.max(4, title.length))}\n\n${content}`;
    filename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)}.txt`;
  } else {
    noteText = content;
  }
  const blob = new Blob([noteText], { type: 'text/plain' });
  formData.append('file', blob, filename);
  if (options?.expiry_at) formData.append('expiry_at', options.expiry_at);
  if (options?.expiry_days) formData.append('expiry_days', String(options.expiry_days));
  if (options?.user_id) formData.append('user_id', options.user_id);
  formData.append('is_note', 'true');
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Note upload failed');
  return res.json() as Promise<UploadResponse>;
} 