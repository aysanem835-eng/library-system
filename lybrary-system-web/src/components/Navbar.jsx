import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, UserCheck } from 'lucide-react';

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
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800">
                Школьная библиотека
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Панель библиотекаря
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 flex items-center justify-end gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                {userData.fullName || 'Библиотекарь'}
              </p>
              <p className="text-xs text-slate-400">
                {userData.role === 'admin' ? 'Администратор' : 'Библиотекарь'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-100 transition-colors"
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
