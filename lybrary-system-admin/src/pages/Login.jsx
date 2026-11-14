import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  Loader2
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initial Admin Setup mode if no admins exist
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [adminFullName, setAdminFullName] = useState('Главный Администратор');
  const [checkingSystem, setCheckingSystem] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkSystemInit();
  }, []);

  const checkSystemInit = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'system'));
      if (!configDoc.exists()) {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (usersSnap.empty) {
          setIsFirstSetup(true);
        }
      }
    } catch (e) {
      console.warn('System check error:', e);
    } finally {
      setCheckingSystem(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          setError('Неверный логин или пароль администратора');
          break;
        case 'auth/wrong-password':
          setError('Неверный пароль');
          break;
        default:
          setError('Ошибка авторизации. Проверьте данные.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFirstAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let email = identifier.trim();
      if (!email.includes('@')) {
        email = `${email.toLowerCase()}@schoollib.local`;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const username = email.split('@')[0];

      await setDoc(doc(db, 'users', uid), {
        uid,
        username,
        email,
        fullName: adminFullName.trim(),
        role: 'admin',
        createdAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'config', 'system'), {
        initialized: true,
        adminUid: uid,
        adminEmail: email,
        createdAt: new Date().toISOString(),
      });

      navigate('/');
    } catch (err) {
      console.error('Setup error:', err);
      setError(`Ошибка создания: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSystem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-xl shadow-indigo-500/20 text-white">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Панель администратора</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {isFirstSetup ? 'Первичная инициализация системы' : 'Вход для управления библиотекой'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isFirstSetup ? (
            <form onSubmit={handleCreateFirstAdmin} className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 mb-2">
                В системе еще нет администратора. Задайте имя, логин/email и пароль для главного управляющего.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  ФИО администратора
                </label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Email или Логин
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@school.edu или admin"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Пароль (мин. 6 символов)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Создать главного админа</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Логин или Email администратора
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin или email"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Войти в админ-панель</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Защищенный шлюз управления школьной системой</span>
          </div>
        </div>
      </div>
    </div>
  );
}
