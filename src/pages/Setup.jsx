import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
  UserPlus,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Search,
  Shield,
  BookOpen,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

export default function Setup() {
  const { currentUser, userData, login } = useAuth();
  const navigate = useNavigate();

  // Check if any users exist
  const [hasUsers, setHasUsers] = useState(null); // null = loading
  const [checkingUsers, setCheckingUsers] = useState(true);

  // Initial admin form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('Администратор');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ type: '', text: '' });

  // Normal setup form
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userClass, setUserClass] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if database has any users
  useEffect(() => {
    checkForUsers();
  }, []);

  const checkForUsers = async () => {
    setCheckingUsers(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const exists = !snapshot.empty;
      setHasUsers(exists);
      if (exists) {
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error('Error checking users:', error);
      setHasUsers(false);
    } finally {
      setCheckingUsers(false);
    }
  };

  // If users exist but not logged in as admin/librarian → redirect
  useEffect(() => {
    if (checkingUsers) return;
    if (hasUsers && !currentUser) {
      navigate('/login');
    }
    if (hasUsers && userData && userData.role === 'student') {
      navigate('/student');
    }
  }, [hasUsers, currentUser, userData, checkingUsers]);

  // Fetch users list for admin view
  useEffect(() => {
    if (hasUsers && userData && (userData.role === 'admin' || userData.role === 'librarian')) {
      fetchUsers();
    }
  }, [hasUsers, userData]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  // ========== CREATE FIRST ADMIN ==========
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminMessage({ type: '', text: '' });
    setAdminLoading(true);

    try {
      const email = adminEmail.trim();
      if (!email.includes('@')) {
        setAdminMessage({ type: 'error', text: 'Введите корректный email' });
        setAdminLoading(false);
        return;
      }

      // Create admin directly with main auth (no one is logged in yet)
      const { getAuth: getMainAuth } = await import('firebase/auth');
      const mainAuth = getMainAuth();
      const userCredential = await createUserWithEmailAndPassword(
        mainAuth,
        email,
        adminPassword
      );

      const uid = userCredential.user.uid;
      const adminUsername = email.split('@')[0];

      await setDoc(doc(db, 'users', uid), {
        uid,
        username: adminUsername,
        fullName: adminFullName.trim() || 'Администратор',
        role: 'admin',
        class: 'Администратор',
        history: [],
      });

      setAdminMessage({
        type: 'success',
        text: `Админ-аккаунт создан! Логин: ${adminUsername}, Email: ${email}`,
      });

      // Wait a bit then redirect
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error creating admin:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAdminMessage({ type: 'error', text: 'Этот email уже зарегистрирован' });
      } else if (error.code === 'auth/weak-password') {
        setAdminMessage({ type: 'error', text: 'Пароль должен быть не менее 6 символов' });
      } else if (error.code === 'auth/invalid-email') {
        setAdminMessage({ type: 'error', text: 'Некорректный формат email' });
      } else {
        setAdminMessage({ type: 'error', text: `Ошибка: ${error.message}` });
      }
    } finally {
      setAdminLoading(false);
    }
  };

  // ========== CREATE NORMAL USER ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    if (username.includes(' ') || username.includes('@')) {
      setMessage({ type: 'error', text: 'Логин не должен содержать пробелы или символ @' });
      setLoading(false);
      return;
    }

    const duplicate = users.find(
      (u) => u.username?.toLowerCase() === username.toLowerCase()
    );
    if (duplicate) {
      setMessage({ type: 'error', text: 'Пользователь с таким логином уже существует' });
      setLoading(false);
      return;
    }

    let secondaryApp = null;
    try {
      const email = `${username.toLowerCase()}@schoollib.local`;

      secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        uid,
        username: username.toLowerCase(),
        fullName,
        role,
        class: userClass,
        history: [],
      });

      setMessage({
        type: 'success',
        text: `Пользователь "${username}" успешно создан (${role})`,
      });
      setUsername('');
      setFullName('');
      setUserClass('');
      setPassword('');
      setRole('student');
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === 'auth/email-already-in-use') {
        setMessage({ type: 'error', text: 'Этот логин уже зарегистрирован в системе авторизации' });
      } else if (error.code === 'auth/weak-password') {
        setMessage({ type: 'error', text: 'Пароль должен быть не менее 6 символов' });
      } else {
        setMessage({ type: 'error', text: `Ошибка: ${error.message}` });
      }
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (e) { /* ignore */ }
      }
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Удалить пользователя "${user.fullName}" из базы данных?`)) return;
    try {
      await deleteDoc(doc(db, 'users', user.id));
      setMessage({ type: 'success', text: `Запись пользователя "${user.fullName}" удалена` });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Ошибка при удалении пользователя' });
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.class?.toLowerCase().includes(term)
    );
  });

  const getRoleIcon = (r) => {
    switch (r) {
      case 'admin': return <Shield className="w-3.5 h-3.5" />;
      case 'librarian': return <BookOpen className="w-3.5 h-3.5" />;
      default: return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  const getRoleBadge = (r) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700',
      librarian: 'bg-blue-100 text-blue-700',
      student: 'bg-slate-100 text-slate-600',
    };
    const labels = { admin: 'Админ', librarian: 'Библиотекарь', student: 'Ученик' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[r] || styles.student}`}>
        {getRoleIcon(r)}
        {labels[r] || r}
      </span>
    );
  };

  // ========== LOADING STATE ==========
  if (checkingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // ========== FIRST-TIME SETUP (NO USERS) ==========
  if (!hasUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Первичная настройка</h1>
            <p className="text-slate-500 mt-1">Создайте аккаунт администратора системы</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {adminMessage.text && (
              <div
                className={`flex items-center gap-2 p-3 mb-6 rounded-xl text-sm ${
                  adminMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {adminMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {adminMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  ФИО администратора
                </label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  placeholder="Иванов Иван Иванович"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Пароль
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adminLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Создать администратора
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Этот экран появляется только при первом запуске
          </p>
        </div>
      </div>
    );
  }

  // ========== NOT AUTHORIZED (users exist but not logged in) ==========
  if (!currentUser || !userData || (userData.role !== 'admin' && userData.role !== 'librarian')) {
    return null; // useEffect will redirect
  }

  // ========== NORMAL SETUP (ADMIN/LIBRARIAN) ==========
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Управление пользователями</h1>
          <p className="text-slate-500 mt-1">Создание и управление аккаунтами системы</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-800">Новый пользователь</h2>
              </div>

              {message.text && (
                <div
                  className={`flex items-center gap-2 p-3 mb-4 rounded-xl text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Логин</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="ivanov.ivan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ФИО</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Класс / Должность</label>
                  <input
                    type="text"
                    value={userClass}
                    onChange={(e) => setUserClass(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="9-А или Учитель"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Минимум 6 символов"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Роль</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="student">Ученик</option>
                    <option value="librarian">Библиотекарь</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {loading ? 'Создание...' : 'Создать пользователя'}
                </button>
              </form>
            </div>
          </div>

          {/* Users List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Все пользователи</h2>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {users.length}
                  </span>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Поиск по имени, логину или классу..."
                />
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">{searchTerm ? 'Пользователи не найдены' : 'Нет пользователей'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Пользователь</th>
                        <th className="pb-3 pr-4">Логин</th>
                        <th className="pb-3 pr-4">Класс</th>
                        <th className="pb-3 pr-4">Роль</th>
                        <th className="pb-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4">
                            <p className="text-sm font-medium text-slate-800">{user.fullName}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {user.username}
                            </code>
                          </td>
                          <td className="py-3 pr-4 text-sm text-slate-600">{user.class}</td>
                          <td className="py-3 pr-4">{getRoleBadge(user.role)}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              title="Удалить запись"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
