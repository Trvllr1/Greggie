import { motion } from 'motion/react';
import { useState } from 'react';
import { X, LogIn, UserPlus, Zap } from 'lucide-react';
import * as api from '../services/api';
import { useAuth } from '../hooks/useAuth';

type AuthModalProps = {
  onClose: () => void;
};

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, username, password);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.devLogin();
      // devLogin sets the token but doesn't go through AuthProvider —
      // reload to pick it up
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-sm mx-4 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {mode === 'login' ? <LogIn size={20} className="text-indigo-400" /> : <UserPlus size={20} className="text-indigo-400" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="you@email.com"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="your_handle"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-900 px-2 text-zinc-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-60"
          >
            <Zap size={16} className="text-yellow-400" />
            Quick Dev Login
          </button>

          <p className="text-center text-sm text-zinc-500">
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button type="button" onClick={() => setMode('register')} className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
