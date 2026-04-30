import { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContextValue';

const parseToken = (token) => {
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      avatar: payload.avatar
    };
  } catch (error) {
    console.error('Invalid token', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const initialToken = localStorage.getItem('token') || null;
  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState(() => parseToken(initialToken));
  const [loading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
