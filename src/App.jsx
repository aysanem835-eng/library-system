import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Setup from './pages/Setup';
import StudentDashboard from './pages/StudentDashboard';
import LibrarianDashboard from './pages/LibrarianDashboard';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {currentUser && userData && <Navbar />}
      <Routes>
        <Route
          path="/login"
          element={
            currentUser && userData ? (
              userData.role === 'student' ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/student"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={['admin', 'librarian']}>
              <LibrarianDashboard />
            </PrivateRoute>
          }
        />

        <Route path="/setup" element={<Setup />} />

        <Route
          path="*"
          element={
            currentUser && userData ? (
              userData.role === 'student' ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return <AppRoutes />;
}
