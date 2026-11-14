import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!userData) return null;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900">
                Библиотека | Админ-панель
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                Супер-администратор
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 flex items-center justify-end gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {userData.fullName || 'Главный администратор'}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {userData.email || userData.username || 'admin'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-100 transition-colors"
              title="Выйти"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
