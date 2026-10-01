import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { checkDatabaseHealth } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('excel_formatter_user');
      return (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('excel_formatter_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('excel_formatter_token');
    return (saved && saved !== 'undefined' && saved !== 'null') ? saved : null;
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [dbStatus, setDbStatus] = useState({ checking: true, connected: false, info: null, error: null });

  // Check Database & Backend Health and Log to Console
  const verifyDbConnection = useCallback(async () => {
    setDbStatus(prev => ({ ...prev, checking: true }));
    const result = await checkDatabaseHealth();
    if (result.connected) {
      setDbStatus({ checking: false, connected: true, info: result.data, error: null });
    } else {
      setDbStatus({ checking: false, connected: false, info: null, error: result.error });
    }
  }, []);

  useEffect(() => {
    // 1. Log and verify live DB connection on app load
    verifyDbConnection();

    // 2. Verify existing session token if stored
    const verifyAuth = async () => {
      const savedToken = localStorage.getItem('excel_formatter_token');
      if (savedToken && savedToken !== 'undefined' && savedToken !== 'null') {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('excel_formatter_user', JSON.stringify(res.data.user));
          } else {
            logout();
          }
        } catch (err) {
          console.error("Token verification failed:", err);
          if (err.response?.status === 401 || err.response?.status === 403) {
            logout();
          }
        }
      } else {
        localStorage.removeItem('excel_formatter_token');
        localStorage.removeItem('excel_formatter_user');
      }
      setLoading(false);
    };
    verifyAuth();
  }, [verifyDbConnection]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Strict payload validation to prevent treating HTML 200 responses as success
      if (!res.data || typeof res.data !== 'object' || !res.data.token || !res.data.user) {
        throw new Error('Invalid response received from server. Expected authentication token.');
      }

      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('excel_formatter_token', newToken);
      localStorage.setItem('excel_formatter_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (name, email, password, passwordConfirmation) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      if (!res.data || typeof res.data !== 'object' || !res.data.token || !res.data.user) {
        throw new Error('Invalid registration response from server.');
      }
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('excel_formatter_token', newToken);
      localStorage.setItem('excel_formatter_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : err.message) || 'Registration failed.';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('excel_formatter_token');
      localStorage.removeItem('excel_formatter_user');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('excel_formatter_user', JSON.stringify(userData));
  };

  const role = user?.role || 'user';
  const isAdmin = role === 'admin';
  const isAuthority = role === 'authority';
  const isUser = role === 'user';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      authError,
      dbStatus,
      verifyDbConnection,
      role,
      isAdmin,
      isAuthority,
      isUser,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) || {};
