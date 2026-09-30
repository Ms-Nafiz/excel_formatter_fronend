import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import FileUpload from './components/FileUpload';
import LocationManager from './components/LocationManager';
import CollectorManager from './components/CollectorManager';
import MonthlyTargetView from './components/MonthlyTargetView';
import FileHistory from './components/FileHistory';
import CustomerIdSearchEditor from './components/CustomerIdSearchEditor';
import CustomerSummaryView from './components/CustomerSummaryView';
import MonthlyComparisonView from './components/MonthlyComparisonView';
import CustomerUpdateReportView from './components/CustomerUpdateReportView';
import CustomerCollectionView from './components/CustomerCollectionView';
import CollectorAchievementView from './components/CollectorAchievementView';
import ProfileView from './components/ProfileView';
import { useAuth } from './context/AuthContext';
import { MapPin, Users, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('formatter'); // 'formatter' | 'customer_summary' | 'connection_comparison' | 'target_report' | 'collections' | 'id_editor' | 'update_audit' | 'locations' | 'collectors' | 'profile'
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Dynamic Browser Tab Title Synchronization
  useEffect(() => {
    if (loading) {
      document.title = 'Initializing... | AutoExcel';
      return;
    }

    if (!user) {
      document.title = 'Sign In | AutoExcel';
      return;
    }

    const tabTitleMap = {
      profile: 'User Profile & Settings',
      formatter: 'Dashboard & Formatter',
      customer_summary: 'Customer Summary',
      connection_comparison: 'Connection Audit',
      target_report: 'Monthly Target Report',
      collections: 'Customer Collections',
      collector_achievement: 'Target vs Collection',
      id_editor: 'Customer ID Fast Editor',
      update_audit: 'Update Audit Report',
      locations: 'Area Excel Format',
      collectors: 'Collector Excel Format',
    };

    const currentTitle = tabTitleMap[activeTab] || 'Dashboard';
    document.title = `${currentTitle} | AutoExcel`;
  }, [activeTab, user, loading]);

  const handleProcessingSuccess = () => {
    setHistoryRefreshKey((prev) => prev + 1);
  };

  // 1. Initial Auth Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-bounce mb-4">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-sm font-bold text-slate-300 tracking-wide">Initializing AutoExcel Engine...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Access Control Guard: Dedicated Login Page when unauthenticated
  if (!user) {
    return <LoginPage />;
  }

  // 3. Authenticated Workspace Layout with Modern Collapsible Sidebar
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex overflow-x-hidden">
      
      {/* Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main App Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onNavigateToProfile={() => setActiveTab('profile')}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
          
          {/* ========================================================= */}
          {/* TAB 0: USER PROFILE & ACCOUNT SETTINGS */}
          {/* ========================================================= */}
          <div className={activeTab === 'profile' ? 'animate-fade-in' : 'hidden'}>
            <ProfileView />
          </div>

          {/* ========================================================= */}
          {/* TAB 1: DASHBOARD & EXCEL FORMATTER */}
          {/* ========================================================= */}
          <div className={activeTab === 'formatter' ? 'space-y-8 animate-fade-in' : 'hidden'}>
            <FileUpload
              onProcessingSuccess={handleProcessingSuccess}
              onOpenAuth={() => {}}
              isAuthenticated={true}
            />
            <div className="pt-4">
              <FileHistory
                refreshTrigger={historyRefreshKey}
                onDataChange={handleProcessingSuccess}
                isAuthenticated={true}
                onOpenAuth={() => {}}
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 2: DEDICATED CUSTOMER SUMMARY PAGE */}
          {/* ========================================================= */}
          <div className={activeTab === 'customer_summary' ? 'animate-fade-in' : 'hidden'}>
            <CustomerSummaryView
              refreshTrigger={historyRefreshKey}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB 3: DEDICATED TWO-MONTH CONNECTION AUDIT PAGE */}
          {/* ========================================================= */}
          <div className={activeTab === 'connection_comparison' ? 'animate-fade-in' : 'hidden'}>
            <MonthlyComparisonView
              refreshTrigger={historyRefreshKey}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB 4: DEDICATED MONTHLY TARGET REPORT PAGE */}
          {/* ========================================================= */}
          <div className={activeTab === 'target_report' ? 'animate-fade-in' : 'hidden'}>
            <MonthlyTargetView
              refreshTrigger={historyRefreshKey}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB 5: CUSTOMER COLLECTION SYSTEM & REVENUE LOGS */}
          {/* ========================================================= */}
          <div className={activeTab === 'collections' ? 'animate-fade-in' : 'hidden'}>
            <CustomerCollectionView
              refreshTrigger={historyRefreshKey}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB: COLLECTOR TARGET VS COLLECTION ACHIEVEMENT REPORT */}
          {/* ========================================================= */}
          <div className={activeTab === 'collector_achievement' ? 'animate-fade-in' : 'hidden'}>
            <CollectorAchievementView
              refreshTrigger={historyRefreshKey}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB 6: CUSTOMER ID FAST EDITOR */}
          {/* ========================================================= */}
          <div className={activeTab === 'id_editor' ? 'animate-fade-in' : 'hidden'}>
            <CustomerIdSearchEditor
              refreshTrigger={historyRefreshKey}
              onDataChange={handleProcessingSuccess}
              onNavigateToAudit={() => setActiveTab('update_audit')}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB 6: CUSTOMER UPDATE AUDIT REPORT */}
          {/* ========================================================= */}
          <div className={activeTab === 'update_audit' ? 'animate-fade-in' : 'hidden'}>
            <CustomerUpdateReportView
              refreshTrigger={historyRefreshKey}
              onNavigateToEditor={() => setActiveTab('id_editor')}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB 6: AREA EXCEL FORMAT & BUILDINGS */}
          {/* ========================================================= */}
          <div className={activeTab === 'locations' ? 'space-y-6 animate-fade-in' : 'hidden'}>
            <div className="glass-card p-6 rounded-2xl border border-slate-800 mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Area Excel Format & Location Intelligence</h2>
                  <p className="text-xs text-slate-400">
                    Manage target Area names and Building names used by the smart address parser for automated extraction.
                  </p>
                </div>
              </div>
            </div>

            <LocationManager
              refreshTrigger={historyRefreshKey}
              onDataChange={handleProcessingSuccess}
              isAuthenticated={true}
              onOpenAuth={() => {}}
            />
          </div>

          {/* ========================================================= */}
          {/* TAB 7: COLLECTOR EXCEL FORMAT */}
          {/* ========================================================= */}
          <div className={activeTab === 'collectors' ? 'space-y-6 animate-fade-in' : 'hidden'}>
            <div className="glass-card p-6 rounded-2xl border border-slate-800 mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Collector Excel Format & Route Mapping</h2>
                  <p className="text-xs text-slate-400">
                    Add collectors and assign target areas so uploaded Excel records are automatically routed to the right collector.
                  </p>
                </div>
              </div>
            </div>

            <CollectorManager
              refreshTrigger={historyRefreshKey}
              onDataChange={handleProcessingSuccess}
              isAuthenticated={true}
              onOpenAuth={() => {}}
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Excel Formatting Engine • Enterprise Data & Monthly Collector Target Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
