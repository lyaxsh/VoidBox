import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Lock, Eye, EyeOff, User as UserIcon, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<{ error: any }>;
  onSignUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  theme: 'dark' | 'light';
  onClose?: () => void;
  onPageChange?: (section: string) => void;
}

type Step = 'email' | 'login' | 'register' | 'verify';

const LoginPage: React.FC<LoginPageProps> = ({ onSignIn, onSignUp, theme, onClose, onPageChange }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [greetingName, setGreetingName] = useState('');
  const [info, setInfo] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [showRateLimitMsg, setShowRateLimitMsg] = useState(false);

  // Set cooldown to 60 seconds for production
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else if (!canResend) {
      setCanResend(true);
      setInfo(''); // Hide confirmation after cooldown
    }
    return () => clearTimeout(timer);
  }, [resendTimer, canResend]);

  // Step 1: Check if user exists in profiles table
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('email', email)
        .single();
      if (queryError && queryError.code !== 'PGRST116') {
        setError('Something went wrong. Please try again.');
      } else if (data) {
        setGreetingName(data.first_name || email.split('@')[0]);
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Step 2a: Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await onSignIn(email, password);
    if (error) {
      setError(error.message);
    } else if (onClose) {
      onClose();
    }
    setLoading(false);
  };

  // Step 2b: Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await onSignUp(email, password, firstName, lastName);
    if (error) {
      setError(error.message);
    } else {
      setStep('verify');
    }
    setLoading(false);
  };

  // Back button handler
  const handleBack = () => {
    if (step === 'login' || step === 'register') {
      setStep('email');
      setError('');
      setPassword('');
    } else if (step === 'verify') {
      setStep('email');
      setError('');
      setPassword('');
      setFirstName('');
      setLastName('');
    }
  };

  // Edit email handler (same as back)
  const handleEditEmail = () => {
    setStep('email');
    setError('');
    setPassword('');
  };

  const handleResendEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canResend) return;
    // Call Supabase resend confirmation email logic here
    // Example:
    await supabase.auth.resend({ type: 'signup', email });
    setInfo('Confirmation email resent!');
    setCanResend(false);
    setResendTimer(60); // 60 seconds cooldown
    setShowRateLimitMsg(false);
    setTimeout(() => {
      setInfo('');
      setShowRateLimitMsg(true);
    }, 60000); // Show confirmation for 60s, then show rate limit message
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white/60 dark:bg-black/60 backdrop-blur-sm rounded-3xl max-h-[90vh] overflow-hidden py-8 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Mobile cross button */}
        {onClose && (
          <motion.button
            onClick={onClose}
            className="absolute top-[120px] right-4 md:top-6 md:right-6 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </motion.button>
        )}
        
        {/* Desktop close button (existing) */}
        {onClose && (
          <motion.button
            onClick={onClose}
            className="hidden md:block absolute top-6 right-6 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>
        )}

        <div className="text-center mb-4">
          <h1 className="text-3xl font-light text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {step === 'email' && 'Welcome to VoidBox'}
            {step === 'login' && `Hi, ${greetingName}`}
            {step === 'register' && 'Create Account'}
            {step === 'verify' && 'Verify Your Email'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {step === 'email' && 'Enter your email to continue'}
            {step === 'login' && 'Enter your password to access your vault'}
            {step === 'register' && 'Join VoidBox to start storing your files'}
            {step === 'verify' && 'Please check your email and click the verification link to activate your account.'}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-8 bg-white/70 dark:bg-black/90 shadow-xl backdrop-blur-sm"
        >
          {step === 'email' && (
            <>
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm"
                  >
                    {error}
                  </motion.p>
                )}
                {error === 'Email not confirmed' ? (
                  <>
                    <div className="text-red-500 text-sm mt-2">
                      Email not confirmed,{' '}
                      {canResend ? (
                        <a href="#" className="underline" onClick={handleResendEmail}>resend email</a>
                      ) : (
                        <span className="text-gray-400 cursor-not-allowed">resend email ({resendTimer}s)</span>
                      )}
                    </div>
                    {!canResend && info && (
                      <div className="text-green-500 text-sm mt-2">{info}</div>
                    )}
                  </>
                ) : (
                  error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-500 text-sm"
                    >
                      {error}
                    </motion.p>
                  )
                )}
                <motion.button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
              </form>
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  disabled
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-400 py-3 rounded-xl font-semibold cursor-not-allowed"
                >
                  Continue with Google (Coming Soon)
                </button>
              </div>
            </>
          )}

          {(step === 'login' || step === 'register') && (
            <>
              {/* Email display with edit icon */}
              <div className="flex items-center mb-4 justify-between bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                <span className="text-gray-500 text-sm select-none">{email}</span>
                <button
                  type="button"
                  onClick={handleEditEmail}
                  className="ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  title="Edit email"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </>
          )}

          {step === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              {error === 'Email not confirmed' ? (
                <>
                  <div className="text-red-500 text-sm mt-2">
                    Email not confirmed,{' '}
                    {canResend ? (
                      <a href="#" className="underline" onClick={handleResendEmail}>resend email</a>
                    ) : (
                      <span className="text-gray-400 cursor-not-allowed">resend email ({resendTimer}s)</span>
                    )}
                  </div>
                  {!canResend && info && (
                    <div className="text-green-500 text-sm mt-2">{info}</div>
                  )}
                </>
              ) : (
                error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm"
                  >
                    {error}
                  </motion.p>
                )
              )}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm px-2 py-1 rounded-lg"
                >
                  Back
                </button>
                <motion.button
                  type="submit"
                  disabled={loading || !password}
                  className="bg-gray-900 dark:bg-white text-white dark:text-black py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm"
                >
                  {error}
                </motion.p>
              )}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm px-2 py-1 rounded-lg"
                >
                  Back
                </button>
                <motion.button
                  type="submit"
                  disabled={loading || !firstName || !lastName || !password}
                  className="bg-gray-900 dark:bg-white text-white dark:text-black py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full text-center text-gray-700 dark:text-gray-300 text-base">
                <p>
                  We’ve sent a verification link to <span className="font-semibold">{email}</span>.<br />
                  Please check your inbox and click the link to activate your account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm px-2 py-1 rounded-lg"
              >
                Back
              </button>
            </div>
          )}

          {/* No toggle between sign in/up, as flow is now automatic */}

          {/* The Google placeholder button is now only shown on the email entry step */}
        </motion.div>

        <div className="text-center mt-8 text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our{' '}
          <a
            href="#policies"
            className="underline hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick={e => {
              e.preventDefault();
              if (typeof window !== 'undefined' && typeof onPageChange === 'function') {
                onPageChange('policies');
                if (typeof onClose === 'function') onClose();
              } else {
                window.location.hash = '#policies';
              }
            }}
          >
            Terms of Service
          </a>{' '}and{' '}
          <a
            href="#policies"
            className="underline hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick={e => {
              e.preventDefault();
              if (typeof window !== 'undefined' && typeof onPageChange === 'function') {
                onPageChange('policies');
                if (typeof onClose === 'function') onClose();
              } else {
                window.location.hash = '#policies';
              }
            }}
          >
            Privacy Policy
          </a>
          .
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;