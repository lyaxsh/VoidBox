import { useState } from 'react';
import { FileItem } from '../types';

export function useUserFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);

  const setUserFiles = (newFiles: FileItem[]) => {
    setFiles(newFiles);
  };

  const fetchUserFiles = async (user_id: string) => {
    const res = await fetch(`/api/mydrops?user_id=${user_id}`);
    if (!res.ok) throw new Error('Failed to fetch user files');
    const data = await res.json();
    setFiles(data.files || []);
    return data.files || [];
  };

  return { files, setUserFiles, fetchUserFiles };
}