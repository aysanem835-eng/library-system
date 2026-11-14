import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
  Library,
  BookPlus,
  ArrowRightLeft,
  RotateCcw,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  User,
  GraduationCap,
  Calendar,
  Filter,
  History,
  Edit2,
  Trash2,
  X,
  BookOpen,
  Package,
  Layers,
  ChevronDown
} from 'lucide-react';

export default function LibrarianDashboard() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('issue'); // 'issue', 'catalog', 'debtors', 'history'

  // Books state
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [bookSearch, setBookSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');

  // Loans state (real-time snapshot)
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loanSearch, setLoanSearch] = useState('');

  // Students Directory state
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Issue Form State
  const [issueStudentQuery, setIssueStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [customStudentName, setCustomStudentName] = useState('');
  const [customStudentClass, setCustomStudentClass] = useState('');
  const [useCustomStudent, setUseCustomStudent] = useState(false);

  const [issueBookQuery, setIssueBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueDays, setDueDays] = useState(14);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueMessage, setIssueMessage] = useState({ type: '', text: '' });

  // Add Book Form State
  const [newBook, setNewBook] = useState({
    bookId: '',
    title: '',
    author: '',
    category: '',
    totalCopies: 1,
  });
  const [addBookLoading, setAddBookLoading] = useState(false);
  const [addBookMessage, setAddBookMessage] = useState({ type: '', text: '' });
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit Book State
  const [editingBook, setEditingBook] = useState(null);
  const [editBookLoading, setEditBookLoading] = useState(false);

  // Debtors Filter State
  const [debtorClassFilter, setDebtorClassFilter] = useState('Все');

  // Return Action State
  const [returnActionLoadingId, setReturnActionLoadingId] = useState(null);

  // 1. Fetch Books
  const fetchBooks = async () => {
    setBooksLoading(true);
    try {
      const snap = await getDocs(collection(db, 'books'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBooks(list);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setBooksLoading(false);
    }
  };

  // 2. Fetch Students Directory
  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'students_directory'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStudents(list);
    } catch (err) {
      console.error('Error fetching students directory:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // 3. Real-time Loans Listener
  useEffect(() => {
    fetchBooks();
    fetchStudents();

    const q = query(collection(db, 'loans'), orderBy('borrowDate', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setLoans(list);
        setLoansLoading(false);
      },
      (error) => {
        console.error('Loans snapshot error:', error);
        setLoansLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isOverdue = (dueDate, isActive) => {
    if (!isActive || !dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysOverdue = (dueDate) => {
    const diff = new Date().getTime() - new Date(dueDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  // Stats
  const activeLoans = loans.filter((l) => l.isActive);
  const overdueLoans = activeLoans.filter((l) => isOverdue(l.dueDate, l.isActive));
  const totalBookCopies = books.reduce((sum, b) => sum + (Number(b.totalCopies) || 0), 0);
  const availableCopies = books.reduce((sum, b) => sum + (Number(b.availableCopies) || 0), 0);
  const categories = ['Все', ...new Set(books.map((b) => b.category).filter(Boolean))];
  const studentClasses = ['Все', ...new Set(students.map((s) => s.class).filter(Boolean))].sort();

  // =====================
  // ISSUE BOOK HANDLER
  // =====================
  const handleIssueBook = async (e) => {
    e.preventDefault();
    setIssueMessage({ type: '', text: '' });

    const studentName = useCustomStudent ? customStudentName.trim() : selectedStudent?.fullName;
    const studentClass = useCustomStudent ? customStudentClass.trim() : selectedStudent?.class;

    if (!studentName || !studentClass) {
      setIssueMessage({ type: 'error', text: 'Пожалуйста, выберите или укажите ученика и его класс' });
      return;
    }

    if (!selectedBook) {
      setIssueMessage({ type: 'error', text: 'Пожалуйста, выберите доступную книгу' });
      return;
    }

    if (selectedBook.availableCopies <= 0) {
      setIssueMessage({ type: 'error', text: 'Выбранной книги нет в наличии' });
      return;
    }

    setIssueLoading(true);

    try {
      const borrowDate = new Date().toISOString();
      const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString();

      const newLoanData = {
        bookId: selectedBook.bookId,
        bookTitle: selectedBook.title,
        bookAuthor: selectedBook.author,
        studentName,
        studentClass,
        studentId: selectedStudent?.id || null,
        borrowDate,
        dueDate,
        returnDate: null,
        isActive: true,
        issuedBy: userData?.fullName || userData?.email || 'Библиотекарь',
      };

      // 1. Create loan record in 'loans' collection
      await addDoc(collection(db, 'loans'), newLoanData);

      // 2. Decrement availableCopies in 'books'
      const bookRef = doc(db, 'books', selectedBook.id);
      const newAvailable = Math.max(0, (selectedBook.availableCopies || 0) - 1);
      await updateDoc(bookRef, {
        availableCopies: newAvailable,
        isAvailable: newAvailable > 0,
      });

      // Update local books state
      setBooks((prev) =>
        prev.map((b) =>
          b.id === selectedBook.id
            ? { ...b, availableCopies: newAvailable, isAvailable: newAvailable > 0 }
            : b
        )
      );

      setIssueMessage({
        type: 'success',
        text: `Книга "${selectedBook.title}" успешно выдана ученику ${studentName} (${studentClass}) на ${dueDays} дн.`,
      });

      // Reset form
      setSelectedBook(null);
      setSelectedStudent(null);
      setIssueStudentQuery('');
      setIssueBookQuery('');
      setCustomStudentName('');
      setCustomStudentClass('');
      setUseCustomStudent(false);
    } catch (err) {
      console.error('Error issuing book:', err);
      setIssueMessage({ type: 'error', text: `Ошибка выдачи: ${err.message}` });
    } finally {
      setIssueLoading(false);
    }
  };

  // =====================
  // RETURN BOOK HANDLER
  // =====================
  const handleReturnBook = async (loan) => {
    if (!loan || !loan.isActive) return;
    setReturnActionLoadingId(loan.id);

    try {
      const returnDate = new Date().toISOString();

      // 1. Mark loan as inactive in 'loans' collection
      const loanRef = doc(db, 'loans', loan.id);
      await updateDoc(loanRef, {
        isActive: false,
        returnDate,
        returnedBy: userData?.fullName || 'Библиотекарь',
      });

      // 2. Increment availableCopies in 'books'
      // Match by bookId field or document id
      const matchedBook = books.find((b) => b.bookId === loan.bookId || b.id === loan.bookId);
      if (matchedBook) {
        const bookRef = doc(db, 'books', matchedBook.id);
        const newAvailable = (matchedBook.availableCopies || 0) + 1;
        await updateDoc(bookRef, {
          availableCopies: newAvailable,
          isAvailable: true,
        });

        // Update local books state
        setBooks((prev) =>
          prev.map((b) =>
            b.id === matchedBook.id
              ? { ...b, availableCopies: newAvailable, isAvailable: true }
              : b
          )
        );
      }
    } catch (err) {
      console.error('Error returning book:', err);
      alert(`Ошибка при возврате: ${err.message}`);
    } finally {
      setReturnActionLoadingId(null);
    }
  };

  // =====================
  // ADD BOOK HANDLER
  // =====================
  const handleAddBook = async (e) => {
    e.preventDefault();
    setAddBookMessage({ type: '', text: '' });
    setAddBookLoading(true);

    try {
      const bookId = newBook.bookId.trim() || `BK-${Date.now().toString().slice(-6)}`;
      const copies = Math.max(1, parseInt(newBook.totalCopies) || 1);

      // Check if bookId already exists
      const existing = books.find((b) => b.bookId.toLowerCase() === bookId.toLowerCase());
      if (existing) {
        setAddBookMessage({ type: 'error', text: `Книга с номером ID "${bookId}" уже существует` });
        setAddBookLoading(false);
        return;
      }

      const bookData = {
        bookId,
        title: newBook.title.trim(),
        author: newBook.author.trim(),
        category: newBook.category.trim() || 'Художественная литература',
        totalCopies: copies,
        availableCopies: copies,
        isAvailable: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'books', bookId), bookData);

      setBooks((prev) => [...prev, { id: bookId, ...bookData }]);
      setAddBookMessage({ type: 'success', text: `Книга "${newBook.title}" успешно добавлена в фонд` });
      setNewBook({ bookId: '', title: '', author: '', category: '', totalCopies: 1 });
      setTimeout(() => setShowAddModal(false), 1200);
    } catch (err) {
      console.error('Error adding book:', err);
      setAddBookMessage({ type: 'error', text: `Ошибка: ${err.message}` });
    } finally {
      setAddBookLoading(false);
    }
  };

  // =====================
  // EDIT BOOK HANDLER
  // =====================
  const handleSaveEditBook = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    setEditBookLoading(true);

    try {
      const bookRef = doc(db, 'books', editingBook.id);
      const totalCopies = Math.max(0, parseInt(editingBook.totalCopies) || 0);
      const availableCopies = Math.max(0, parseInt(editingBook.availableCopies) || 0);

      const updated = {
        title: editingBook.title.trim(),
        author: editingBook.author.trim(),
        category: editingBook.category.trim(),
        totalCopies,
        availableCopies,
        isAvailable: availableCopies > 0,
      };

      await updateDoc(bookRef, updated);

      setBooks((prev) =>
        prev.map((b) => (b.id === editingBook.id ? { ...b, ...updated } : b))
      );
      setEditingBook(null);
    } catch (err) {
      console.error('Error editing book:', err);
      alert(`Ошибка: ${err.message}`);
    } finally {
      setEditBookLoading(false);
    }
  };

  // =====================
  // DELETE BOOK HANDLER
  // =====================
  const handleDeleteBook = async (book) => {
    if (!window.confirm(`Вы уверены, что хотите удалить книгу "${book.title}" из каталога?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'books', book.id));
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (err) {
      console.error('Error deleting book:', err);
      alert(`Ошибка при удалении: ${err.message}`);
    }
  };

  // Filtered Lists
  const filteredStudents = students.filter((s) => {
    const q = issueStudentQuery.toLowerCase();
    return s.fullName?.toLowerCase().includes(q) || s.class?.toLowerCase().includes(q);
  });

  const availableBooksForIssue = books.filter((b) => {
    if (b.availableCopies <= 0) return false;
    const q = issueBookQuery.toLowerCase();
    return (
      b.title?.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q) ||
      b.bookId?.toLowerCase().includes(q)
    );
  });

  const filteredBooksInCatalog = books.filter((b) => {
    const matchesSearch =
      b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.author?.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.bookId?.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.category?.toLowerCase().includes(bookSearch.toLowerCase());

    const matchesCategory = selectedCategory === 'Все' || b.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const filteredActiveLoans = activeLoans.filter((l) => {
    const q = loanSearch.toLowerCase();
    return (
      l.studentName?.toLowerCase().includes(q) ||
      l.studentClass?.toLowerCase().includes(q) ||
      l.bookTitle?.toLowerCase().includes(q) ||
      l.bookId?.toLowerCase().includes(q)
    );
  });

  const filteredDebtors = overdueLoans.filter((l) => {
    if (debtorClassFilter !== 'Все' && l.studentClass !== debtorClassFilter) return false;
    const q = loanSearch.toLowerCase();
    return (
      l.studentName?.toLowerCase().includes(q) ||
      l.studentClass?.toLowerCase().includes(q) ||
      l.bookTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Top Header & Fast Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Рабочий кабинет библиотекаря</h1>
            <p className="text-sm text-slate-500 mt-1">
              Учет книжного фонда, оперативная выдача, прием возвратов и контроль должников
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <BookPlus className="w-4 h-4" />
              <span>Добавить книгу</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{books.length}</p>
              <p className="text-xs text-slate-500 font-medium">Наименований книг</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{availableCopies} / {totalBookCopies}</p>
              <p className="text-xs text-slate-500 font-medium">В наличии / Всего экз.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{activeLoans.length}</p>
              <p className="text-xs text-slate-500 font-medium">Книг сейчас на руках</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              overdueLoans.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${overdueLoans.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {overdueLoans.length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Просроченных выдач</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'issue'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Выдача и возврат</span>
            {activeLoans.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'issue' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {activeLoans.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>Каталог фонда</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'catalog' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {books.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debtors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'debtors'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Должники</span>
            {overdueLoans.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'debtors' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-700'
              }`}>
                {overdueLoans.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>История всех выдач</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: ISSUE & RETURN */}
        {/* ==================================================== */}
        {activeTab === 'issue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Issue Book Form (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Выдать книгу ученику</h2>
                    <p className="text-xs text-slate-400">Выберите ученика из справочника и доступную книгу</p>
                  </div>
                </div>

                {issueMessage.text && (
                  <div className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                    issueMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {issueMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    )}
                    <span>{issueMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleIssueBook} className="space-y-4">
                  {/* Step 1: Student Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        1. Ученик / Читатель
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomStudent(!useCustomStudent);
                          setSelectedStudent(null);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                      >
                        {useCustomStudent ? 'Выбрать из справочника' : 'Ввести вручную'}
                      </button>
                    </div>

                    {!useCustomStudent ? (
                      selectedStudent ? (
                        <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                          <div className="flex items-center gap-2.5">
                            <GraduationCap className="w-5 h-5 text-indigo-600" />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{selectedStudent.fullName}</p>
                              <p className="text-xs text-indigo-700">Класс: {selectedStudent.class}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(null)}
                            className="text-xs text-slate-400 hover:text-red-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={issueStudentQuery}
                            onChange={(e) => setIssueStudentQuery(e.target.value)}
                            placeholder="Поиск ученика по ФИО или классу..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                          {issueStudentQuery.trim().length > 0 && (
                            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                              {filteredStudents.length > 0 ? (
                                filteredStudents.slice(0, 10).map((s) => (
                                  <div
                                    key={s.id}
                                    onClick={() => {
                                      setSelectedStudent(s);
                                      setIssueStudentQuery('');
                                    }}
                                    className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                                  >
                                    <span className="font-medium text-slate-800">{s.fullName}</span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">{s.class}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="p-3 text-xs text-slate-400 text-center">
                                  Ученик не найден в справочнике.{' '}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUseCustomStudent(true);
                                      setCustomStudentName(issueStudentQuery);
                                    }}
                                    className="text-indigo-600 font-medium underline"
                                  >
                                    Ввести вручную
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={customStudentName}
                            onChange={(e) => setCustomStudentName(e.target.value)}
                            placeholder="ФИО ученика"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            required={useCustomStudent}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={customStudentClass}
                            onChange={(e) => setCustomStudentClass(e.target.value)}
                            placeholder="Класс (9-A)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            required={useCustomStudent}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Book Selection */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      2. Книга из фонда
                    </label>

                    {selectedBook ? (
                      <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{selectedBook.title}</p>
                          <p className="text-xs text-emerald-800">
                            {selectedBook.author} · № {selectedBook.bookId} (В наличии: {selectedBook.availableCopies} экз.)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedBook(null)}
                          className="text-xs text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={issueBookQuery}
                          onChange={(e) => setIssueBookQuery(e.target.value)}
                          placeholder="Поиск книги по названию, автору или номеру..."
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        {issueBookQuery.trim().length > 0 && (
                          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {availableBooksForIssue.length > 0 ? (
                              availableBooksForIssue.slice(0, 10).map((b) => (
                                <div
                                  key={b.id}
                                  onClick={() => {
                                    setSelectedBook(b);
                                    setIssueBookQuery('');
                                  }}
                                  className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-slate-800">{b.title}</p>
                                    <p className="text-slate-400">{b.author} · № {b.bookId}</p>
                                  </div>
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                                    {b.availableCopies} экз.
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-xs text-slate-400 text-center">
                                Доступных экземпляров не найдено
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Loan Duration */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      3. Срок выдачи
                    </label>
                    <div className="flex items-center gap-2">
                      {[7, 14, 21, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setDueDays(days)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            dueDays === days
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {days} дн.
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={issueLoading || !selectedBook || (!selectedStudent && (!customStudentName || !customStudentClass))}
                    className="w-full mt-3 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {issueLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="w-4 h-4" />
                    )}
                    <span>Оформить выдачу</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Active Loans & Quick Return (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Книги на руках (Активные выдачи)</h2>
                    <p className="text-xs text-slate-400">Быстрый прием возвратов и контроль сроков сдачи</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={loanSearch}
                      onChange={(e) => setLoanSearch(e.target.value)}
                      placeholder="Поиск по ученику, классу, книге..."
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {loansLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  </div>
                ) : filteredActiveLoans.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Все книги на месте!</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {loanSearch ? 'По вашему запросу ничего не найдено' : 'Сейчас нет активных выдач на руках'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActiveLoans.map((loan) => {
                      const overdue = isOverdue(loan.dueDate, loan.isActive);
                      const daysOverdue = overdue ? getDaysOverdue(loan.dueDate) : 0;
                      const isReturning = returnActionLoadingId === loan.id;

                      return (
                        <div
                          key={loan.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            overdue
                              ? 'bg-red-50/40 border-red-200'
                              : 'bg-white border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-800">{loan.bookTitle}</span>
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                № {loan.bookId}
                              </span>
                              {overdue ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  Просрочено на {daysOverdue} дн.
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  На руках
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                <User className="w-3.5 h-3.5 text-indigo-500" />
                                {loan.studentName} ({loan.studentClass})
                              </span>
                              <span>Выдано: {formatDate(loan.borrowDate)}</span>
                              <span className={overdue ? 'font-bold text-red-600' : ''}>
                                Срок: {formatDate(loan.dueDate)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleReturnBook(loan)}
                            disabled={isReturning}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                          >
                            {isReturning ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Принять возврат</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: BOOK CATALOG */}
        {/* ==================================================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    placeholder="Поиск по названию, автору, инвентарному номеру ID или предмету..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  <span className="text-xs text-slate-400 uppercase font-semibold shrink-0">Категория:</span>
                  {categories.slice(0, 6).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {booksLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : filteredBooksInCatalog.length === 0 ? (
                <div className="text-center py-16">
                  <Library className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-semibold text-slate-700">Книги не найдены</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {bookSearch ? 'Попробуйте изменить поисковый запрос' : 'Фонд библиотеки пуст. Добавьте первую книгу.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 px-4">№ ID</th>
                        <th className="pb-3 px-4">Название книги</th>
                        <th className="pb-3 px-4">Автор</th>
                        <th className="pb-3 px-4">Категория</th>
                        <th className="pb-3 px-4 text-center">Наличие (экз.)</th>
                        <th className="pb-3 px-4 text-center">Статус</th>
                        <th className="pb-3 px-4 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBooksInCatalog.map((book) => {
                        const inStock = (book.availableCopies || 0) > 0;
                        return (
                          <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">
                              {book.bookId}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800">
                              {book.title}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 text-xs">
                              {book.author}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                                {book.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="text-xs font-bold text-slate-700">
                                {book.availableCopies} <span className="text-slate-400 font-normal">/ {book.totalCopies}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {inStock ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  В наличии
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
                                  <AlertCircle className="w-3 h-3" />
                                  Все выданы
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingBook(book)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                                  title="Редактировать"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBook(book)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: DEBTORS (ДОЛЖНИКИ) */}
        {/* ==================================================== */}
        {activeTab === 'debtors' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Список должников (Просроченные книги)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Автоматическая фильтрация по просроченной дате возврата
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase">Класс:</span>
                <select
                  value={debtorClassFilter}
                  onChange={(e) => setDebtorClassFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                >
                  {studentClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredDebtors.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-800">Задолженностей нет!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Все книги сдаются вовремя или просроченные возвраты отсутствуют.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-4">Ученик</th>
                      <th className="pb-3 px-4">Класс</th>
                      <th className="pb-3 px-4">Книга</th>
                      <th className="pb-3 px-4">Дата выдачи</th>
                      <th className="pb-3 px-4">Срок возврата</th>
                      <th className="pb-3 px-4 text-center">Просрочка</th>
                      <th className="pb-3 px-4 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDebtors.map((loan) => {
                      const days = getDaysOverdue(loan.dueDate);
                      const isReturning = returnActionLoadingId === loan.id;
                      return (
                        <tr key={loan.id} className="hover:bg-red-50/30 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {loan.studentName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">
                              {loan.studentClass}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 text-xs font-semibold">
                            {loan.bookTitle}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {formatDate(loan.borrowDate)}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold text-red-600">
                            {formatDate(loan.dueDate)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleReturnBook(loan)}
                              disabled={isReturning}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                            >
                              {isReturning ? 'Прием...' : 'Принять'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: LOAN HISTORY */}
        {/* ==================================================== */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">Полный журнал выдач и возвратов</h2>
                <p className="text-xs text-slate-400">Архив всех записей об аренде книг библиотеки</p>
              </div>
              <div className="text-xs text-slate-500">
                Всего записей: <span className="font-bold text-slate-800">{loans.length}</span>
              </div>
            </div>

            {loans.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Журнал пока пуст
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-4">Книга</th>
                      <th className="pb-3 px-4">Читатель</th>
                      <th className="pb-3 px-4">Класс</th>
                      <th className="pb-3 px-4">Дата выдачи</th>
                      <th className="pb-3 px-4">Срок сдачи</th>
                      <th className="pb-3 px-4">Дата возврата</th>
                      <th className="pb-3 px-4 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800 text-xs">
                          {loan.bookTitle}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-xs">
                          {loan.studentName}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            {loan.studentClass}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {formatDate(loan.borrowDate)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {formatDate(loan.dueDate)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {formatDate(loan.returnDate)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {loan.isActive ? (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                              На руках
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              Сдано
                            </span>
                          )}
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
      {/* MODAL: ADD NEW BOOK */}
      {/* ==================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">Новая книга в фонд</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addBookMessage.text && (
              <div className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                addBookMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {addBookMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span>{addBookMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Инвентарный номер / ID
                </label>
                <input
                  type="text"
                  value={newBook.bookId}
                  onChange={(e) => setNewBook({ ...newBook, bookId: e.target.value })}
                  placeholder="BK-001 (или оставьте пустым для автогенерации)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Название книги *
                </label>
                <input
                  type="text"
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  placeholder="например, Капитанская дочка"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Автор *
                  </label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    placeholder="А.С. Пушкин"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Категория / Предмет
                  </label>
                  <input
                    type="text"
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    placeholder="Литература"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Количество экземпляров *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newBook.totalCopies}
                  onChange={(e) => setNewBook({ ...newBook, totalCopies: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={addBookLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addBookLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Сохранить книгу</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT BOOK */}
      {/* ==================================================== */}
      {editingBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">Редактирование книги</h3>
              </div>
              <button
                onClick={() => setEditingBook(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Название книги *
                </label>
                <input
                  type="text"
                  value={editingBook.title}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Автор *
                  </label>
                  <input
                    type="text"
                    value={editingBook.author}
                    onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={editingBook.category}
                    onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Всего экземпляров
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBook.totalCopies}
                    onChange={(e) => setEditingBook({ ...editingBook, totalCopies: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    В наличии
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBook.availableCopies}
                    onChange={(e) => setEditingBook({ ...editingBook, availableCopies: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={editBookLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editBookLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Сохранить изменения</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
