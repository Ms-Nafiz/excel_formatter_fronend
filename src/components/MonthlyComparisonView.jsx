import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import {
  GitCompare,
  Calendar,
  RefreshCw,
  Users,
  UserPlus,
  UserMinus,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  Search,
  Tv,
  Radio,
  Building2,
  Shield,
  Filter,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown
} from 'lucide-react';

// In-memory module cache for instant 0ms tab switching
const comparisonCache = {};

export default function MonthlyComparisonView({ refreshTrigger }) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [months, setMonths] = useState([]);
  const [baseMonth, setBaseMonth] = useState('');
  const [compareMonth, setCompareMonth] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('disconnections'); // 'disconnections' | 'new_connections' | 'retained'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportingDetails, setExportingDetails] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Fetch available target months on mount or refresh
  useEffect(() => {
    fetchMonths();
  }, [refreshTrigger]);

  const fetchMonths = async () => {
    try {
      const res = await api.get('/excel/target-months');
      const availMonths = res.data?.months || [];
      setMonths(availMonths);

      if (!baseMonth && !compareMonth) {
        if (availMonths.length >= 2) {
          setBaseMonth(availMonths[1] || 'July 2026');
          setCompareMonth(availMonths[0] || 'August 2026');
        } else if (availMonths.length === 1) {
          setBaseMonth(availMonths[0]);
          setCompareMonth(availMonths[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load months:', err);
    }
  };

  useEffect(() => {
    if (baseMonth && compareMonth) {
      fetchComparisonReport(false);
    }
  }, [baseMonth, compareMonth]);

  useEffect(() => {
    if (refreshTrigger > 0 && baseMonth && compareMonth) {
      Object.keys(comparisonCache).forEach(k => delete comparisonCache[k]);
      fetchComparisonReport(true);
    }
  }, [refreshTrigger]);

  const fetchComparisonReport = async (forceRefresh = false) => {
    if (!baseMonth || !compareMonth) return;

    const cacheKey = `${baseMonth}___${compareMonth}`;
    if (!forceRefresh && comparisonCache[cacheKey]) {
      setComparisonData(comparisonCache[cacheKey]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/excel/monthly-comparison-report', {
        params: {
          base_month: baseMonth,
          compare_month: compareMonth
        }
      });
      const data = res.data?.data || null;
      comparisonCache[cacheKey] = data;
      setComparisonData(data);
    } catch (err) {
      console.error('Failed to fetch monthly comparison report:', err);
      setError(err.response?.data?.message || 'Failed to fetch comparison report.');
    } finally {
      setLoading(false);
    }
  };

  // Export Excel Workbook
  const handleExportExcel = async () => {
    if (!baseMonth || !compareMonth) return;

    setExporting(true);
    try {
      const res = await api.get('/excel/export-comparison-report', {
        params: {
          base_month: baseMonth,
          compare_month: compareMonth
        }
      });

      if (res.data?.download_url) {
        window.open(res.data.download_url, '_blank');
      }
    } catch (err) {
      console.error('Failed to export comparison report:', err);
      alert('Failed to export comparison Excel report.');
    } finally {
      setExporting(false);
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Active list based on selected tab (Disconnections / New Connections / Retained)
  const currentTabItems = useMemo(() => {
    if (!comparisonData) return [];

    if (activeTab === 'new_connections') {
      return comparisonData.new_connections || [];
    } else if (activeTab === 'retained') {
      return comparisonData.retained || [];
    }
    return comparisonData.disconnections || [];
  }, [comparisonData, activeTab]);

  // Filter list by live search query
  const filteredTabItems = useMemo(() => {
    if (!searchQuery.trim()) return currentTabItems;
    const q = searchQuery.toLowerCase().trim();

    return currentTabItems.filter(item => {
      return (
        (item.customer_id && String(item.customer_id).toLowerCase().includes(q)) ||
        (item.full_name && String(item.full_name).toLowerCase().includes(q)) ||
        (item.add_combined && String(item.add_combined).toLowerCase().includes(q)) ||
        (item.collector_name && String(item.collector_name).toLowerCase().includes(q)) ||
        (item.customer_type && String(item.customer_type).toLowerCase().includes(q)) ||
        (item.category && String(item.category).toLowerCase().includes(q))
      );
    });
  }, [currentTabItems, searchQuery]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset pagination when active tab, search, months, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, baseMonth, compareMonth, pageSize]);

  // Pagination calculation
  const totalItems = filteredTabItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    return filteredTabItems.slice(startIndex, endIndex);
  }, [filteredTabItems, startIndex, endIndex]);

  // Generate page numbers with ellipsis
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      }
    }

    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }, [safeCurrentPage, totalPages]);

  const activeTabTitle = activeTab === 'new_connections'
    ? 'New Connections'
    : activeTab === 'retained'
      ? 'Retained Connections'
      : 'Disconnections';

  // Client-side Excel Export for current tab / filtered connection details
  const handleExportDetailsExcel = (exportAllInTab = false) => {
    const itemsToExport = exportAllInTab ? currentTabItems : filteredTabItems;
    if (!itemsToExport || itemsToExport.length === 0) {
      alert('No connection records available to export.');
      return;
    }

    setExportingDetails(true);

    try {
      const rows = itemsToExport.map((item, index) => ({
        'SL': index + 1,
        'Customer ID': item.customer_id || '',
        'Customer Name': item.full_name || '',
        'Address': item.add_combined || '',
        'Customer Type': item.customer_type || '',
        'Category': item.category || '',
        'Collector': item.collector_name || '',
        'Monthly Rent': Number(item.monthly_rent || 0),
        'Previous Dues': Number(item.previous_dues || 0),
        'Area': item.area_name || '',
        'Building': item.building_name || '',
        'House No': item.house_no || '',
        'Flat No': item.flat_no || '',
        'Audit Status': activeTabTitle,
        'Billing Month': item.billing_month || compareMonth || baseMonth || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);

      ws['!cols'] = [
        { wch: 6 },  // SL
        { wch: 16 }, // Customer ID
        { wch: 28 }, // Customer Name
        { wch: 38 }, // Address
        { wch: 16 }, // Customer Type
        { wch: 12 }, // Category
        { wch: 22 }, // Collector
        { wch: 16 }, // Monthly Rent
        { wch: 16 }, // Previous Dues
        { wch: 20 }, // Area
        { wch: 20 }, // Building
        { wch: 12 }, // House No
        { wch: 12 }, // Flat No
        { wch: 22 }, // Audit Status
        { wch: 16 }, // Billing Month
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeTabTitle.substring(0, 31));

      const safeBase = (baseMonth || 'MonthA').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCompare = (compareMonth || 'MonthB').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeTab = activeTabTitle.replace(/\s+/g, '_');
      const filterSuffix = (!exportAllInTab && searchQuery.trim()) ? '_Filtered' : '';
      const fileName = `${safeTab}_Audit_${safeBase}_vs_${safeCompare}${filterSuffix}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export connection details to Excel:', err);
      alert('Failed to generate Excel file: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingDetails(false);
    }
  };

  // Multi-sheet workbook export for all 3 categories (Disconnections, New, Retained)
  const handleExportAllTabsExcel = () => {
    if (!comparisonData) return;
    setExportingDetails(true);

    try {
      const wb = XLSX.utils.book_new();

      const tabsToExport = [
        { sheetName: 'Disconnections', data: comparisonData.disconnections || [] },
        { sheetName: 'New Connections', data: comparisonData.new_connections || [] },
        { sheetName: 'Retained Active', data: comparisonData.retained || [] },
      ];

      tabsToExport.forEach(({ sheetName, data }) => {
        const rows = data.map((item, index) => ({
          'SL': index + 1,
          'Customer ID': item.customer_id || '',
          'Customer Name': item.full_name || '',
          'Address': item.add_combined || '',
          'Customer Type': item.customer_type || '',
          'Category': item.category || '',
          'Collector': item.collector_name || '',
          'Monthly Rent': Number(item.monthly_rent || 0),
          'Previous Dues': Number(item.previous_dues || 0),
          'Area': item.area_name || '',
          'Building': item.building_name || '',
          'Billing Month': item.billing_month || ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Note': 'No records available' }]);
        ws['!cols'] = [
          { wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 38 },
          { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 16 },
          { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const safeBase = (baseMonth || 'MonthA').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCompare = (compareMonth || 'MonthB').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `All_Connections_Audit_${safeBase}_vs_${safeCompare}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export all tabs to Excel:', err);
      alert('Failed to generate Excel file: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingDetails(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CSS Print Styles targeting #printable-comparison-report exclusively */}
      <style>{`
        @media print {
          aside, nav, header, footer, .no-print, .no-print * {
            display: none !important;
          }

          #printable-comparison-report,
          #printable-comparison-report * {
            visibility: visible !important;
          }

          #printable-comparison-report {
            display: block !important;
            position: static !important;
            width: 100% !important;
            color: #000000 !important;
            background: #ffffff !important;
            padding: 10px !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          #printable-comparison-report * {
            color: #000000 !important;
            background-color: transparent !important;
          }

          #printable-comparison-report .overflow-x-auto {
            overflow: visible !important;
            height: auto !important;
          }

          #printable-comparison-report table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
            margin-top: 15px !important;
          }

          #printable-comparison-report thead {
            display: table-header-group !important;
          }

          #printable-comparison-report tbody {
            display: table-row-group !important;
          }

          #printable-comparison-report tr {
            display: table-row !important;
            page-break-inside: avoid !important;
          }

          #printable-comparison-report th,
          #printable-comparison-report td {
            display: table-cell !important;
            color: #000000 !important;
            border: 1px solid #475569 !important;
            padding: 6px 10px !important;
            font-size: 10pt !important;
          }

          #printable-comparison-report th {
            background-color: #e2e8f0 !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
          }

          .print-kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 15px !important;
          }

          .print-kpi-card {
            border: 1px solid #64748b !important;
            border-radius: 6px !important;
            padding: 8px !important;
            background: #f8fafc !important;
          }
        }
      `}</style>

      {/* 1. Top Page Banner & Actions */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <GitCompare className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>Two-Month Connection Audit & Line Change Report</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                Comparison Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare customer IDs between two months to identify Disconnections (lost lines), New Connections (added lines), and Net Churn.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchComparisonReport}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            title="Refresh Comparison"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Month Selector Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          
          {/* Base Month Selector (Month A) */}
          <div className="flex items-center space-x-2.5 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-rose-500/30">
            <Calendar className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-rose-300 font-bold">Base Month (Month A):</span>
            <select
              value={baseMonth}
              onChange={(e) => setBaseMonth(e.target.value)}
              className="bg-transparent text-xs text-white font-extrabold outline-none cursor-pointer pr-2"
            >
              {months.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="text-slate-500 font-bold text-sm hidden sm:block">VS</div>

          {/* Compare Month Selector (Month B) */}
          <div className="flex items-center space-x-2.5 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-emerald-500/30">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-bold">Compare Month (Month B):</span>
            <select
              value={compareMonth}
              onChange={(e) => setCompareMonth(e.target.value)}
              className="bg-transparent text-xs text-white font-extrabold outline-none cursor-pointer pr-2"
            >
              {months.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              ))}
            </select>
          </div>

        </div>

        {baseMonth === compareMonth && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl font-semibold">
            ⚠️ Please select two different months for disconnection & new connection auditing.
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MASTER PRINTABLE CARD CONTAINER */}
      {/* ========================================================= */}
      <div id="printable-comparison-report" className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">

        {/* Printable Header Banner (Only visible during print) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                MONTHLY CUSTOMER CONNECTION AUDIT & COMPARISON REPORT
              </h1>
              <p className="text-xs text-slate-800 mt-1">
                Base Month (A): <span className="font-bold">{baseMonth}</span> • Compare Month (B): <span className="font-bold">{compareMonth}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-800">
              <p className="font-bold">AutoExcel Enterprise Engine</p>
              <p>Printed: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 3. Key Summary Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print-kpi-grid">
          
          {/* Base Month Total */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                {baseMonth || 'Month A'} Active
              </span>
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300 no-print">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white print:text-black">
                {loading ? '...' : comparisonData?.base_total_count?.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-700 mt-0.5">Base Month Subscribers</p>
            </div>
          </div>

          {/* Compare Month Total */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                {compareMonth || 'Month B'} Active
              </span>
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300 no-print">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white print:text-black">
                {loading ? '...' : comparisonData?.compare_total_count?.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-700 mt-0.5">Compare Month Subscribers</p>
            </div>
          </div>

          {/* Disconnections Lost (Red) */}
          <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider print:text-black">Disconnections</span>
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 no-print">
                <UserMinus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-300 print:text-black">
                {loading ? '...' : comparisonData?.disconnections_count?.toLocaleString()}
              </div>
              <p className="text-[10px] text-rose-300/80 print:text-slate-700 mt-0.5">Lost Lines (In {baseMonth} only)</p>
            </div>
          </div>

          {/* New Connections Added (Green) */}
          <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider print:text-black">New Connections</span>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 no-print">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-300 print:text-black">
                {loading ? '...' : comparisonData?.new_connections_count?.toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-300/80 print:text-slate-700 mt-0.5">Added Lines (In {compareMonth} only)</p>
            </div>
          </div>

          {/* Net Growth / Net Change */}
          <div className="glass-card p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 relative overflow-hidden sm:col-span-2 lg:col-span-1 print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider print:text-black">Net Growth</span>
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 no-print">
                {(comparisonData?.net_change || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-black print:text-black ${
                (comparisonData?.net_change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {loading ? '...' : (
                  <>
                    {(comparisonData?.net_change || 0) > 0 ? '+' : ''}
                    {comparisonData?.net_change?.toLocaleString()}
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-700 mt-0.5">Net Line Difference</p>
            </div>
          </div>

        </div>

        {/* 4. Sub-totals Breakdown Cards (Screen Only) */}
        {!loading && comparisonData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
            
            {/* Disconnections Breakdown */}
            <div className="glass-card p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-2">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <span className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                  <UserMinus className="w-4 h-4 text-rose-400" />
                  <span>Disconnections Breakdown ({baseMonth})</span>
                </span>
                <span className="text-xs font-extrabold text-rose-400">
                  {comparisonData.disconnections_count} Lost
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Digital</span>
                  <span className="font-extrabold text-indigo-300">{comparisonData.disconnections_stats?.digital_count || 0}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Analog</span>
                  <span className="font-extrabold text-sky-300">{comparisonData.disconnections_stats?.analog_count || 0}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Army</span>
                  <span className="font-extrabold text-emerald-300">{comparisonData.disconnections_stats?.army_count || 0}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Civil</span>
                  <span className="font-extrabold text-purple-300">{comparisonData.disconnections_stats?.civil_count || 0}</span>
                </div>
              </div>
            </div>

            {/* New Connections Breakdown */}
            <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>New Connections Breakdown ({compareMonth})</span>
                </span>
                <span className="text-xs font-extrabold text-emerald-400">
                  {comparisonData.new_connections_count} Added
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Digital</span>
                  <span className="font-extrabold text-indigo-300">{comparisonData.new_connections_stats?.digital_count || 0}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Analog</span>
                  <span className="font-extrabold text-sky-300">{comparisonData.new_connections_stats?.analog_count || 0}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Army</span>
                  <span className="font-extrabold text-emerald-300">{comparisonData.new_connections_stats?.army_count || 0}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400">Civil</span>
                  <span className="font-extrabold text-purple-300">{comparisonData.new_connections_stats?.civil_count || 0}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 5. Tabbed Data Tables & Search Toolbar */}
        <div className="space-y-4">
          
          {/* Section Sub-header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print pt-2">
            <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center space-x-2">
                <span>Connection Details Audit</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                  {activeTabTitle}: {filteredTabItems.length.toLocaleString()} Records
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Detailed customer-level audit records for {baseMonth} vs {compareMonth}. Use search, pagination, and Excel export below.
              </p>
            </div>
          </div>

          {/* Tab Selection, Search Input & Excel Export Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3 no-print">
            
            {/* Tab Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('disconnections')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'disconnections'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <UserMinus className="w-4 h-4" />
                <span>Disconnections ({comparisonData?.disconnections_count || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('new_connections')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'new_connections'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>New Connections ({comparisonData?.new_connections_count || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('retained')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'retained'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Retained ({comparisonData?.retained_count || 0})</span>
              </button>
            </div>

            {/* Right: Search Box & Excel Export Menu */}
            <div className="flex items-center space-x-2.5 w-full lg:w-auto">
              
              {/* Live Search Box */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ID, Name, Address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-500 transition placeholder:text-slate-500"
                />
              </div>

              {/* Excel Export Button & Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <div className="inline-flex rounded-xl shadow-lg shadow-emerald-600/10">
                  <button
                    onClick={() => handleExportDetailsExcel(false)}
                    disabled={exportingDetails || filteredTabItems.length === 0}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-l-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer"
                    title={`Export ${activeTabTitle} to Excel (.xlsx)`}
                  >
                    <FileSpreadsheet className={`w-4 h-4 ${exportingDetails ? 'animate-bounce' : ''}`} />
                    <span>Export Excel</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-700/80 text-[10px] font-mono text-emerald-100">
                      {filteredTabItems.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowExportMenu(prev => !prev)}
                    disabled={exportingDetails || currentTabItems.length === 0}
                    className="px-2 py-2 rounded-r-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 border-l border-emerald-500/40 text-white transition cursor-pointer"
                    title="Additional export options"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 py-1.5 text-xs animate-fade-in divide-y divide-slate-800">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          handleExportDetailsExcel(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Export Current Filtered List</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({filteredTabItems.length})</span>
                      </button>

                      {searchQuery.trim() && (
                        <button
                          onClick={() => {
                            setShowExportMenu(false);
                            handleExportDetailsExcel(true);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between transition cursor-pointer mt-0.5"
                        >
                          <span className="flex items-center space-x-2">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Export All in Tab (Unfiltered)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">({currentTabItems.length})</span>
                        </button>
                      )}
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          handleExportAllTabsExcel();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center space-x-2">
                          <Download className="w-3.5 h-3.5 text-purple-400" />
                          <span>Export All 3 Tabs Workbook</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({((comparisonData?.disconnections_count || 0) + (comparisonData?.new_connections_count || 0) + (comparisonData?.retained_count || 0)).toLocaleString()})
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Table Container */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden print:border-black bg-slate-950/40">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
                Auditing customer records between {baseMonth} and {compareMonth}...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-400 text-xs bg-rose-500/10 border-t border-rose-500/20">
                {error}
              </div>
            ) : filteredTabItems.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                        <th className="py-3.5 px-4">Customer ID</th>
                        <th className="py-3.5 px-4">Full Name</th>
                        <th className="py-3.5 px-4">Address</th>
                        <th className="py-3.5 px-4">Customer Type</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Collector</th>
                        <th className="py-3.5 px-4 text-right">Monthly Rent</th>
                      </tr>
                    </thead>

                    {/* Screen view: paginated rows */}
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 print:hidden">
                      {paginatedItems.map((item, idx) => {
                        const isDigital = item.customer_type?.toLowerCase().includes('digital');

                        return (
                          <tr key={`screen-${item.id || idx}`} className="hover:bg-slate-800/40 font-medium transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                              {item.customer_id}
                            </td>
                            <td className="py-3.5 px-4 text-white font-bold">
                              {item.full_name}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                              {item.add_combined}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isDigital
                                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                  : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                              }`}>
                                {item.customer_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                item.category === 'Civil'
                                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              }`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              {item.collector_name}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-100">
                              ৳{item.monthly_rent?.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Print view: ALL filtered rows so nothing is cut off when printing */}
                    <tbody className="hidden print:table-row-group">
                      {filteredTabItems.map((item, idx) => {
                        return (
                          <tr key={`print-${item.id || idx}`}>
                            <td className="py-2 px-3 font-mono font-bold text-black">
                              {item.customer_id}
                            </td>
                            <td className="py-2 px-3 text-black font-bold">
                              {item.full_name}
                            </td>
                            <td className="py-2 px-3 text-black">
                              {item.add_combined}
                            </td>
                            <td className="py-2 px-3 text-black">
                              {item.customer_type}
                            </td>
                            <td className="py-2 px-3 text-black">
                              {item.category}
                            </td>
                            <td className="py-2 px-3 text-black">
                              {item.collector_name}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-black">
                              ৳{item.monthly_rent?.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs no-print">
                  {/* Left: Counter & Page Size */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-slate-400">
                      Showing <span className="font-bold text-white">{totalItems > 0 ? startIndex + 1 : 0}</span> to{' '}
                      <span className="font-bold text-white">{endIndex}</span> of{' '}
                      <span className="font-bold text-white">{totalItems.toLocaleString()}</span> connections
                      {searchQuery.trim() && (
                        <span className="text-slate-500 text-[11px] ml-1">
                          (filtered from {currentTabItems.length.toLocaleString()} total)
                        </span>
                      )}
                    </span>

                    <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-700">
                      <span className="text-slate-400 text-xs">Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                      >
                        <option value={15} className="bg-slate-900">15</option>
                        <option value={25} className="bg-slate-900">25</option>
                        <option value={50} className="bg-slate-900">50</option>
                        <option value={100} className="bg-slate-900">100</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Page Navigation Buttons */}
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-1">
                      {/* First Page */}
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={safeCurrentPage === 1}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>

                      {/* Previous Page */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={safeCurrentPage === 1}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition flex items-center space-x-1 cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Prev</span>
                      </button>

                      {/* Page Number Buttons */}
                      <div className="flex items-center space-x-1 px-1">
                        {paginationRange.map((p, i) => {
                          if (p === '...') {
                            return <span key={`ellipsis-${i}`} className="px-1 text-slate-500">...</span>;
                          }
                          const isActive = p === safeCurrentPage;
                          return (
                            <button
                              key={`page-${p}`}
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                                isActive
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Page */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={safeCurrentPage === totalPages}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition flex items-center space-x-1 cursor-pointer"
                        title="Next Page"
                      >
                        <span className="hidden sm:inline text-xs">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safeCurrentPage === totalPages}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                        title="Last Page"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No records found for the selected view filter.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
