import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, FileSpreadsheet, MapPin, Users, Zap, Target, PieChart, GitCompare, History, Receipt, Award, User } from 'lucide-react';

export default function Header({ activeTab, onOpenMobileMenu, onNavigateToProfile }) {
  const { user, logout, role, isAdmin, isAuthority } = useAuth();

  const getTabTitle = () => {
    switch (activeTab) {
      case 'profile':
        return {
          title: 'User Profile & Account Settings',
          subtitle: 'Manage profile details, password security, system role & user directory',
          icon: User,
          color: 'text-indigo-400',
        };
      case 'customer_summary':
        return {
          title: 'Customer Summary Dashboard',
          subtitle: 'Active customer count & connection metrics categorized by Customer Type & Category',
          icon: PieChart,
          color: 'text-emerald-400',
        };
      case 'connection_comparison':
        return {
          title: 'Two-Month Connection Audit & Line Change Report',
          subtitle: 'Audit line disconnections, new connections added, and net churn between any two months',
          icon: GitCompare,
          color: 'text-rose-400',
        };
      case 'target_report':
        return {
          title: 'Monthly Collector Target Intelligence Report',
          subtitle: 'Collection breakdown by Collector & Type (Analog vs Digital) with 50% dues targets',
          icon: Target,
          color: 'text-amber-400',
        };
      case 'collections':
        return {
          title: 'Customer Collections & Revenue Logs',
          subtitle: 'Upload payment records, view collection logs, and export revenue reports',
          icon: Receipt,
          color: 'text-emerald-400',
        };
      case 'collector_achievement':
        return {
          title: 'Target vs Collection Achievement Report',
          subtitle: 'Monthly collector performance ranking, collected amounts, and achievement percentages',
          icon: Award,
          color: 'text-amber-400',
        };
      case 'id_editor':
        return {
          title: 'Customer ID Fast Search & Instant Editor',
          subtitle: 'Search records by Customer ID across Excel files and perform sub-5ms edits',
          icon: Zap,
          color: 'text-amber-400',
        };
      case 'update_audit':
        return {
          title: 'Customer Update Audit & Change Logs',
          subtitle: 'Monthly customer modification logs with Old vs New history and Excel export',
          icon: History,
          color: 'text-amber-400',
        };
      case 'locations':
        return {
          title: 'Area Excel Format & Buildings',
          subtitle: 'Configure target areas & extracted building keywords for smart parsing',
          icon: MapPin,
          color: 'text-indigo-400',
        };
      case 'collectors':
        return {
          title: 'Collector Excel Format & Routes',
          subtitle: 'Manage active collectors and assign location route mapping',
          icon: Users,
          color: 'text-emerald-400',
        };
      case 'formatter':
      default:
        return {
          title: 'Dashboard & Excel Formatter',
          subtitle: 'Upload spreadsheets, generate target reports, and view past history',
          icon: FileSpreadsheet,
          color: 'text-indigo-400',
        };
    }
  };

  const currentTab = getTabTitle();
  const Icon = currentTab.icon;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5">
      <div className="flex items-center justify-between">
        
        {/* Left Section: Mobile Menu Toggle & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 hidden sm:block ${currentTab.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{currentTab.title}</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                {currentTab.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Status Pill & Logout */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Workspace Active</span>
          </div>

          <button
            onClick={onNavigateToProfile}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs transition cursor-pointer"
            title="View User Profile & Settings"
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold ${
              isAdmin ? 'bg-amber-500/20 text-amber-400' :
              isAuthority ? 'bg-blue-500/20 text-blue-400' :
              'bg-indigo-600/30 text-indigo-400'
            }`}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-slate-200 font-semibold hidden sm:inline">{user?.name || 'User'}</span>
            <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border ${
              isAdmin ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
              isAuthority ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {role}
            </span>
          </button>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 rounded-xl transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
