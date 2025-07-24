import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, LogOut, Calendar } from 'lucide-react';

interface ProfileMenuProps {
  open: boolean;
  onClose: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
  };
  onSignOut: () => void;
}

// Add a helper function for date formatting
function formatDateWithOrdinal(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  const getOrdinal = (n: number) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${day}${getOrdinal(day)} ${month} ${year}`;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ open, onClose, user, onSignOut }) => {
  React.useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open', 'overflow-hidden');
    } else {
      document.body.classList.remove('modal-open', 'overflow-hidden');
    }
    return () => {
      document.body.classList.remove('modal-open', 'overflow-hidden');
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Block background interaction/selection */}
          <div className="fixed inset-0 z-[99998] pointer-events-none select-none">
            <div className="absolute inset-0 bg-black/40" />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            onClick={onClose}
            style={{ pointerEvents: 'auto' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed z-[99999] bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center max-h-[90vh] overflow-y-visible"
              style={{ fontFamily: 'Inter, sans-serif', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', pointerEvents: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-5 right-5 flex flex-row items-center gap-2" style={{alignItems: 'center'}}>
                <div className="relative group">
                  <button
                    onClick={onSignOut}
                    className="text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
                    aria-label="Sign Out"
                    style={{marginTop: '5px'}}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
                  </button>
                  <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-white text-gray-900 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-200" style={{fontFamily: 'Inter, sans-serif'}}>Sign Out</div>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-4xl"
                  onClick={onClose}
                  aria-label="Close"
                  style={{ lineHeight: 1, paddingTop: '1px' }}
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-3xl font-bold text-gray-700 dark:text-gray-200 mb-4 select-none">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className="text-4xl font-normal text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {user.firstName} {user.lastName}
                </div>
              </div>
              <div className="space-y-5 mb-8 w-full">
                <div className="flex items-center gap-4 bg-white/20 dark:bg-white/5 border border-white/20 rounded-xl px-6 py-5 w-full">
                  <Mail size={28} className="text-gray-500 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">Email</span>
                    <span className="text-lg text-gray-800 dark:text-gray-200">{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/20 dark:bg-white/5 border border-white/20 rounded-xl px-6 py-5 w-full">
                  <Calendar size={28} className="text-gray-500 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">Joined</span>
                    <span className="text-lg text-gray-800 dark:text-gray-200">{formatDateWithOrdinal(user.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 bg-white/20 dark:bg-white/5 border border-white/20 rounded-xl px-6 py-4 w-full mt-2">
                  <span className="text-base text-gray-700 dark:text-gray-200 text-center mb-2">You have agreed to the VoidBox policies.</span>
                  <a
                    href="/policies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center px-4 py-2 rounded-xl text-white bg-green-600 hover:bg-green-700 font-semibold text-base transition-colors shadow"
                    style={{ textAlign: 'center' }}
                  >
                    View Policies
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileMenu; 