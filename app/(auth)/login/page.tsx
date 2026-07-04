'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { authAPI } from '@/lib/api-client';
import Link from 'next/link';
import { Eye, EyeOff, Lock, User, ShieldAlert, ArrowRight, Sparkles, X } from 'lucide-react';

const SLIDES = [
  {
    image: '/slide-1.png',
    title: 'Precision Automation',
    tagline: 'Empowering enterprises with intelligent workflows and high-performance system monitoring.'
  },
  {
    image: '/slide-2.png',
    title: 'Cloud-Scale Infrastructure',
    tagline: 'Experience real-time performance indicators and microsecond latency server health.'
  },
  {
    image: '/slide-3.png',
    title: 'Collaborative Excellence',
    tagline: 'Fostering seamless developer integration and automated EOD reporting logs.'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Forgot password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmployeeId, setForgotEmployeeId] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setIsForgotSubmitting(true);

    try {
      if (!forgotUsername || !forgotEmail || !forgotEmployeeId) {
        setForgotError('All fields are required');
        setIsForgotSubmitting(false);
        return;
      }

      const res = await authAPI.forgotPassword(forgotUsername, forgotEmail, Number(forgotEmployeeId));
      setForgotSuccess(res.message || 'Credentials reset successfully!');
      
      // Clear inputs
      setForgotUsername('');
      setForgotEmail('');
      setForgotEmployeeId('');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to request password reset');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  // Auto sliding carousel logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!username || !password) {
        setError('Username and password are required');
        setIsLoading(false);
        return;
      }

      const response = await authAPI.login(username, password);
      
      if (response.token && response.user) {
        login(response.token, response.user);
        router.push('/dashboard');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-100 overflow-hidden font-sans">
      {/* Left Pane: Auto sliding brand slideshow (Hidden on mobile) */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 bg-slate-950 items-center justify-center overflow-hidden border-r border-slate-800/50">
        {/* Slides list */}
        {SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentSlide === idx ? 'opacity-40' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover transform scale-105 transition-transform duration-[4500ms]"
            />
          </div>
        ))}

        {/* Ambient colored blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

        {/* Brand Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-between p-12 z-10">
          <div>
            <img src="/logo-horizontal.svg" alt="HBEONLABS Logo" className="h-12 w-auto object-contain brightness-0 invert" />
          </div>

          <div className="space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400">
              <Sparkles size={12} />
              Enterprise Edition
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight transition-all duration-500">
              {SLIDES[currentSlide].title}
            </h1>
            <p className="text-slate-300 font-medium leading-relaxed transition-all duration-500">
              {SLIDES[currentSlide].tagline}
            </p>

            {/* Slide dots indicator */}
            <div className="flex gap-1.5 pt-2">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            © 2026 HBEONLABS Technologies Pvt. Ltd. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-900 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            {/* Show logo on mobile only */}
            <div className="lg:hidden flex justify-center mb-6">
              <img src="/logo-horizontal.svg" alt="HBEONLABS Logo" className="h-12 w-auto object-contain brightness-0 invert" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Sign In
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Access the workplace management and server health terminal.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-slate-300 text-xs font-bold uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User size={18} />
                  </span>
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-slate-300 text-xs font-bold uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError('');
                      setForgotSuccess('');
                      setShowForgotPasswordModal(true);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-400 font-bold transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock size={18} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <label htmlFor="remember" className="ml-2.5 text-xs text-slate-400 font-bold uppercase tracking-wider cursor-pointer">
                Remember this session
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Enter Dashboard
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Support Line */}
          <div className="text-center text-xs text-slate-500 font-semibold border-t border-slate-800 pt-6">
            Need credentials?{' '}
            <Link
              href="https://wa.me/919999999999?text=Hello%20HBEONLABS%20Support,%20I%20need%20assistance%25with%25my%25login%25credentials."
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 font-bold transition inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 fill-current text-emerald-500" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.423.002 9.835-4.394 9.838-9.82.001-2.628-1.02-5.1-2.871-6.955C16.39 1.977 13.93 1.956 12.01 1.956c-5.424 0-9.839 4.394-9.843 9.82-.001 1.97.518 3.89 1.507 5.589l-1.002 3.666 3.785-.992c1.6.877 3.2 1.348 4.7 1.35zM12.01 4.7c-4.14 0-7.5 3.36-7.5 7.5 0 1.58.49 3.05 1.32 4.28l-.66 2.42 2.47-.65c1.19.78 2.61 1.23 4.14 1.23 4.14 0 7.5-3.36 7.5-7.5 0-4.14-3.36-7.5-7.5-7.5z" />
              </svg>
              Consult system administrator
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in text-slate-100 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="text-blue-500" size={18} />
                Reset Password Request
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {forgotError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <ShieldAlert size={16} className="shrink-0" />
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                {forgotSuccess}
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  placeholder="e.g. employee"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-650 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. employee@hbeonlabs.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-650 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">Employee ID (Numeric)</label>
                <input
                  type="number"
                  placeholder="e.g. 4"
                  value={forgotEmployeeId}
                  onChange={(e) => setForgotEmployeeId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-650 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="flex-1 py-2.5 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition text-xs font-bold shadow-md cursor-pointer flex items-center justify-center"
                >
                  {isForgotSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Reset & Send Email'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
