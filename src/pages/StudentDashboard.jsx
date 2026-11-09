import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  BookOpen,
  Clock,
  History,
  Search,
  BookMarked,
  AlertTriangle,
  CheckCircle2,
  Library,
  Loader2,
} from 'lucide-react';

export default function StudentDashboard() {
  const { userData, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState('mybooks');
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    refreshUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
    }
  }, [activeTab]);

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'books'));
      const books = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCatalog(books);
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setCatalogLoading(false);
    }
  };

  const history = userData?.history || [];
  const activeBooks = history.filter((h) => h.isActive);
  const returnedBooks = history.filter((h) => !h.isActive);

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

  const filteredCatalog = catalog.filter((book) => {
    const term = searchTerm.toLowerCase();
    return (
      book.title?.toLowerCase().includes(term) ||
      book.author?.toLowerCase().includes(term) ||
      book.category?.toLowerCase().includes(term)
    );
  });

  const tabs = [
    { id: 'mybooks', label: 'Мои книги', icon: <BookMarked className="w-4 h-4" />, count: activeBooks.length },
    { id: 'history', label: 'История', icon: <History className="w-4 h-4" />, count: returnedBooks.length },
    { id: 'catalog', label: 'Каталог', icon: <Library className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Здравствуйте, {userData?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            {userData?.class} · Книг на руках: {activeBooks.length}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-slate-200 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-indigo-500 text-indigo-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* My Books Tab */}
        {activeTab === 'mybooks' && (
          <div>
            {activeBooks.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">У вас нет книг на руках</p>
                <p className="text-sm text-slate-400 mt-1">Загляните в каталог библиотеки</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeBooks.map((book, idx) => {
                  const overdue = isOverdue(book.dueDate);
                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-2xl shadow-sm border p-5 ${
                        overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 text-sm">{book.bookTitle}</h3>
                        </div>
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Просрочено
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <Clock className="w-3 h-3" />
                            На руках
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p>Дата выдачи: <span className="text-slate-700">{formatDate(book.borrowDate)}</span></p>
                        <p>
                          Вернуть до:{' '}
                          <span className={overdue ? 'text-red-600 font-medium' : 'text-slate-700'}>
                            {formatDate(book.dueDate)}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {returnedBooks.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">История чтения пуста</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="px-6 py-3">Книга</th>
                      <th className="px-6 py-3">Дата выдачи</th>
                      <th className="px-6 py-3">Дата возврата</th>
                      <th className="px-6 py-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnedBooks.map((book, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{book.bookTitle}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(book.borrowDate)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(book.returnDate)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Сдано
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

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                placeholder="Поиск по названию, автору или категории..."
              />
            </div>

            {catalogLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <Library className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">
                  {searchTerm ? 'Книги не найдены' : 'Каталог пуст'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCatalog.map((book) => (
                  <div
                    key={book.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-800 text-sm flex-1">{book.title}</h3>
                      {book.availableCopies > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-2 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          В наличии
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 ml-2 shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          Нет в наличии
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{book.author}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {book.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {book.availableCopies} / {book.totalCopies} экз.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
