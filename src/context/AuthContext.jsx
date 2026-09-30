import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('excel_formatter_user');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('excel_formatter_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('excel_formatter_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('excel_formatter_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };
    verifyAuth();
  }, [token]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('excel_formatter_token', newToken);
      localStorage.setItem('excel_formatter_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
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
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('excel_formatter_token', newToken);
      localStorage.setItem('excel_formatter_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : 'Registration failed.';
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
