import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(usernameOrEmail, password) {
    let email = usernameOrEmail.trim();
    if (!email.includes('@')) {
      email = `${email.toLowerCase()}@schoollib.local`;
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    setUserData(null);
    return signOut(auth);
  }

  async function refreshUserData() {
    if (currentUser) {
      // Check librarians collection first, then users collection
      let docSnap = await getDoc(doc(db, 'librarians', currentUser.uid));
      if (!docSnap.exists()) {
        docSnap = await getDoc(doc(db, 'users', currentUser.uid));
      }
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          let docSnap = await getDoc(doc(db, 'librarians', user.uid));
          if (!docSnap.exists()) {
            docSnap = await getDoc(doc(db, 'users', user.uid));
          }
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            // Fallback for admin or librarian created directly in auth
            setUserData({
              uid: user.uid,
              fullName: user.displayName || user.email?.split('@')[0] || 'Библиотекарь',
              email: user.email,
              role: 'librarian',
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
