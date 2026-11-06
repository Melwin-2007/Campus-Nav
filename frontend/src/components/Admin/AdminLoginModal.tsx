import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  X,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import api from '../../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const { isAdminMode, setIsAdminMode } = useNavigation();
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.auth.login({ username, password });
      setIsAdminMode(true);
      setSuccessMessage('Authentication successful. Admin mode activated.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid admin credentials. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setIsAdminMode(false);
    onClose();
  };

  const isAuth = api.auth.isAuthenticated();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-floating p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-indigo/15 text-brand-indigo dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Admin Authentication
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Map Graph Editor & Topology Controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {isAuth || isAdminMode ? (
          <div className="py-4 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
                Admin Session Active
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You have full write access to add, reposition, and link graph nodes and edges.
              </p>
            </div>

            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(!isAdminMode);
                  onClose();
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isAdminMode
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-brand-indigo text-white shadow-sm'
                }`}
              >
                {isAdminMode ? 'Hide Graph Editor' : 'Open Graph Editor'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="py-4 flex flex-col gap-3">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs p-2.5 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
                  placeholder="admin"
                />
                <KeyRound size={14} className="absolute left-2.5 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs p-2.5 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
                  placeholder="••••••••"
                />
                <Lock size={14} className="absolute left-2.5 top-3 text-slate-400" />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
              Demo Credentials: <span className="font-mono font-semibold text-brand-indigo dark:text-indigo-300">admin</span> / <span className="font-mono font-semibold text-brand-indigo dark:text-indigo-300">admin123</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 w-full py-2.5 rounded-xl bg-brand-indigo text-white font-heading font-bold text-xs hover:bg-brand-indigo/90 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-indigo/20 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock size={14} />
                  <span>Authenticate & Unlock</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLoginModal;
