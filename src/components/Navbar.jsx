import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { BookOpen, LogOut, Users, LayoutDashboard, Settings } from 'lucide-react';

export default function Navbar() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!userData) return null;

  const isAdmin = userData.role === 'admin' || userData.role === 'librarian';

  const navLink = (to, label, icon) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-6">
              <BookOpen className="w-7 h-7 text-indigo-600" />
              <span className="text-lg font-bold text-slate-800 hidden sm:inline">
                Библиотека
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <>
                  {navLink('/dashboard', 'Панель', <LayoutDashboard className="w-4 h-4" />)}
                  {navLink('/setup', 'Пользователи', <Users className="w-4 h-4" />)}
                </>
              )}
              {userData.role === 'student' && (
                navLink('/student', 'Мой кабинет', <LayoutDashboard className="w-4 h-4" />)
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">{userData.fullName}</p>
              <p className="text-xs text-slate-500">
                {userData.role === 'admin' ? 'Администратор' : userData.role === 'librarian' ? 'Библиотекарь' : userData.class}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
