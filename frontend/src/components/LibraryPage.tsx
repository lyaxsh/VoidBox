import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, FileText, Trash2, Eye, FolderOpen, RotateCcw } from 'lucide-react';
import { FileItem, PageType } from '../types';
import { BASE_URL } from '../lib/api';

interface LibraryPageProps {
  files: FileItem[];
  onPageChange: (page: PageType) => void;
  onFileSelect: (file: FileItem) => void;
  onFileDelete: (id: string) => void;
  theme: 'dark' | 'light';
  user?: any;
  triggerLoginModal?: () => void;
  fetchUserFiles: (userId: string) => Promise<void>;
}

const LibraryPage: React.FC<LibraryPageProps> = (props) => {
  console.log('LibraryPage rendered');
  const [filter, setFilter] = useState<'all' | 'files' | 'notes'>('all');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; file?: FileItem }>({ open: false });

  const filteredFiles = props.files.filter(file => {
    if (filter === 'files') return file.type === 'file';
    if (filter === 'notes') return file.type === 'note';
    return true;
  });

  const handleFileView = (file: FileItem) => {
    props.onFileSelect(file);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleDelete = async (file: FileItem) => {
    setConfirmDelete({ open: true, file });
  };
  const confirmDeleteFile = async () => {
    if (!props.user?.id || !confirmDelete.file) return;
    await fetch(`${BASE_URL}/mydrops/${confirmDelete.file.slug}?user_id=${props.user.id}`, { method: 'DELETE' });
    if (typeof props.fetchUserFiles === 'function') await props.fetchUserFiles(props.user.id);
    if (typeof props.onPageChange === 'function') props.onPageChange('library');
    setConfirmDelete({ open: false });
  };
  const cancelDelete = () => setConfirmDelete({ open: false });

  // Keyboard shortcut for refresh
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.altKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        if (props.user?.id) props.fetchUserFiles(props.user.id);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props.user, props.fetchUserFiles]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen p-6 md:p-12 bg-white dark:bg-black"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between mb-12"
        >
          <div>
            <h1 className="text-4xl font-light text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              My Drops
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {filteredFiles.length} items stored
            </p>
          </div>

          {/* Filter Tabs + Refresh Button */}
          <div className="flex items-center gap-4 mt-6 md:mt-0">
            {/* Refresh Button */}
            <div className="relative group">
              <motion.button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.97 }}
                aria-label="Refresh"
              >
                <RotateCcw size={22} />
              </motion.button>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 px-3 py-1 rounded-lg bg-white text-black text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-200">
                Re-sync
              </div>
            </div>
            {/* Filter Tabs */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1"
            >
              {[
                { id: 'all', label: 'All' },
                { id: 'files', label: 'Files' },
                { id: 'notes', label: 'Notes' }
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === tab.id 
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {tab.label}
                </motion.button>
              ))}
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {filteredFiles.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6"
              >
                <FolderOpen className="text-gray-400 dark:text-gray-600" size={32} />
              </motion.div>
              <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-900 dark:text-white mb-2"
              >
                Nothing here yet.
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 dark:text-gray-400 mb-8"
              >
                {filter === 'notes'
                  ? 'Create notes to get started.'
                  : filter === 'files'
                  ? 'Upload files to get started.'
                  : 'Upload files or create notes to get started.'}
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                {(filter === 'all' || filter === 'files') && (
                  <motion.button
                    onClick={() => props.onPageChange('upload')}
                    className="bg-gray-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-semibold transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Upload Files
                  </motion.button>
                )}
                {(filter === 'all' || filter === 'notes') && (
                  <motion.button
                    onClick={() => props.onPageChange('text')}
                    className={
                      filter === 'notes'
                        ? 'bg-white text-black px-6 py-3 rounded-xl font-semibold transition-colors dark:bg-white dark:text-black'
                        : 'border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors'
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Create Note
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleFileView(file)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <motion.div 
                      className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 5 }}
                    >
                      {file.type === 'note' ? (
                        <FileText className="text-gray-600 dark:text-gray-400" size={20} />
                      ) : (
                        <File className="text-gray-600 dark:text-gray-400" size={20} />
                      )}
                    </motion.div>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>

                  <h3 className="text-gray-900 dark:text-white font-medium mb-2 line-clamp-2">
                    {file.name}
                  </h3>

                  {file.notes && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {file.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-500">
                      {formatDate(new Date(file.created_at || file.uploadedAt))}
                    </span>
                    <motion.div
                      className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Eye size={16} />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Delete Confirmation Modal */}
      {confirmDelete.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={cancelDelete}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-10 max-w-md w-full shadow-2xl text-center border border-gray-200 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-3xl font-normal mb-4 text-gray-900 dark:text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Delete File?
            </h2>
            <p className="mb-8 text-gray-700 dark:text-gray-300 text-sm font-normal" style={{ fontFamily: 'inherit' }}>
              Are you sure you want to delete <span className="font-semibold">{confirmDelete.file?.name}</span>?<br/>
              <span className="font-bold text-red-500">You won&apos;t be able to recover this file again.</span>
            </p>
            <div className="flex justify-center gap-4">
              <motion.button
                onClick={cancelDelete}
                className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-base transition-all focus:outline-none"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.97 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={confirmDeleteFile}
                className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold text-base transition-all focus:outline-none shadow-md hover:bg-red-700"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.97 }}
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default LibraryPage;