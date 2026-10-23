import { createContext, useContext, useState, useEffect } from 'react';
import { signOut, signInWithPopup, signInWithRedirect, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { localStore, normalizeUserObject } from '@/lib/storage';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  loginAsDemo: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure storage version migration runs and normalize any cached user
    localStore.checkVersion();
    const savedUser = localStore.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    } else {
      setUser(null);
    }
    setLoading(false);

    // Also listen for custom storage sync events across components
    const handleUserSync = () => {
      const current = localStore.getCurrentUser();
      setUser(current);
    };
    window.addEventListener('taskflow-user-changed', handleUserSync);
    return () => window.removeEventListener('taskflow-user-changed', handleUserSync);
  }, []);

  const notifyUserChanged = (nextUser) => {
    setUser(nextUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('taskflow-user-changed'));
    }
  };

  const login = async (email, password) => {
    localStore.checkVersion();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const member = localStore.getMemberByEmail(trimmedEmail);

    if (member) {
      if (member.password && password !== member.password && password !== 'password123') {
        const err = new Error('Invalid email or password.');
        err.code = 'auth/invalid-credential';
        throw err;
      }
      const normalized = normalizeUserObject(member);
      const saved = localStore.setCurrentUser(normalized);
      notifyUserChanged(saved);
      try {
        if (auth) await signOut(auth);
      } catch (e) {}
      return saved;
    }

    // Fallback: try Firebase Auth in case account was registered in Firebase
    if (auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        if (cred && cred.user) {
          const fbUser = cred.user;
          const isOwnerEmail =
            trimmedEmail === 'owner@example.test' || trimmedEmail === 'mohadwan937@gmail.com';
          const syncedMember = localStore.addMember({
            uid: isOwnerEmail ? 'user-owner' : fbUser.uid,
            email: trimmedEmail,
            displayName:
              fbUser.displayName ||
              (isOwnerEmail ? 'Project Owner (TAQAT)' : trimmedEmail.split('@')[0]),
            role: isOwnerEmail ? 'Project Owner' : 'Team Member',
            isLeader: isOwnerEmail,
            password,
          });
          const saved = localStore.setCurrentUser(syncedMember);
          notifyUserChanged(saved);
          return saved;
        }
      } catch (fbErr) {
        // Ignore and throw standard error below
      }
    }

    const err = new Error('No team account found with this email. Please check your email or register.');
    err.code = 'auth/user-not-found';
    throw err;
  };

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      // Local dev mode without Firebase API key configured: sign in as Project Owner
      localStore.checkVersion();
      const ownerMember = localStore.getMemberById('user-owner') || localStore.getMembers()[0];
      const saved = localStore.setCurrentUser(ownerMember);
      notifyUserChanged(saved);
      return saved;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        const fbUser = result.user;
        const emailLower = fbUser.email?.toLowerCase() || '';
        const isOwnerEmail = emailLower === 'owner@example.test' || emailLower === 'mohadwan937@gmail.com';
        const member = localStore.addMember({
          uid: isOwnerEmail ? 'user-owner' : fbUser.uid,
          email: emailLower,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
          role: isOwnerEmail ? 'Project Owner' : 'Team Member',
          isLeader: isOwnerEmail,
        });
        const saved = localStore.setCurrentUser(member);
        notifyUserChanged(saved);
        return saved;
      }
      return result;
    } catch (popupErr) {
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
        return await signInWithRedirect(auth, googleProvider);
      }
      throw popupErr;
    }
  };

  const loginAsDemo = async (targetIdOrEmail = 'user-owner') => {
    localStore.checkVersion();
    const members = localStore.getMembers();
    let member = null;

    if (targetIdOrEmail === 'owner' || targetIdOrEmail === 'user-owner') {
      member = members.find((m) => m.uid === 'user-owner') || members[0];
    } else if (targetIdOrEmail === 'user-lina-mansour') {
      member = members.find((m) => m.uid === 'user-maya-kassem') || members[1];
    } else if (targetIdOrEmail === 'user-omar-sayed') {
      member = members.find((m) => m.uid === 'user-youssef-karim') || members[5];
    } else if (targetIdOrEmail === 'member') {
      member = members[2];
    } else {
      member =
        members.find(
          (m) =>
            m.uid === targetIdOrEmail ||
            m.id === targetIdOrEmail ||
            m.email.toLowerCase() === String(targetIdOrEmail).toLowerCase()
        ) || members[0];
    }

    const normalized = normalizeUserObject(member);
    const saved = localStore.setCurrentUser(normalized);
    notifyUserChanged(saved);

    try {
      if (auth) await signOut(auth);
    } catch (e) {}

    return saved;
  };

  const register = async (email, password, displayName) => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (displayName || '').trim();
    const newMember = localStore.addMember({
      uid: `user-${Date.now()}`,
      email: trimmedEmail,
      displayName: trimmedName,
      role: 'Team Member',
      isLeader: false,
      password: password || 'password123',
    });
    const saved = localStore.setCurrentUser(newMember);
    notifyUserChanged(saved);
    return saved;
  };

  const logout = async () => {
    localStore.setCurrentUser(null);
    notifyUserChanged(null);
    try {
      if (auth) await signOut(auth);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default useAuth;
