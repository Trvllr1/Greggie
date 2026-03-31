import { motion } from 'motion/react';
import { X, Wallet, CreditCard, History, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type UserProfileModalProps = {
  onClose: () => void;
  onOpenCreatorStudio?: () => void;
  onOpenAuth?: () => void;
};

export function UserProfileModal({ onClose, onOpenCreatorStudio, onOpenAuth }: UserProfileModalProps) {
  const { user, isLoggedIn, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-t-3xl bg-zinc-900 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="text-indigo-400" />
            Profile & Wallet
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-6">
          {!isLoggedIn ? (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <User size={32} className="text-zinc-500" />
              </div>
              <p className="text-zinc-400">Sign in to access your profile, wallet, and purchase history.</p>
              <button
                onClick={() => { onClose(); onOpenAuth?.(); }}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          ) : (
          <>
          {/* User Info */}
          <div className="flex items-center gap-4 mb-8">
            <img 
              src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username ?? 'anon'}`}
              alt="User Avatar" 
              className="h-16 w-16 rounded-full bg-zinc-800 border-2 border-indigo-500"
            />
            <div>
              <h3 className="text-xl font-bold text-white">{user?.display_name || user?.username || 'User'}</h3>
              <p className="text-sm text-zinc-400">@{user?.username || 'anonymous'}</p>
            </div>
          </div>

          {/* Wallet Balance */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 mb-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 text-white/80 mb-1">
              <Wallet size={16} />
              <span className="text-sm font-medium uppercase tracking-wider">Relay Balance</span>
            </div>
            <div className="text-4xl font-bold text-white mb-4">$245.50</div>
            <div className="flex gap-2">
              <button className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-sm font-semibold transition-colors backdrop-blur-sm">
                Add Funds
              </button>
              <button className="flex-1 bg-black/20 hover:bg-black/30 text-white py-2 rounded-xl text-sm font-semibold transition-colors backdrop-blur-sm">
                Withdraw
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            {onOpenCreatorStudio && (
              <button 
                onClick={() => {
                  onClose();
                  onOpenCreatorStudio();
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors text-left mb-4"
              >
                <div className="flex items-center gap-3 text-indigo-300">
                  <User size={20} />
                  <span className="font-medium">Creator Studio</span>
                </div>
                <span className="text-xs font-bold bg-indigo-500 text-white px-2 py-1 rounded-md uppercase tracking-wider">Live</span>
              </button>
            )}
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left">
              <div className="flex items-center gap-3 text-white">
                <CreditCard className="text-zinc-400" size={20} />
                <span className="font-medium">Payment Methods</span>
              </div>
              <span className="text-xs font-medium bg-zinc-700 text-zinc-300 px-2 py-1 rounded-md">2 Saved</span>
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left">
              <div className="flex items-center gap-3 text-white">
                <History className="text-zinc-400" size={20} />
                <span className="font-medium">Purchase History</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left">
              <div className="flex items-center gap-3 text-white">
                <Settings className="text-zinc-400" size={20} />
                <span className="font-medium">Account Settings</span>
              </div>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-left mt-2"
            >
              <div className="flex items-center gap-3 text-red-400">
                <LogOut size={20} />
                <span className="font-medium">Sign Out</span>
              </div>
            </button>
          </div>
          </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
