import { useState, useCallback, useRef } from 'react';
import { FileItem } from '../types';
import { BASE_URL } from '../lib/api';

export function useUserFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);

  // track the last userId we fetched, and in‑flight state
  const lastUserRef = useRef<string|undefined>(undefined);
  const loadingRef  = useRef(false);

  const fetchUserFiles = useCallback(async (userId: string) => {
    // Always fetch, do not skip for same userId
    lastUserRef.current = userId;

    // 2) if already fetching, skip
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const res = await fetch(`${BASE_URL}/mydrops?user_id=${userId}`);
      if (res.status === 429) {
        // 3) optional: back‑off + retry
        const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10) * 1000;
        setTimeout(() => fetchUserFiles(userId), retryAfter);
        return;
      }
      if (!res.ok) throw new Error(`Fetch error ${res.status}`);
      const data = await res.json();
      setFiles(data.files || []);
      return data.files || [];
    } catch (e) {
      console.error('Failed to fetch user files', e);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  return { files, fetchUserFiles };
}