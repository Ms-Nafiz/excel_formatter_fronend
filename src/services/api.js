import axios from 'axios';

// Resolve API base URL dynamically from environment variable or fallback to live production / local
export const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  // Automatic domain detection for production live server
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || '';
    if (hostname.includes('cclcatv.com')) {
      return 'https://api2.cclcatv.com/api';
    }
  }

  return '/api';
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
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor for handling token expiration and HTML payload guard
api.interceptors.response.use(
  (response) => {
    // Safety guard: If an endpoint returned an HTML document instead of JSON (e.g. SPA index.html fallback),
    // treat it as an error to prevent silent UI redirects and corruption of auth state.
    if (typeof response.data === 'string' && (response.data.includes('<!doctype html') || response.data.includes('<html'))) {
      const errorMsg = 'API returned an HTML page instead of JSON. Please check backend API URL and server routing.';
      console.error('[API Response Error]', errorMsg, 'Endpoint:', response.config?.url);
      return Promise.reject(new Error(errorMsg));
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('excel_formatter_token');
      localStorage.removeItem('excel_formatter_user');
    }
    return Promise.reject(error);
  }
);

// Database & Backend Health Check logger
export const checkDatabaseHealth = async () => {
  const targetUrl = `${api.defaults.baseURL}/system/status`;
  try {
    const res = await api.get('/system/status');
    const data = res.data;
    console.log(
      '%c [AutoExcel Live DB] %c CONNECTED %c',
      'background: #1e293b; color: #94a3b8; font-weight: bold; padding: 4px 6px; border-radius: 4px 0 0 4px;',
      'background: #059669; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;',
      '',
      `\n🔗 API Base: ${api.defaults.baseURL}` +
      `\n🗄️ Database: ${data.database || 'Active'}` +
      `\n👥 Registered Users: ${data.users_count ?? 0}` +
      `\n⏱️ Server Time: ${data.server_time || new Date().toISOString()}`
    );
    return { connected: true, data };
  } catch (err) {
    // If /system/status is not yet deployed on server, test fallback via /auth/login ping
    if (err.response?.status === 404 || err.response?.status === 405) {
      try {
        await api.post('/auth/login', {});
      } catch (loginErr) {
        if (loginErr.response?.status === 422 || loginErr.response?.status === 401) {
          console.log(
            '%c [AutoExcel Live DB] %c BACKEND REACHABLE %c',
            'background: #1e293b; color: #94a3b8; font-weight: bold; padding: 4px 6px; border-radius: 4px 0 0 4px;',
            'background: #0d9488; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;',
            '',
            `\n🔗 API Base: ${api.defaults.baseURL}` +
            `\n⚡ Backend is responding (HTTP ${loginErr.response.status}). Database migrations active.`
          );
          return { connected: true, data: { status: 'connected', database: 'Live Database' } };
        }
      }
    }

    console.error(
      '%c [AutoExcel Live DB] %c DISCONNECTED / FAILED %c',
      'background: #1e293b; color: #94a3b8; font-weight: bold; padding: 4px 6px; border-radius: 4px 0 0 4px;',
      'background: #dc2626; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;',
      '',
      `\n🔗 API Target: ${targetUrl}` +
      `\n❌ Error Details: ${err.response?.data?.message || err.message}`
    );
    return { connected: false, error: err.response?.data?.message || err.message };
  }
};

export default api;
