import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import TextDropPage from './components/TextDropPage';
import LibraryPage from './components/LibraryPage';
import FilePreviewPage from './components/FilePreviewPage';
import PoliciesPage from './components/PoliciesPage';
import LoginPage from './components/LoginPage';
import ThemeToggle from './components/ThemeToggle';
import { useUserFiles } from './hooks/useLocalStorage';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { PageType, FileItem } from './types';
import ProfileMenu from './components/ProfileMenu';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  console.log('App rendered, location:', window.location.pathname);
  const [selectedFile, setSelectedFile] = useState<FileItem | undefined>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [circleOrigin, setCircleOrigin] = useState({ x: 0, y: 0 });
  const [circleSize, setCircleSize] = useState(0);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { files, fetchUserFiles } = useUserFiles();
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { theme, toggleTheme: baseToggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const welcomeShownRef = useRef(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Add a function to allow children to trigger the login modal (must be before any return)
  const triggerLoginModal = useCallback(() => setShowLoginModal(true), []);

  // Modified toggleTheme to show overlay from button position
  const toggleTheme = useCallback(() => {
    baseToggleTheme();
  }, [baseToggleTheme]);

  const handleFileSelect = (file: FileItem) => {
    console.log('Selected file:', file);
    if (!user) {
      if (triggerLoginModal) triggerLoginModal();
      return;
    }
    setSelectedFile(file);
    navigate(`/file/${file.slug || file.id}`);
  };

  const handleFileAdd = async (file: any) => {
    console.log('Adding file:', file);
    if (!user) {
      if (triggerLoginModal) triggerLoginModal();
      return;
    }
    await fetchUserFiles(user.id); // Refetch after upload
    setJustUploaded(true);
  };

  const handleSignOut = async () => {
    console.log('Sign out button clicked');
    const { error } = await signOut();
    if (error) {
      console.error('Sign out failed:', error.message);
    } else {
      setProfileOpen(false); // Close profile modal on sign out
      navigate('/home');
      welcomeShownRef.current = false; // Reset welcome overlay for next login
      console.log('Sign out successful, redirected to home, welcomeShownRef reset:', welcomeShownRef.current);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setJustLoggedIn(true); // Set flag on successful login
  };

  useEffect(() => {
    if (
      justLoggedIn &&
      user?.user_metadata?.first_name &&
      showLoginModal === false
    ) {
      setShowWelcomeOverlay(true);
      welcomeShownRef.current = true;
      const timeout = setTimeout(() => {
        setShowWelcomeOverlay(false);
        setJustLoggedIn(false); // Reset flag after overlay
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [justLoggedIn, user, showLoginModal]);
  useEffect(() => {
    if (user && user.id) {
      fetchUserFiles(user.id);
    }
  }, [user, fetchUserFiles]);
  useEffect(() => {
    if (justUploaded && location.pathname === '/library' && user?.id) {
      fetchUserFiles(user.id);
      setJustUploaded(false);
    }
  }, [justUploaded, location.pathname, user, fetchUserFiles]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full"
        />
      </div>
    );
  }

  // Sidebar navigation handler
  const handlePageChange = (page: PageType) => {
    switch (page) {
      case 'home':
        navigate('/home');
        break;
      case 'upload':
        navigate('/upload');
        break;
      case 'text':
        navigate('/text');
        break;
      case 'library':
        navigate('/library');
        break;
      case 'policies':
        navigate('/policies');
        break;
      default:
        navigate('/home');
    }
  };

  const PublicFilePreviewPageWithTheme = () => {
    const { slug } = useParams();
    return <FilePreviewPage slug={slug!} onPageChange={handlePageChange} theme={theme} />;
  };

  const PublicFilePreviewPage = () => {
    const { slug } = useParams();
    // Render FilePreviewPage in public mode (will need to add a prop to FilePreviewPage for public mode)
    return <FilePreviewPage slug={slug!} onPageChange={() => {}} theme={theme} isPublic={true} />;
  };

  return (
    <div className="bg-white dark:bg-black min-h-screen transition-colors flex flex-col">
      {/* Welcome Overlay */}
      <AnimatePresence>
        {showWelcomeOverlay && user?.user_metadata?.first_name && (
          <motion.div
            key="welcome-overlay"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 1.5, ease: [0.77, 0, 0.175, 1] }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black pointer-events-auto select-none"
          >
            <span
              className="pointer-events-auto select-none text-4xl md:text-6xl font-normal text-white"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Welcome, {user.user_metadata.first_name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <LoginPage 
                onSignIn={signIn} 
                onSignUp={signUp}
                theme={theme} 
                onClose={handleLoginSuccess}
                onPageChange={() => handlePageChange('policies')}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-900 p-4 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {theme === 'dark' ? (
              <img src="/dark.png" alt="VoidBox" className="w-8 h-8" />
            ) : (
              <img src="/light.png" alt="VoidBox" className="w-8 h-8" />
            )}
            <h1 className="text-gray-900 dark:text-white font-bold text-xl" style={{ fontFamily: 'Playfair Display, serif' }}>VoidBox</h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Profile avatar button for mobile */}
            {user && (
              <button
                onClick={() => setProfileOpen(true)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-base font-bold text-gray-700 dark:text-gray-200 focus:outline-none border border-gray-300 dark:border-gray-700"
                aria-label="Open Profile Menu"
              >
                {user.user_metadata?.first_name?.[0] || ''}{user.user_metadata?.last_name?.[0] || ''}
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Logo - Desktop */}
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          currentPage={location.pathname.split('/').pop() as PageType} 
          onPageChange={handlePageChange} 
          onSignOut={user ? handleSignOut : undefined}
          theme={theme}
          user={user}
          triggerLoginModal={triggerLoginModal}
          toggleTheme={toggleTheme}
          toggleRef={toggleRef}
          setProfileOpen={setProfileOpen}
          profileOpen={profileOpen}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        currentPage={location.pathname.split('/').pop() as PageType}
        onPageChange={handlePageChange}
        onSignOut={user ? handleSignOut : undefined}
        isMobile={true}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        theme={theme}
        user={user}
        triggerLoginModal={triggerLoginModal}
        toggleTheme={toggleTheme}
        toggleRef={toggleRef}
      />

      {/* Main Content */}
      <div className="lg:ml-20 pt-16 lg:pt-0 flex-1">
        <Routes>
          <Route path="/file/:slug" element={
            <ErrorBoundary>
              <PublicFilePreviewPageWithTheme />
            </ErrorBoundary>
          } />
          <Route path="/public/:slug" element={
            <ErrorBoundary>
              <PublicFilePreviewPage />
            </ErrorBoundary>
          } />
          <Route path="/home" element={<HomePage onPageChange={handlePageChange} theme={theme} isMenuOpen={profileOpen} />} />
          <Route path="/upload" element={<UploadPage onPageChange={handlePageChange} onFileAdd={handleFileAdd} theme={theme} user={user} triggerLoginModal={triggerLoginModal} />} />
          <Route path="/text" element={<TextDropPage onPageChange={handlePageChange} onFileAdd={handleFileAdd} theme={theme} user={user} triggerLoginModal={triggerLoginModal} />} />
          <Route path="/library" element={<LibraryPage files={files} onPageChange={handlePageChange} onFileSelect={handleFileSelect} onFileDelete={() => {}} theme={theme} user={user} triggerLoginModal={triggerLoginModal} fetchUserFiles={fetchUserFiles} />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="*" element={<HomePage onPageChange={handlePageChange} theme={theme} />} />
        </Routes>
      </div>

      {/* Mobile FAB for Upload */}
      <AnimatePresence>
        {location.pathname !== '/upload' && location.pathname !== '/text' && !profileOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            onClick={() => handlePageChange('upload')}
            className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-lg z-10"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="text-2xl font-bold">+</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Render ProfileMenu overlay at the root, above all content, when open */}
      {profileOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <ProfileMenu
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            user={user ? {
              firstName: user.user_metadata?.first_name || '',
              lastName: user.user_metadata?.last_name || '',
              email: user.email || '',
              createdAt: user.created_at || '',
            } : { firstName: '', lastName: '', email: '', createdAt: '' }}
            onSignOut={user ? handleSignOut : () => {}}
          />
        </div>
      )}
    </div>
  );
}

export default App;