import axios from 'axios';

// Resolve API base URL dynamically from environment variable or fallback to '/api'
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || !envUrl.trim()) {
    return '/api';
  }
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  // If user provided a base host (e.g. https://api.example.com) without /api, append /api
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor to add Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('excel_formatter_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor for handling token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('excel_formatter_token');
      localStorage.removeItem('excel_formatter_user');
      // Emit event or let AuthContext handle state
    }
    return Promise.reject(error);
  }
);

export default api;
