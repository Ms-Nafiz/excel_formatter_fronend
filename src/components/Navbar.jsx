import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, LogOut, User, ShieldCheck, MapPin, Users, Target, Layers } from 'lucide-react';

export default function Navbar({ onOpenAuth, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 glass-card">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-4 lg:px-6">
        
        {/* Top Header Bar */}
        <div className="h-16 flex items-center justify-between">
          
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">AutoExcel</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  v2.0 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Excel Formatting & Monthly Target Engine
              </p>
            </div>
          </div>

          {/* Desktop Page Navigation Tabs */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('formatter')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'formatter'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Formatter & Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('locations')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'locations'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Areas & Buildings</span>
            </button>

            <button
              onClick={() => setActiveTab('collectors')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'collectors'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Collector Management</span>
            </button>
          </div>

          {/* User Profile / Auth Action */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-500/10 border border-slate-700/50 hover:border-rose-500/30 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white gradient-bg hover:opacity-90 rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('formatter')}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg transition ${
              activeTab === 'formatter' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Formatter</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg transition ${
              activeTab === 'locations' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Areas</span>
          </button>

          <button
            onClick={() => setActiveTab('collectors')}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg transition ${
              activeTab === 'collectors' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Collectors</span>
          </button>
        </div>

      </div>
    </header>
  );
}
