import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, AtSign, Mail, MessageSquare, FileText } from 'lucide-react';

interface ContactSupportProps {
  open: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

const ContactSupport: React.FC<ContactSupportProps> = ({ open, onClose, theme }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      // Get the contact worker URL from environment variable
      const workerUrl = import.meta.env.VITE_CONTACT_WORKER_URL;
      
      if (!workerUrl) {
        throw new Error('Contact worker URL not configured. Please set VITE_CONTACT_WORKER_URL in your environment variables.');
      }
      
      console.log('Sending contact form to:', workerUrl);
      
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      
      const result = await response.json();

      if (result.status) {
        setStatus({ type: 'success', message: result.msg });
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatus({ type: 'error', message: result.msg });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Failed to fetch')) {
        setStatus({ type: 'error', message: 'Unable to connect to contact service. Please check your internet connection or try again later.' });
      } else if (errorMessage.includes('Contact worker URL not configured')) {
        setStatus({ type: 'error', message: errorMessage });
      } else {
        setStatus({ type: 'error', message: 'Failed to send message. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl scrollbar-hide ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-300 dark:border-gray-500">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">Contact Support</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white dark:hover:bg-opacity-10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border-0 rounded-xl bg-white dark:bg-black focus:outline-none shadow-lg dark:shadow-white/20"
                      placeholder="Your name"
                    />
                  </div>
                </div>



                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border-0 rounded-xl bg-white dark:bg-black focus:outline-none shadow-lg dark:shadow-white/20"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border-0 rounded-xl bg-white dark:bg-black focus:outline-none shadow-lg dark:shadow-white/20"
                      placeholder="Brief subject"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border-0 rounded-xl bg-white dark:bg-black focus:outline-none resize-none shadow-lg dark:shadow-white/20"
                    placeholder="Describe your issue or question..."
                  />
                </div>

                {/* Status Message */}
                {status.type && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg text-sm ${
                      status.type === 'success' 
                        ? 'bg-green-100 text-green-700 dark:bg-white dark:text-black' 
                        : 'bg-red-100 text-red-700 dark:bg-white dark:text-black'
                    }`}
                  >
                    {status.message}
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white dark:bg-white hover:bg-gray-100 dark:hover:bg-gray-100 disabled:bg-gray-400 text-black dark:text-black py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContactSupport; 