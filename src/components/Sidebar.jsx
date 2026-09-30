import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  MapPin,
  Users,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Zap,
  Target,
  PieChart,
  GitCompare,
  History,
  Receipt,
  Award,
  Search,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const navCategories = useMemo(() => [
    {
      id: 'overview',
      label: 'Overview & Core',
      shortLabel: 'Core',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      items: [
        {
          id: 'formatter',
          label: 'Dashboard',
          subLabel: 'Excel Formatter & Reports',
          icon: LayoutDashboard,
          activeColor: 'from-indigo-500 to-purple-600',
        },
      ],
    },
    {
      id: 'billing',
      label: 'Collections & Targets',
      shortLabel: 'Billing',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      items: [
        {
          id: 'target_report',
          label: 'Monthly Target Report',
          subLabel: 'Collector Target Intelligence',
          icon: Target,
          activeColor: 'from-amber-500 to-orange-600',
        },
        {
          id: 'collections',
          label: 'Customer Collections',
          subLabel: 'Excel Import & Revenue Logs',
          icon: Receipt,
          activeColor: 'from-emerald-500 to-teal-600',
        },
        {
          id: 'collector_achievement',
          label: 'Target vs Collection',
          subLabel: 'Collector Achievement %',
          icon: Award,
          activeColor: 'from-amber-500 to-emerald-600',
        },
      ],
    },
    {
      id: 'customers',
      label: 'Customer Operations',
      shortLabel: 'Customers',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      items: [
        {
          id: 'customer_summary',
          label: 'Customer Summary',
          subLabel: 'Type & Category Active Count',
          icon: PieChart,
          activeColor: 'from-emerald-500 to-teal-600',
        },
        {
          id: 'connection_comparison',
          label: 'Connection Audit',
          subLabel: 'New & Disconnections Report',
          icon: GitCompare,
          activeColor: 'from-rose-500 to-purple-600',
        },
        {
          id: 'id_editor',
          label: 'Customer ID Fast Editor',
          subLabel: 'Search & Edit by Customer ID',
          icon: Zap,
          activeColor: 'from-amber-500 to-orange-600',
        },
        {
          id: 'update_audit',
          label: 'Update Audit Report',
          subLabel: 'Customer Change History Logs',
          icon: History,
          activeColor: 'from-amber-500 to-rose-600',
        },
      ],
    },
    {
      id: 'setup',
      label: 'Setup & Configuration',
      shortLabel: 'Setup',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      items: [
        {
          id: 'locations',
          label: 'Area Excel Format',
          subLabel: 'Areas & Building Config',
          icon: MapPin,
          activeColor: 'from-indigo-500 to-purple-600',
        },
        {
          id: 'collectors',
          label: 'Collector Excel Format',
          subLabel: 'Collectors & Route Mapping',
          icon: Users,
          activeColor: 'from-indigo-500 to-purple-600',
        },
      ],
    },
    {
      id: 'account',
      label: 'Account & Settings',
      shortLabel: 'Account',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      items: [
        {
          id: 'profile',
          label: 'User Profile',
          subLabel: 'Profile, Security & Roles',
          icon: User,
          activeColor: 'from-indigo-500 to-purple-600',
        },
      ],
    },
  ], []);

  // Filter categories and items based on search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navCategories;

    return navCategories
      .map((cat) => {
        const matchingItems = cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.subLabel.toLowerCase().includes(q) ||
            cat.label.toLowerCase().includes(q)
        );
        return {
          ...cat,
          items: matchingItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [navCategories, searchQuery]);

  const toggleCategory = (catId) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const isCatCollapsed = (cat) => {
    // If searching, keep everything expanded
    if (searchQuery.trim()) return false;
    // If active tab belongs to this category, always keep it open
    if (cat.items.some((item) => item.id === activeTab)) return false;
    return !!collapsedCategories[cat.id];
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-slate-900/95 border-r border-slate-800/90 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Floating Edge Toggle Pill (visible on desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 shadow-xl absolute -right-3 top-5 z-50 transition-all duration-300 cursor-pointer hover:scale-110 ${
            isCollapsed ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-75 pointer-events-none'
          }`}
          title="Expand Sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Top Header Section: Logo & Toggle */}
        <div className={`h-16 border-b border-slate-800/80 px-2 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} flex-shrink-0 relative`}>
          <div
            onClick={isCollapsed ? () => setIsCollapsed(false) : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center cursor-pointer' : 'min-w-0'}`}
            title={isCollapsed ? 'Click to expand' : ''}
          >
            {/* Logo Icon */}
            <div className={`${isCollapsed ? 'w-10 h-10' : 'ml-3 w-10 h-10'} rounded-xl gradient-bg flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all`}>
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>

            {/* Brand Title & Subtitle */}
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                isCollapsed
                  ? 'w-0 opacity-0 -translate-x-3 pointer-events-none m-0 p-0 hidden'
                  : 'ml-3 max-w-[130px] opacity-100 translate-x-0'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base text-white tracking-tight">AutoExcel</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Enterprise Format Engine
              </p>
            </div>
          </div>

          {/* Desktop Collapse Toggle Button (Inside Header when Expanded) */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/50 transition-all duration-300 cursor-pointer flex-shrink-0 mr-1"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Search Filter (Expanded mode only) */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 flex-shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="w-full bg-slate-950/70 border border-slate-800/90 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Categories & Items */}
        <div className="flex-1 px-2 py-2 space-y-3 overflow-y-auto overflow-x-hidden sidebar-scroll">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-6 px-3">
              <p className="text-xs text-slate-400">No pages match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-[11px] text-indigo-400 hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          ) : (
            filteredCategories.map((cat, catIdx) => {
              const collapsed = isCatCollapsed(cat);

              return (
                <div key={cat.id} className="space-y-1">
                  {/* Category Header (Expanded Mode) */}
                  {!isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="truncate">{cat.label}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50">
                          {cat.items.length}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                          collapsed ? '-rotate-90 text-slate-400' : 'rotate-0'
                        }`}
                      />
                    </button>
                  ) : (
                    /* Category Divider in Collapsed Mode */
                    catIdx > 0 && (
                      <div className="my-2 px-3">
                        <div className="h-px bg-slate-800/80 w-full" />
                      </div>
                    )
                  )}

                  {/* Category Items List */}
                  {(!collapsed || isCollapsed) && (
                    <div className="space-y-1">
                      {cat.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              if (setIsMobileOpen) setIsMobileOpen(false);
                            }}
                            title={`${item.label} • ${item.subLabel}`}
                            className={`w-full flex items-center ${
                              isCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-1.5'
                            } rounded-xl text-xs font-semibold transition-all duration-200 group relative cursor-pointer ${
                              isActive
                                ? 'bg-gradient-to-r ' + item.activeColor + ' text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                            }`}
                          >
                            {/* Icon wrapper - aligned with header logo */}
                            <div
                              className={`w-10 h-10 rounded-lg transition-transform duration-200 flex-shrink-0 flex items-center justify-center ${
                                isActive
                                  ? 'bg-white/10 text-white'
                                  : 'bg-slate-800/60 text-slate-400 group-hover:text-indigo-400 group-hover:scale-105'
                              }`}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                            </div>

                            {/* Text Label & Sublabel */}
                            <div
                              className={`text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                                isCollapsed
                                  ? 'w-0 opacity-0 -translate-x-3 pointer-events-none m-0 p-0 hidden'
                                  : 'ml-3 max-w-[155px] opacity-100 translate-x-0 flex-1 min-w-0'
                              }`}
                            >
                              <div className="font-bold text-slate-100 truncate">{item.label}</div>
                              <div
                                className={`text-[10px] truncate ${
                                  isActive ? 'text-indigo-100' : 'text-slate-500 group-hover:text-slate-400'
                                }`}
                              >
                                {item.subLabel}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Info & Logout Section */}
        <div className="p-2 border-t border-slate-800/80 bg-slate-900/40 flex-shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'justify-between'}`}>
            <button
              onClick={() => {
                setActiveTab('profile');
                if (isMobileOpen) setIsMobileOpen(false);
              }}
              title={`View Profile: ${user?.name || 'User'} (${user?.email || ''})`}
              className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'min-w-0'} hover:opacity-90 transition cursor-pointer text-left group`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition border ${
                  isCollapsed ? 'mx-auto' : 'ml-3'
                } ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30'
                    : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 group-hover:border-indigo-400'
                }`}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isCollapsed
                    ? 'w-0 opacity-0 -translate-x-3 pointer-events-none m-0 p-0 hidden'
                    : 'ml-3 max-w-[105px] opacity-100 translate-x-0'
                }`}
              >
                <p className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </button>

            {/* Logout Button (Expanded Mode) */}
            {!isCollapsed && (
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-500/10 border border-slate-700/50 hover:border-rose-500/30 rounded-xl transition cursor-pointer flex-shrink-0 mr-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Logout Button (Collapsed Mode) */}
            {isCollapsed && (
              <button
                onClick={logout}
                title="Logout"
                className="w-10 h-10 text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-500/10 border border-slate-700/50 hover:border-rose-500/30 rounded-xl transition cursor-pointer flex items-center justify-center mx-auto"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
