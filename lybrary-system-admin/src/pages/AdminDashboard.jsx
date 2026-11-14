import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  UserPlus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  Layers,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  FolderInput,
  X
} from 'lucide-react';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('librarians'); // 'librarians', 'students', 'stats', 'books'

  // =====================
  // 1. LIBRARIANS STATE
  // =====================
  const [librarians, setLibrarians] = useState([]);
  const [libLoading, setLibLoading] = useState(true);
  const [newLibName, setNewLibName] = useState('');
  const [newLibEmail, setNewLibEmail] = useState('');
  const [newLibPassword, setNewLibPassword] = useState('');
  const [libCreating, setLibCreating] = useState(false);
  const [libMessage, setLibMessage] = useState({ type: '', text: '' });

  // =====================
  // 2. STUDENTS DIRECTORY STATE
  // =====================
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Все');

  // Single Add Student
  const [singleStudentName, setSingleStudentName] = useState('');
  const [singleStudentClass, setSingleStudentClass] = useState('');
  const [studentAdding, setStudentAdding] = useState(false);

  // Bulk Add Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkClass, setBulkClass] = useState('');
  const [bulkNamesText, setBulkNamesText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Class Promotion Modal (Массовый перевод)
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promoFromClass, setPromoFromClass] = useState('');
  const [promoToClass, setPromoToClass] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  // Edit Student Modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentLoading, setEditStudentLoading] = useState(false);

  // =====================
  // 3. GLOBAL STATS & BOOKS
  // =====================
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load everything
  useEffect(() => {
    fetchLibrarians();
    fetchStudents();
    fetchStatsData();
  }, []);

  const fetchLibrarians = async () => {
    setLibLoading(true);
    try {
      // Check librarians collection
      const snapLib = await getDocs(collection(db, 'librarians'));
      let list = snapLib.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Also check users collection for role === 'librarian'
      const snapUsers = await getDocs(collection(db, 'users'));
      const fromUsers = snapUsers.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role === 'librarian' && !list.some((l) => l.id === u.id));

      setLibrarians([...list, ...fromUsers]);
    } catch (e) {
      console.error('Error fetching librarians:', e);
    } finally {
      setLibLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'students_directory'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStudents(list);
    } catch (e) {
      console.error('Error fetching students directory:', e);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchStatsData = async () => {
    setStatsLoading(true);
    try {
      const [snapBooks, snapLoans] = await Promise.all([
        getDocs(collection(db, 'books')),
        getDocs(collection(db, 'loans'))
      ]);
      setBooks(snapBooks.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoans(snapLoans.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching stats data:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  // ==========================================
  // LIBRARIAN HANDLERS
  // ==========================================
  const handleCreateLibrarian = async (e) => {
    e.preventDefault();
    setLibMessage({ type: '', text: '' });
    setLibCreating(true);

    let secondaryApp = null;
    try {
      let email = newLibEmail.trim();
      if (!email.includes('@')) {
        email = `${email.toLowerCase()}@schoollib.local`;
      }

      // Initialize secondary Firebase app so admin doesn't get logged out!
      secondaryApp = initializeApp(firebaseConfig, `sec-admin-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        newLibPassword
      );

      const uid = userCred.user.uid;
      const username = email.split('@')[0];

      const libData = {
        uid,
        username,
        email,
        fullName: newLibName.trim(),
        role: 'librarian',
        createdAt: new Date().toISOString(),
        createdBy: userData?.fullName || 'Администратор',
      };

      // Save to both 'librarians' and 'users' collections for 100% compatibility
      await Promise.all([
        setDoc(doc(db, 'librarians', uid), libData),
        setDoc(doc(db, 'users', uid), libData),
      ]);

      setLibMessage({
        type: 'success',
        text: `Аккаунт библиотекаря "${newLibName}" успешно создан (Логин: ${username})`,
      });

      setNewLibName('');
      setNewLibEmail('');
      setNewLibPassword('');
      fetchLibrarians();
    } catch (err) {
      console.error('Create librarian error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setLibMessage({ type: 'error', text: 'Этот логин или email уже занят' });
      } else if (err.code === 'auth/weak-password') {
        setLibMessage({ type: 'error', text: 'Пароль должен быть не менее 6 символов' });
      } else {
        setLibMessage({ type: 'error', text: `Ошибка: ${err.message}` });
      }
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          /* ignore */
        }
      }
      setLibCreating(false);
    }
  };

  const handleDeleteLibrarian = async (lib) => {
    if (!window.confirm(`Удалить доступ для библиотекаря "${lib.fullName}"?`)) return;

    try {
      await Promise.all([
        deleteDoc(doc(db, 'librarians', lib.id)).catch(() => {}),
        deleteDoc(doc(db, 'users', lib.id)).catch(() => {}),
      ]);
      setLibrarians((prev) => prev.filter((l) => l.id !== lib.id));
    } catch (err) {
      console.error('Error deleting librarian:', err);
      alert(`Ошибка: ${err.message}`);
    }
  };

  // ==========================================
  // STUDENTS DIRECTORY HANDLERS
  // ==========================================
  const handleAddSingleStudent = async (e) => {
    e.preventDefault();
    if (!singleStudentName.trim() || !singleStudentClass.trim()) return;
    setStudentAdding(true);

    try {
      const studentId = `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newStudent = {
        id: studentId,
        fullName: singleStudentName.trim(),
        class: singleStudentClass.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'students_directory', studentId), newStudent);

      setStudents((prev) => [...prev, newStudent]);
      setSingleStudentName('');
    } catch (err) {
      console.error('Add student error:', err);
      alert(`Ошибка: ${err.message}`);
    } finally {
      setStudentAdding(false);
    }
  };

  const handleBulkAddStudents = async (e) => {
    e.preventDefault();
    if (!bulkClass.trim() || !bulkNamesText.trim()) return;
    setBulkLoading(true);

    try {
      const targetClass = bulkClass.trim().toUpperCase();
      const lines = bulkNamesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setBulkLoading(false);
        return;
      }

      const batch = writeBatch(db);
      const addedList = [];

      lines.forEach((name) => {
        const studentId = `st_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const studentData = {
          id: studentId,
          fullName: name,
          class: targetClass,
          createdAt: new Date().toISOString(),
        };
        const studentRef = doc(db, 'students_directory', studentId);
        batch.set(studentRef, studentData);
        addedList.push(studentData);
      });

      await batch.commit();

      setStudents((prev) => [...prev, ...addedList]);
      setBulkNamesText('');
      setBulkClass('');
      setShowBulkModal(false);
      alert(`Успешно добавлено ${addedList.length} учеников в класс ${targetClass}`);
    } catch (err) {
      console.error('Bulk add error:', err);
      alert(`Ошибка: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Mass Promotion of Classes (Перевод классов)
  const handlePromoteClass = async (e) => {
    e.preventDefault();
    if (!promoFromClass || !promoToClass) return;

    const from = promoFromClass.trim().toUpperCase();
    const to = promoToClass.trim().toUpperCase();

    const affectedStudents = students.filter((s) => s.class === from);

    if (affectedStudents.length === 0) {
      alert(`В классе "${from}" нет учеников для перевода.`);
      return;
    }

    if (!window.confirm(`Перевести всех ${affectedStudents.length} учеников из класса "${from}" в класс "${to}"?`)) {
      return;
    }

    setPromoLoading(true);

    try {
      const batch = writeBatch(db);

      affectedStudents.forEach((st) => {
        const ref = doc(db, 'students_directory', st.id);
        batch.update(ref, {
          class: to,
          promotedAt: new Date().toISOString(),
          previousClass: from,
        });
      });

      await batch.commit();

      setStudents((prev) =>
        prev.map((s) => (s.class === from ? { ...s, class: to } : s))
      );

      setShowPromotionModal(false);
      setPromoFromClass('');
      setPromoToClass('');
      alert(`Класс успешно переведен! ${affectedStudents.length} учеников теперь в классе "${to}".`);
    } catch (err) {
      console.error('Promotion error:', err);
      alert(`Ошибка перевода: ${err.message}`);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSaveEditStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditStudentLoading(true);

    try {
      const ref = doc(db, 'students_directory', editingStudent.id);
      const updated = {
        fullName: editingStudent.fullName.trim(),
        class: editingStudent.class.trim().toUpperCase(),
      };
      await updateDoc(ref, updated);

      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...updated } : s))
      );
      setEditingStudent(null);
    } catch (err) {
      console.error('Edit student error:', err);
      alert(`Ошибка: ${err.message}`);
    } finally {
      setEditStudentLoading(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Удалить ученика "${student.fullName}" из справочника?`)) return;

    try {
      await deleteDoc(doc(db, 'students_directory', student.id));
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      console.error('Delete student error:', err);
      alert(`Ошибка: ${err.message}`);
    }
  };

  // ==========================================
  // EXPORT HANDLERS (CSV / JSON)
  // ==========================================
  const downloadFile = (content, filename, type = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportStudentsCSV = () => {
    const headers = 'ФИО,Класс,ID,Дата добавления\n';
    const rows = students
      .map((s) => `"${s.fullName}","${s.class}","${s.id}","${s.createdAt || ''}"`)
      .join('\n');
    downloadFile('\uFEFF' + headers + rows, `students_directory_${Date.now()}.csv`);
  };

  const exportStudentsJSON = () => {
    downloadFile(JSON.stringify(students, null, 2), `students_${Date.now()}.json`, 'application/json');
  };

  const exportCatalogCSV = () => {
    const headers = 'Инвентарный ID,Название,Автор,Категория,Всего экз,В наличии,Статус\n';
    const rows = books
      .map(
        (b) =>
          `"${b.bookId}","${b.title}","${b.author}","${b.category || ''}","${b.totalCopies || 0}","${
            b.availableCopies || 0
          }","${b.isAvailable ? 'В наличии' : 'Выдана'}"`
      )
      .join('\n');
    downloadFile('\uFEFF' + headers + rows, `library_catalog_${Date.now()}.csv`);
  };

  const exportLoansCSV = () => {
    const headers = 'Книга,Инвентарный ID,Ученик,Класс,Дата выдачи,Срок сдачи,Дата возврата,Статус\n';
    const rows = loans
      .map(
        (l) =>
          `"${l.bookTitle}","${l.bookId}","${l.studentName}","${l.studentClass}","${l.borrowDate || ''}","${
            l.dueDate || ''
          }","${l.returnDate || ''}","${l.isActive ? 'На руках' : 'Сдано'}"`
      )
      .join('\n');
    downloadFile('\uFEFF' + headers + rows, `library_loans_${Date.now()}.csv`);
  };

  // Helper Stats calculations
  const totalBookTitles = books.length;
  const totalBookCopies = books.reduce((s, b) => s + (Number(b.totalCopies) || 0), 0);
  const totalAvailable = books.reduce((s, b) => s + (Number(b.availableCopies) || 0), 0);
  const totalActiveLoans = loans.filter((l) => l.isActive).length;
  const totalOverdueLoans = loans.filter(
    (l) => l.isActive && l.dueDate && new Date(l.dueDate) < new Date()
  ).length;

  const uniqueClasses = ['Все', ...new Set(students.map((s) => s.class).filter(Boolean))].sort();

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.class?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = selectedClassFilter === 'Все' || s.class === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-indigo-600" />
              <span>Главная панель администратора</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Управление персоналом, справочником классов и учеников, глобальный аудит и экспорт
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchLibrarians();
                fetchStudents();
                fetchStatsData();
              }}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
              title="Обновить данные"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Библиотекарей</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{librarians.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Учеников в базе</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{students.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Книжный фонд</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{totalBookCopies} <span className="text-xs text-slate-400 font-normal">экз.</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">В наличии</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{totalAvailable} <span className="text-xs text-slate-400 font-normal">экз.</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Выдано на руки</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{totalActiveLoans}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Должников</p>
            <p className={`text-xl font-bold mt-1 ${totalOverdueLoans > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {totalOverdueLoans}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('librarians')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'librarians'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Доступы библиотекарей</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'librarians' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {librarians.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Справочник учеников и классов</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'students' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'stats'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Статистика и Экспорт</span>
          </button>

          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'books'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Фонд книг (Аудит)</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'books' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {books.length}
            </span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: LIBRARIANS MANAGEMENT */}
        {/* ==================================================== */}
        {activeTab === 'librarians' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Create Librarian Form */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Создать аккаунт библиотекаря</h2>
                    <p className="text-xs text-slate-400">Доступ к приложению lybrary-system-web</p>
                  </div>
                </div>

                {libMessage.text && (
                  <div className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                    libMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {libMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <span>{libMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleCreateLibrarian} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      ФИО библиотекаря *
                    </label>
                    <input
                      type="text"
                      value={newLibName}
                      onChange={(e) => setNewLibName(e.target.value)}
                      placeholder="Смирнова Анна Сергеевна"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Логин или Email *
                    </label>
                    <input
                      type="text"
                      value={newLibEmail}
                      onChange={(e) => setNewLibEmail(e.target.value)}
                      placeholder="librarian1 или anna@school.edu"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Если указать без знака @, система автоматически использует домен @schoollib.local
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Пароль для входа *
                    </label>
                    <input
                      type="password"
                      value={newLibPassword}
                      onChange={(e) => setNewLibPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      minLength={6}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={libCreating}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {libCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    <span>Создать библиотекаря</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Librarians Table */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Действующие библиотекари</h2>
                    <p className="text-xs text-slate-400">Список авторизованных сотрудников школьной библиотеки</p>
                  </div>
                  <span className="text-xs bg-slate-100 font-mono font-bold text-slate-600 px-2.5 py-1 rounded-full">
                    Всего: {librarians.length}
                  </span>
                </div>

                {libLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  </div>
                ) : librarians.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                    Библиотекари пока не созданы. Добавьте первого сотрудника слева.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 px-3">ФИО</th>
                          <th className="pb-3 px-3">Логин / Email</th>
                          <th className="pb-3 px-3">Роль</th>
                          <th className="pb-3 px-3 text-right">Управление</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {librarians.map((lib) => (
                          <tr key={lib.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {lib.fullName}
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-500 font-mono">
                              {lib.email || lib.username}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                Библиотекарь
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDeleteLibrarian(lib)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Удалить доступ"
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
        )}

        {/* ==================================================== */}
        {/* TAB 2: STUDENTS DIRECTORY & CLASS PROMOTION */}
        {/* ==================================================== */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            
            {/* Controls Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Search & Filter */}
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Поиск ученика по ФИО или классу..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Класс:</span>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none bg-white"
                    >
                      {uniqueClasses.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    <FolderInput className="w-4 h-4" />
                    <span>Массовый ввод учеников</span>
                  </button>

                  <button
                    onClick={() => setShowPromotionModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Перевод на след. год</span>
                  </button>
                </div>

              </div>

              {/* Quick Single Add Row */}
              <form onSubmit={handleAddSingleStudent} className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-700 shrink-0">Добавить ученика:</span>
                <input
                  type="text"
                  value={singleStudentName}
                  onChange={(e) => setSingleStudentName(e.target.value)}
                  placeholder="ФИО ученика (например, Иванов Иван)"
                  required
                  className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input
                  type="text"
                  value={singleStudentClass}
                  onChange={(e) => setSingleStudentClass(e.target.value)}
                  placeholder="Класс (9-A)"
                  required
                  className="w-28 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={studentAdding}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {studentAdding ? 'Сохранение...' : '+ Добавить'}
                </button>
              </form>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  Найдено записей: {filteredStudents.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportStudentsCSV}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Экспорт CSV
                  </button>
                </div>
              </div>

              {studentsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Ученики не найдены. Добавьте записи вручную или через массовый ввод.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 px-4">ФИО Ученика</th>
                        <th className="pb-3 px-4">Класс</th>
                        <th className="pb-3 px-4">ID записи</th>
                        <th className="pb-3 px-4 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {st.fullName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-bold">
                              {st.class}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                            {st.id}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingStudent(st)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                                title="Редактировать"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(st)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: STATS & DATA EXPORT */}
        {/* ==================================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-800 mb-1">Экспорт данных и архивация</h2>
              <p className="text-xs text-slate-400 mb-6">
                Выгрузка полной базы данных в структурированные форматы CSV и JSON для резервных копий и отчетов
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Export 1: Books */}
                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">Каталог книжного фонда</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {books.length} наименований ({totalBookCopies} экземпляров)
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                    <button
                      onClick={exportCatalogCSV}
                      className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Скачать CSV</span>
                    </button>
                  </div>
                </div>

                {/* Export 2: Students */}
                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">Справочник учеников</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {students.length} активных учеников по всем классам
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                    <button
                      onClick={exportStudentsCSV}
                      className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={exportStudentsJSON}
                      className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>

                {/* Export 3: Loans */}
                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">Журнал выдач и возвратов</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {loans.length} записей (включая историю должников)
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                    <button
                      onClick={exportLoansCSV}
                      className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Скачать CSV</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: BOOKS AUDIT (ФОНД КНИГ) */}
        {/* ==================================================== */}
        {activeTab === 'books' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-800">Аудит книжного фонда</h2>
                <p className="text-xs text-slate-400">Глобальный обзор всех книг библиотеки</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                Всего наименований: {books.length}
              </span>
            </div>

            {books.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Книг в каталоге пока нет. Библиотекарь может добавить их через панель lybrary-system-web.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Инв. ID</th>
                      <th className="pb-3 px-3">Название книги</th>
                      <th className="pb-3 px-3">Автор</th>
                      <th className="pb-3 px-3">Категория</th>
                      <th className="pb-3 px-3 text-center">Всего экз.</th>
                      <th className="pb-3 px-3 text-center">В наличии</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {books.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono text-xs font-bold text-slate-500">
                          {b.bookId}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {b.title}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600">
                          {b.author}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500">
                          {b.category}
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-bold text-slate-700">
                          {b.totalCopies}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            (b.availableCopies || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {b.availableCopies}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* MODAL: BULK ADD STUDENTS */}
      {/* ==================================================== */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderInput className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">Массовый ввод учеников</h3>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAddStudents} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Класс (например, 9-A) *
                </label>
                <input
                  type="text"
                  value={bulkClass}
                  onChange={(e) => setBulkClass(e.target.value)}
                  placeholder="9-A"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Список ФИО (по одному в строке) *
                </label>
                <textarea
                  rows={8}
                  value={bulkNamesText}
                  onChange={(e) => setBulkNamesText(e.target.value)}
                  placeholder="Алиев Тимур&#10;Бондаренко Дарья&#10;Волков Сергей..."
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Скопируйте и вставьте список фамилий и имен из Excel или Word
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Добавить список</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CLASS PROMOTION (ПЕРЕВОД КЛАССОВ) */}
      {/* ==================================================== */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-800">Перевод на след. учебный год</h3>
              </div>
              <button onClick={() => setShowPromotionModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoteClass} className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900">
                Эта операция изменит класс у всех учеников выбранного класса одновременно.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Из какого класса:
                </label>
                <select
                  value={promoFromClass}
                  onChange={(e) => setPromoFromClass(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white font-semibold"
                >
                  <option value="">-- Выберите исходный класс --</option>
                  {uniqueClasses.filter((c) => c !== 'Все').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  В какой класс перевести:
                </label>
                <input
                  type="text"
                  value={promoToClass}
                  onChange={(e) => setPromoToClass(e.target.value)}
                  placeholder="например, 9-A или Выпускник"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPromotionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={promoLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {promoLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Выполнить перевод</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT STUDENT */}
      {/* ==================================================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">Редактирование ученика</h3>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  ФИО ученика *
                </label>
                <input
                  type="text"
                  value={editingStudent.fullName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Класс *
                </label>
                <input
                  type="text"
                  value={editingStudent.class}
                  onChange={(e) => setEditingStudent({ ...editingStudent, class: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={editStudentLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editStudentLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
