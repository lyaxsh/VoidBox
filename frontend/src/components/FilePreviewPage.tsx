import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Download, ArrowDown } from 'lucide-react';
import { PageType } from '../types';
import { getFileInfo, getDownloadUrl, BASE_URL } from '../lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface FilePreviewPageProps {
  slug: string;
  onPageChange: (page: PageType) => void;
  theme: 'dark' | 'light';
  isPublic?: boolean;
}

const zipListCache: Record<string, string[]> = {};
const noteContentCache: Record<string, string> = {};

function getPublicProxyUrl(slug: string) {
  return `${BASE_URL}/public-proxy/${slug}`;
}

function isLargePreviewableType(fileInfo: any) {
  const type = fileInfo?.mimetype || '';
  return (
    type === 'application/zip' ||
    type === 'application/x-zip-compressed' ||
    type === 'application/pdf' ||
    type.startsWith('image/png') ||
    type.startsWith('video/mp4') ||
    type.startsWith('audio/mp3')
  );
}

const FilePreviewPage: React.FC<FilePreviewPageProps> = ({ slug, onPageChange, theme, isPublic }) => {
  const [copied, setCopied] = useState(false);
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [zipList, setZipList] = useState<string[] | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState<string|null>(null);
  const [isMakingPublic, setIsMakingPublic] = useState(false);
  const [copiedType, setCopiedType] = useState<'private' | 'public' | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  const {
    data: fileInfoRaw,
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: [isPublic ? 'publicFileInfo' : 'fileInfo', slug],
    queryFn: () => isPublic
      ? fetch(`${BASE_URL}/public/${slug}`).then(res => res.json())
      : getFileInfo(slug),
    enabled: Boolean(slug),
  });
  const fileInfo = fileInfoRaw as any;

  useEffect(() => {
    setNoteContent(null);
    setZipList(null);
    setZipError(null);
    setCopied(false);
    setNoteLoading(false);
    setZipLoading(false);
  }, [slug]);

  useEffect(() => {
    if (fileInfo?.mimetype === 'text/plain' && fileInfo.download_url) {
      setNoteLoading(true);
      if (noteContentCache[slug]) {
        setNoteContent(noteContentCache[slug]);
        setNoteLoading(false);
        return;
      }
      fetch(`${BASE_URL}/note-content/${slug}`)
        .then(res => res.text())
        .then(text => {
          noteContentCache[slug] = text;
          setNoteContent(text);
        })
        .finally(() => setNoteLoading(false));
    } else {
      setNoteContent(null);
    }
  }, [fileInfo, slug]);

  function isZipMimetype(mimetype: string | undefined) {
    return mimetype === 'application/zip' || mimetype === 'application/x-zip-compressed';
  }

  useEffect(() => {
    if (!isZipMimetype(fileInfo?.mimetype)) {
      setZipList(null);
      setZipError(null);
      setZipLoading(false);
      return;
    }
    if (zipListCache[slug]) {
      setZipList(zipListCache[slug]);
      setZipLoading(false);
      return;
    }
    if (isZipMimetype(fileInfo?.mimetype) && fileInfo?.download_url && !fileInfo?.is_chunked && Number(fileInfo?.size) <= 20 * 1024 * 1024) {
      setZipLoading(true);
      setZipError(null);
      fetch(`${BASE_URL}/zip-list/${slug}`)
        .then(res => res.json())
        .then(data => {
          const list = data.entries ?? data.files ?? [];
          zipListCache[slug] = list;
          setZipList(list);
        })
        .catch(() => setZipError('Could not fetch ZIP contents.'))
        .finally(() => setZipLoading(false));
    } else {
      setZipList(null);
      setZipError(null);
      setZipLoading(false);
    }
  }, [fileInfo, slug]);

  useEffect(() => {
    if (fileInfo?.public_slug) {
      setPublicSlug(fileInfo.public_slug);
    } else {
      setPublicSlug(null);
    }
  }, [fileInfo]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    }
    if (showCopyMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCopyMenu]);

  const makePublic = async () => {
    setIsMakingPublic(true);
    try {
      const resp = await fetch(`${BASE_URL}/file/${slug}/publicize`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await resp.json();
      setPublicSlug(data.publicSlug);
    } finally {
      setIsMakingPublic(false);
    }
  };

  const privateLink = `${window.location.origin}/file/${slug}`;
  const publicLink = publicSlug ? `${window.location.origin}/api/public-proxy/${publicSlug}` : '';

  const handleCopy = async (type: 'private' | 'public') => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    if (type === 'private') {
      navigator.clipboard.writeText(privateLink);
      setCopiedType(type);
    } else if (type === 'public') {
      if (!publicSlug) {
        setIsMakingPublic(true);
        try {
          const resp = await fetch(`${BASE_URL}/file/${slug}/publicize`, {
            method: 'POST',
            credentials: 'include',
          });
          const data = await resp.json();
          setPublicSlug(data.publicSlug);
          const link = `${window.location.origin}/api/public-proxy/${data.publicSlug}`;
          navigator.clipboard.writeText(link);
          setCopiedType(type);
        } finally {
          setIsMakingPublic(false);
        }
      } else {
        navigator.clipboard.writeText(publicLink);
        setCopiedType(type);
      }
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedType(null);
      setShowCopyMenu(false);
    }, 1200);
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const copyLink = () => {
    const link = `${window.location.origin}/file/${slug}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleDownload = () => {
    if (!fileInfo) return;
    window.open(isPublic ? getPublicProxyUrl(slug) : getDownloadUrl(slug), '_blank');
  };

  // Preview rendering
  let preview: React.ReactNode = null;
  const isOver20MB = Number(fileInfo?.size) > 20 * 1024 * 1024;
  const isPreviewableType = isLargePreviewableType(fileInfo);
  if (isOver20MB && isPreviewableType) {
    preview = (
      <div className="flex flex-col items-center justify-center mb-4 mt-12">
        <span className="italic text-gray-400">Preview is not available for files over 20MB.</span>
        <span className="italic text-red-500 mt-2">Public link won’t work for this file.</span>
      </div>
    );
  } else if (fileInfo?.is_chunked || !fileInfo?.mimetype || (!fileInfo?.mimetype.startsWith('image/') && !fileInfo?.mimetype.startsWith('video/') && !fileInfo?.mimetype.startsWith('audio/') && fileInfo?.mimetype !== 'application/pdf' && fileInfo?.mimetype !== 'text/plain' && !isZipMimetype(fileInfo?.mimetype))) {
    preview = (
      <div className="flex flex-col items-center justify-center mb-4 mt-12">
        <span className="italic text-gray-400">No preview available for this file type.</span>
        {isOver20MB && (
          <span className="italic text-red-500 mt-2">Public link won’t work for this file.</span>
        )}
      </div>
    );
  } else if (fileInfo?.mimetype?.startsWith('image/')) {
    preview = <img src={isPublic ? getPublicProxyUrl(slug) : getDownloadUrl(slug)} alt={fileInfo.name} className={`mx-auto max-h-96 rounded-xl mb-6${theme === 'dark' ? ' bg-white' : ''}`} style={theme === 'dark' ? { backgroundColor: 'white' } : {}} />;
  } else if (fileInfo?.mimetype?.startsWith('video/')) {
    preview = <video src={isPublic ? getPublicProxyUrl(slug) : getDownloadUrl(slug)} controls className={`mx-auto max-h-96 rounded-xl mb-6${theme === 'dark' ? ' bg-white' : ''}`} style={theme === 'dark' ? { backgroundColor: 'white' } : {}} />;
  } else if (fileInfo?.mimetype?.startsWith('audio/')) {
    preview = (
      <audio controls className={`mx-auto w-full max-w-2xl mb-6${theme === 'dark' ? ' bg-white text-black' : ''}`} style={theme === 'dark' ? { backgroundColor: 'white', color: 'black' } : {}}>
        <source src={isPublic ? getPublicProxyUrl(slug) : getDownloadUrl(slug)} type={fileInfo.mimetype} />
        Your browser does not support the audio element.
      </audio>
    );
  } else if (fileInfo?.mimetype === 'application/pdf') {
    preview = (
      <iframe
        src={isPublic ? getPublicProxyUrl(slug) : getDownloadUrl(slug)}
        className={`mx-auto w-full h-96 rounded-xl mb-6${theme === 'dark' ? ' bg-white text-black' : ' bg-white'}`}
        title="PDF Preview"
        style={theme === 'dark' ? { border: 'none', backgroundColor: 'white', color: 'black' } : { border: 'none' }}
        allow="autoplay"
      >
        <p>Your browser does not support PDF preview. <a href={isPublic ? getPublicProxyUrl(slug) : getDownloadUrl(slug)} target="_blank" rel="noopener noreferrer">Download PDF</a></p>
      </iframe>
    );
  } else if (isZipMimetype(fileInfo?.mimetype)) {
    if (fileInfo?.is_chunked || Number(fileInfo?.size) > 20 * 1024 * 1024) {
      preview = (
        <div className="flex items-center justify-center mb-4 mt-12">
          <span className="italic text-gray-400">No preview available for zip files.</span>
        </div>
      );
    } else if (zipLoading) {
      preview = (
        <div className="flex items-center justify-center mb-4 mt-12">
          <span className="italic text-gray-400">Loading ZIP contents...</span>
        </div>
      );
    } else if (zipError) {
      preview = (
        <div className="flex items-center justify-center mb-4 mt-12">
          <span className="italic text-red-400">{zipError}</span>
        </div>
      );
    } else if (Array.isArray(zipList)) {
      preview = (
        <div
          className={`mx-auto w-full max-w-2xl p-6 rounded-2xl text-left select-text ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}
          style={{ userSelect: 'text', fontFamily: 'inherit' }}
        >
          <div className="font-bold mb-2">ZIP Contents:</div>
          <pre className="whitespace-pre-wrap break-all m-0 p-0 bg-transparent border-none" style={{ fontFamily: 'inherit' }}>
            {zipList.length > 0
              ? zipList.map((f, i) => `• ${f}${i < zipList.length - 1 ? '\n' : ''}`).join('')
              : 'No files found in ZIP.'}
          </pre>
        </div>
      );
    }
  } else if (fileInfo?.mimetype === 'text/plain') {
    preview = noteLoading ? (
      <div className="mx-auto text-center text-gray-400 mb-6">Loading note...</div>
    ) : (
      (() => {
        if (!noteContent) return null;
        const lines = noteContent.split('\n');
        const title = lines[0];
        const underline = lines[1] && /^[=\-]+$/.test(lines[1]) ? lines[1] : null;
        const rest = underline ? lines.slice(2).join('\n') : lines.slice(1).join('\n');
        return (
          <pre
            className={`mx-auto w-full max-w-2xl rounded-xl mb-6 p-6 overflow-x-auto whitespace-pre-wrap text-left text-base${theme === 'dark' ? ' bg-white text-black' : ' bg-black text-white border border-gray-200'}`}
            style={theme === 'dark' ? { fontFamily: 'Inter, sans-serif', backgroundColor: 'white', color: 'black', border: 'none' } : { fontFamily: 'Inter, sans-serif' }}
          >
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">{title}</div>
              {underline && <div className="text-center mb-3">{underline}</div>}
            </div>
            {rest}
          </pre>
        );
      })()
    );
  } else {
    preview = (
      <div className="flex items-center justify-center mb-4 mt-12">
        <span className="italic text-gray-400">No preview available for this file type.</span>
        </div>
    );
  }
  if (!preview) {
    preview = (
      <div className="mx-auto text-center text-gray-400 mb-6">
        Unable to generate preview. Try downloading the file.
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500 bg-white dark:bg-black">Loading...</div>;
  if (isError) return <div className="p-8 text-center text-red-500 bg-white dark:bg-black">{queryError instanceof Error ? queryError.message : 'Error loading file info.'}</div>;
  if (!fileInfo || typeof fileInfo !== 'object') {
    return (
      <div className="p-8 text-center text-red-500 bg-white dark:bg-black">
        Unable to load file information. Please try again later or return to the library.
      </div>
    );
  }

  function formatFileSize(size: number | string | undefined) {
    const n = typeof size === 'string' ? parseFloat(size) : size;
    if (typeof n !== 'number' || isNaN(n) || n < 0) return '';
    if (n === 0) return '0 bytes';
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
    return `${n} bytes`;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="p-6 md:p-12 bg-white dark:bg-black"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <motion.button
            onClick={() => onPageChange('library')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} />
            <span>Back to Library</span>
          </motion.button>

          <div className="flex space-x-3 relative">
            <div className="relative" ref={copyMenuRef}>
              <motion.button
                className={`flex items-center justify-center bg-black text-white px-7 py-4 rounded-xl hover:bg-gray-900 transition-colors focus:outline-none relative text-lg font-medium w-full`}
                style={{ minWidth: 180, height: 60 }}
                onClick={() => setShowCopyMenu((v) => !v)}
                aria-haspopup="true"
                aria-expanded={showCopyMenu}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="flex items-center justify-center w-full">Copy Link<ArrowDown size={22} className="ml-2 -mr-1" /></span>
              </motion.button>
              {showCopyMenu && (
                <div className="absolute left-0 top-full mt-2 flex flex-col z-20 w-52 bg-black rounded-xl shadow-lg border border-gray-800">
                  <motion.button
                    onClick={() => handleCopy('private')}
                    className={`flex items-center justify-between px-6 py-4 text-left rounded-t-xl hover:bg-gray-900 transition-colors focus:outline-none w-full text-lg font-medium text-white ${copiedType === 'private' ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ minHeight: 56 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>Private Link</span>
                    <Copy size={20} className="ml-3" />
                  </motion.button>
                  <motion.button
                    onClick={() => handleCopy('public')}
                    disabled={isMakingPublic}
                    className={`flex items-center justify-between px-6 py-4 text-left rounded-b-xl hover:bg-gray-900 transition-colors focus:outline-none w-full text-lg font-medium text-white ${isMakingPublic ? 'opacity-50 cursor-wait' : ''} ${copiedType === 'public' ? 'ring-2 ring-green-500' : ''}`}
                    style={{ minHeight: 56 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{isMakingPublic ? 'Making Public…' : 'Public Link'}</span>
                    <Copy size={20} className="ml-3" />
                  </motion.button>
                </div>
              )}
            </div>
            <motion.button 
              onClick={handleDownload}
              className="flex items-center justify-between bg-white text-black px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors text-lg font-medium"
              style={{ minWidth: 180, height: 56 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Download</span>
              <Download size={22} className="ml-3" />
            </motion.button>
          </div>
        </motion.div>

        {/* File Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-light text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {fileInfo?.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Uploaded on {fileInfo?.created_at ? formatDate(fileInfo.created_at) : ''}
          </p>
          {fileInfo?.notes && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-700 dark:text-gray-300 mt-2"
            >
              {fileInfo.notes}
            </motion.p>
          )}
        </motion.div>

        {/* Preview */}
        {preview}

        {/* Content */}
        <div className={`rounded-2xl p-8 text-center ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}> 
          <div className={`${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Size: {formatFileSize(fileInfo?.size)}</div>
          <div className={`${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>MIME: {fileInfo?.mimetype}</div>
          <div className={`${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>
            Expiry: {fileInfo?.expiry_at ? formatDate(fileInfo.expiry_at) : <span title="Never expires">&#8734;</span>}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default FilePreviewPage;