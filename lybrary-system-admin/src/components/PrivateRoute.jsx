import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function PrivateRoute({ children }) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Only admin role is permitted in admin panel
  if (!userData || userData.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Доступ только для администратора</h2>
          <p className="text-sm text-slate-600 mb-6">
            Ваш аккаунт не обладает правами главного администратора. Библиотекарям необходимо использовать основное приложение "Панель библиотекаря".
          </p>
          <Navigate to="/login" replace />
        </div>
      </div>
    );
  }

  return children;
}
