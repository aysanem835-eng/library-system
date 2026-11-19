import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import LibrarianDashboard from './pages/LibrarianDashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {currentUser && userData && <Navbar />}
      <Routes>
        <Route
          path="/login"
          element={
            currentUser && userData ? <Navigate to="/" replace /> : <Login />
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <LibrarianDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={currentUser ? '/' : '/login'} replace />}
        />
      </Routes>
    </div>
  );
}
