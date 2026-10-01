import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Sparkles, FileSpreadsheet, ShieldCheck, MapPin, Users, Database } from 'lucide-react';

export default function LoginPage() {
  const { login, authError, dbStatus, verifyDbConnection } = useAuth();

  // Sync browser tab title
  useEffect(() => {
    document.title = 'Sign In | AutoExcel';
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuickDemoFill = () => {
    setFormData({
      email: 'demo@excel.com',
      password: 'password123',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(formData.email, formData.password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header branding */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl text-white tracking-tight">AutoExcel</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                v2.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Excel Formatting & Monthly Collector Target Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Live DB Status Pill */}
          <button
            type="button"
            onClick={verifyDbConnection}
            title={dbStatus.error ? `Error: ${dbStatus.error}` : 'Live Database Status (Click to test)'}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition ${
              dbStatus.checking
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : dbStatus.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className={`w-2 h-2 rounded-full ${
              dbStatus.checking ? 'bg-amber-400 animate-ping' : dbStatus.connected ? 'bg-emerald-400' : 'bg-rose-400'
            }`} />
            <span>
              {dbStatus.checking
                ? 'Checking DB...'
                : dbStatus.connected
                ? 'Live DB: Connected'
                : 'Live DB: Disconnected'}
            </span>
          </button>

          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Protected Enterprise Workspace</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card Grid */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: App Feature Highlights */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left pr-0 lg:pr-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold shadow-inner">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Secure Authentication Required</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Excel Formatting <span className="gradient-text">& Target Intelligence</span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              Please sign in to access your spreadsheets, custom area mappings, collector target reports, and automated formatting engine.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span>Automated Address Parsing & Building Sorting</span>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Area & Building Intelligence Management</span>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
                <span>Collector Route Mapping & Target Reports</span>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Form Card */}
          <div className="lg:col-span-6 w-full">
            <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl backdrop-blur-xl">
              
              {/* Form Header */}
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3 border border-indigo-500/30">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your credentials to sign in to your workspace
                </p>
              </div>

              {/* Error Alert */}
              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Quick Demo Credentials Fill Button */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-fill Demo Credentials</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="demo@excel.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 gradient-bg text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center space-x-2 mt-6 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </span>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Admin Provisioning Notice */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
                <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>New user accounts are created and managed by System Administrators only.</span>
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 z-10 border-t border-slate-900">
        <p>© {new Date().getFullYear()} Excel Formatting Engine • Enterprise Data & Target Intelligence Platform</p>
      </footer>

    </div>
  );
}
