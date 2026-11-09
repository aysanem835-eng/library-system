import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  BookPlus,
  BookOpen,
  RotateCcw,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Library,
  Users,
  ArrowRightLeft,
  Package,
  Hash,
  AlertTriangle,
} from 'lucide-react';

export default function LibrarianDashboard() {
  const [activeTab, setActiveTab] = useState('catalog');

  // Catalog state
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [bookSearch, setBookSearch] = useState('');

  // Add book state
  const [newBook, setNewBook] = useState({
    bookId: '',
    title: '',
    author: '',
    category: '',
    totalCopies: 1,
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState({ type: '', text: '' });

  // Issue state
  const [issueUserSearch, setIssueUserSearch] = useState('');
  const [issueBookSearch, setIssueBookSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueDays, setDueDays] = useState(14);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueMessage, setIssueMessage] = useState({ type: '', text: '' });

  // Return state
  const [returnUserSearch, setReturnUserSearch] = useState('');
  const [returnFoundUsers, setReturnFoundUsers] = useState([]);
  const [returnSelectedUser, setReturnSelectedUser] = useState(null);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnMessage, setReturnMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setBooksLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'books'));
      setBooks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setBooksLoading(false);
    }
  };

  // -------- ADD BOOK --------
  const handleAddBook = async (e) => {
    e.preventDefault();
    setAddMessage({ type: '', text: '' });
    setAddLoading(true);

    try {
      const bookId = newBook.bookId.trim() || `BK-${Date.now()}`;

      const existingDoc = await getDoc(doc(db, 'books', bookId));
      if (existingDoc.exists()) {
        setAddMessage({ type: 'error', text: 'Книга с таким ID уже существует' });
        setAddLoading(false);
        return;
      }

      const copies = parseInt(newBook.totalCopies) || 1;
      await setDoc(doc(db, 'books', bookId), {
        bookId,
        title: newBook.title.trim(),
        author: newBook.author.trim(),
        category: newBook.category.trim(),
        totalCopies: copies,
        availableCopies: copies,
        isAvailable: true,
      });

      setAddMessage({ type: 'success', text: `Книга "${newBook.title}" добавлена (ID: ${bookId})` });
      setNewBook({ bookId: '', title: '', author: '', category: '', totalCopies: 1 });
      fetchBooks();
    } catch (error) {
      console.error('Error adding book:', error);
      setAddMessage({ type: 'error', text: `Ошибка: ${error.message}` });
    } finally {
      setAddLoading(false);
    }
  };

  // -------- ISSUE BOOK --------
  const searchUsers = async (term, setter) => {
    if (term.length < 2) {
      setter([]);
      return;
    }
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(term.toLowerCase()) ||
          u.username?.toLowerCase().includes(term.toLowerCase())
      );
      setter(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(issueUserSearch, setFoundUsers), 300);
    return () => clearTimeout(timer);
  }, [issueUserSearch]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(returnUserSearch, setReturnFoundUsers), 300);
    return () => clearTimeout(timer);
  }, [returnUserSearch]);

  const availableBooks = books.filter((b) => {
    if (b.availableCopies <= 0) return false;
    const term = issueBookSearch.toLowerCase();
    if (!term) return true;
    return (
      b.title?.toLowerCase().includes(term) ||
      b.author?.toLowerCase().includes(term) ||
      b.bookId?.toLowerCase().includes(term)
    );
  });

  const handleIssue = async () => {
    if (!selectedUser || !selectedBook) return;
    setIssueMessage({ type: '', text: '' });
    setIssueLoading(true);

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      const userSnap = await getDoc(userRef);
      const currentUserData = userSnap.data();

      const borrowDate = new Date().toISOString();
      const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString();

      const historyEntry = {
        bookId: selectedBook.bookId,
        bookTitle: selectedBook.title,
        borrowDate,
        dueDate,
        returnDate: null,
        isActive: true,
      };

      const updatedHistory = [...(currentUserData.history || []), historyEntry];
      await updateDoc(userRef, { history: updatedHistory });

      const bookRef = doc(db, 'books', selectedBook.bookId);
      const bookSnap = await getDoc(bookRef);
      const bookData = bookSnap.data();
      const newAvailable = Math.max(0, (bookData.availableCopies || 0) - 1);
      await updateDoc(bookRef, {
        availableCopies: newAvailable,
        isAvailable: newAvailable > 0,
      });

      setIssueMessage({
        type: 'success',
        text: `"${selectedBook.title}" выдана пользователю ${selectedUser.fullName}`,
      });
      setSelectedUser(null);
      setSelectedBook(null);
      setIssueUserSearch('');
      setIssueBookSearch('');
      setFoundUsers([]);
      fetchBooks();
    } catch (error) {
      console.error('Error issuing book:', error);
      setIssueMessage({ type: 'error', text: `Ошибка: ${error.message}` });
    } finally {
      setIssueLoading(false);
    }
  };

  // -------- RETURN BOOK --------
  const handleSelectReturnUser = async (user) => {
    const userRef = doc(db, 'users', user.id);
    const userSnap = await getDoc(userRef);
    const freshData = userSnap.data();
    setReturnSelectedUser({ ...user, ...freshData });
    setReturnUserSearch('');
    setReturnFoundUsers([]);
  };

  const handleReturn = async (historyIndex) => {
    if (!returnSelectedUser) return;
    setReturnMessage({ type: '', text: '' });
    setReturnLoading(true);

    try {
      const userRef = doc(db, 'users', returnSelectedUser.id);
      const userSnap = await getDoc(userRef);
      const currentData = userSnap.data();
      const updatedHistory = [...currentData.history];
      const entry = updatedHistory[historyIndex];

      if (!entry || !entry.isActive) {
        setReturnMessage({ type: 'error', text: 'Эта книга уже возвращена' });
        setReturnLoading(false);
        return;
      }

      updatedHistory[historyIndex] = {
        ...entry,
        isActive: false,
        returnDate: new Date().toISOString(),
      };

      await updateDoc(userRef, { history: updatedHistory });

      const bookRef = doc(db, 'books', entry.bookId);
      const bookSnap = await getDoc(bookRef);
      if (bookSnap.exists()) {
        const bookData = bookSnap.data();
        await updateDoc(bookRef, {
          availableCopies: (bookData.availableCopies || 0) + 1,
          isAvailable: true,
        });
      }

      setReturnMessage({
        type: 'success',
        text: `"${entry.bookTitle}" принята от ${returnSelectedUser.fullName}`,
      });

      // Refresh user data
      const refreshedSnap = await getDoc(userRef);
      setReturnSelectedUser({ ...returnSelectedUser, ...refreshedSnap.data() });
      fetchBooks();
    } catch (error) {
      console.error('Error returning book:', error);
      setReturnMessage({ type: 'error', text: `Ошибка: ${error.message}` });
    } finally {
      setReturnLoading(false);
    }
  };

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

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredBooks = books.filter((b) => {
    const term = bookSearch.toLowerCase();
    if (!term) return true;
    return (
      b.title?.toLowerCase().includes(term) ||
      b.author?.toLowerCase().includes(term) ||
      b.bookId?.toLowerCase().includes(term) ||
      b.category?.toLowerCase().includes(term)
    );
  });

  // Message component
  const MessageBox = ({ message }) => {
    if (!message.text) return null;
    return (
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
    );
  };

  const tabs = [
    { id: 'catalog', label: 'Каталог', icon: <Library className="w-4 h-4" /> },
    { id: 'add', label: 'Добавить книгу', icon: <BookPlus className="w-4 h-4" /> },
    { id: 'issue', label: 'Выдать книгу', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { id: 'return', label: 'Принять возврат', icon: <RotateCcw className="w-4 h-4" /> },
  ];

  // Stats
  const totalBooks = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);
  const availableTotal = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
  const issuedTotal = totalBooks - availableTotal;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Library className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{books.length}</p>
                <p className="text-xs text-slate-500">Наименований</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{availableTotal}</p>
                <p className="text-xs text-slate-500">В наличии (экз.)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{issuedTotal}</p>
                <p className="text-xs text-slate-500">На руках (экз.)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-slate-200 w-fit overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* CATALOG TAB */}
        {activeTab === 'catalog' && (
          <div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="w-full max-w-md pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                placeholder="Поиск по названию, автору, ID или категории..."
              />
            </div>

            {booksLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <Library className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">
                  {bookSearch ? 'Книги не найдены' : 'Каталог пуст. Добавьте первую книгу.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Название</th>
                      <th className="px-6 py-3">Автор</th>
                      <th className="px-6 py-3">Категория</th>
                      <th className="px-6 py-3">Экземпляры</th>
                      <th className="px-6 py-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{book.bookId}</code>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{book.title}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{book.author}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{book.category}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {book.availableCopies} / {book.totalCopies}
                        </td>
                        <td className="px-6 py-4">
                          {book.availableCopies > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              В наличии
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              Все выданы
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

        {/* ADD BOOK TAB */}
        {activeTab === 'add' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <BookPlus className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-800">Добавить книгу</h2>
              </div>

              <MessageBox message={addMessage} />

              <form onSubmit={handleAddBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Инвентарный номер / ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={newBook.bookId}
                      onChange={(e) => setNewBook({ ...newBook, bookId: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="BK-001 (оставьте пустым для авто-генерации)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
                  <input
                    type="text"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Война и мир"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Автор</label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Лев Толстой"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Категория / Жанр</label>
                  <input
                    type="text"
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Литература"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Количество экземпляров</label>
                  <input
                    type="number"
                    min="1"
                    value={newBook.totalCopies}
                    onChange={(e) => setNewBook({ ...newBook, totalCopies: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookPlus className="w-4 h-4" />
                  )}
                  {addLoading ? 'Добавление...' : 'Добавить книгу'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ISSUE BOOK TAB */}
        {activeTab === 'issue' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-800">Выдать книгу</h2>
              </div>

              <MessageBox message={issueMessage} />

              <div className="space-y-6">
                {/* User selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Пользователь</label>
                  {selectedUser ? (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{selectedUser.fullName}</p>
                        <p className="text-xs text-slate-500">@{selectedUser.username} · {selectedUser.class}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedUser(null); setIssueUserSearch(''); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Изменить
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={issueUserSearch}
                        onChange={(e) => setIssueUserSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="Поиск по имени или логину..."
                      />
                      {foundUsers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {foundUsers.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => { setSelectedUser(u); setIssueUserSearch(''); setFoundUsers([]); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">{u.fullName}</p>
                                <p className="text-xs text-slate-500">@{u.username}</p>
                              </div>
                              <span className="text-xs text-slate-400">{u.class}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Book selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Книга</label>
                  {selectedBook ? (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{selectedBook.title}</p>
                        <p className="text-xs text-slate-500">{selectedBook.author} · Доступно: {selectedBook.availableCopies} экз.</p>
                      </div>
                      <button
                        onClick={() => { setSelectedBook(null); setIssueBookSearch(''); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Изменить
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={issueBookSearch}
                        onChange={(e) => setIssueBookSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="Поиск книги по названию, автору или ID..."
                      />
                      {issueBookSearch && availableBooks.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {availableBooks.slice(0, 10).map((b) => (
                            <button
                              key={b.id}
                              onClick={() => { setSelectedBook(b); setIssueBookSearch(''); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">{b.title}</p>
                                <p className="text-xs text-slate-500">{b.author}</p>
                              </div>
                              <span className="text-xs text-green-600">{b.availableCopies} экз.</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Срок выдачи (дней)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value) || 14)}
                    className="w-full max-w-32 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <button
                  onClick={handleIssue}
                  disabled={!selectedUser || !selectedBook || issueLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {issueLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  {issueLoading ? 'Выдача...' : 'Выдать книгу'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RETURN BOOK TAB */}
        {activeTab === 'return' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-800">Принять возврат</h2>
              </div>

              <MessageBox message={returnMessage} />

              {/* User search */}
              {!returnSelectedUser ? (
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Найти пользователя</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={returnUserSearch}
                      onChange={(e) => setReturnUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Поиск по имени или логину..."
                    />
                    {returnFoundUsers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {returnFoundUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleSelectReturnUser(u)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-800">{u.fullName}</p>
                              <p className="text-xs text-slate-500">@{u.username}</p>
                            </div>
                            <span className="text-xs text-slate-400">{u.class}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{returnSelectedUser.fullName}</p>
                      <p className="text-xs text-slate-500">@{returnSelectedUser.username} · {returnSelectedUser.class}</p>
                    </div>
                    <button
                      onClick={() => { setReturnSelectedUser(null); setReturnUserSearch(''); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Другой пользователь
                    </button>
                  </div>

                  {/* Active books */}
                  {(() => {
                    const activeEntries = (returnSelectedUser.history || []).map((entry, idx) => ({ ...entry, idx })).filter((e) => e.isActive);

                    if (activeEntries.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-500">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
                          <p className="text-sm font-medium">У пользователя нет книг на руках</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">Книги на руках ({activeEntries.length}):</p>
                        {activeEntries.map((entry) => {
                          const overdue = isOverdue(entry.dueDate);
                          return (
                            <div
                              key={entry.idx}
                              className={`flex items-center justify-between p-4 rounded-xl border ${
                                overdue ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">{entry.bookTitle}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Выдана: {formatDate(entry.borrowDate)} · Вернуть до:{' '}
                                  <span className={overdue ? 'text-red-600 font-medium' : ''}>
                                    {formatDate(entry.dueDate)}
                                  </span>
                                </p>
                                {overdue && (
                                  <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Просрочено
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleReturn(entry.idx)}
                                disabled={returnLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {returnLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                                Принять
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
