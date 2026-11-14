import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser || !userData) {
    return <Navigate to="/login" replace />;
  }

  // Only librarians and admins are allowed in the web librarian app
  const role = userData.role;
  if (role !== 'librarian' && role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Доступ ограничен</h2>
          <p className="text-sm text-slate-600 mb-6">
            Этот интерфейс предназначен только для библиотекарей. Обратитесь к системному администратору.
          </p>
          <Navigate to="/login" replace />
        </div>
      </div>
    );
  }

  return children;
}
