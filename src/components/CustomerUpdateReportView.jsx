import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import {
  History,
  Calendar,
  RefreshCw,
  Download,
  Printer,
  Search,
  Users,
  Clock,
  User,
  ArrowRight,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Tag
} from 'lucide-react';

export default function CustomerUpdateReportView({ refreshTrigger, onNavigateToEditor }) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [monthsData, setMonthsData] = useState({ update_months: [], billing_months: [] });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [filterBy, setFilterBy] = useState('update_month'); // 'update_month' | 'billing_month' | 'all'
  const [latestOnly, setLatestOnly] = useState(true); // Default: show only latest change per customer field
  const [selectedField, setSelectedField] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data state
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState(null);

  // Dropdown menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

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

  // 1. Fetch available months on mount or refresh
  useEffect(() => {
    fetchMonths();
  }, [refreshTrigger]);

  const fetchMonths = async () => {
    try {
      const res = await api.get('/excel/customer-update-months');
      const data = res.data || { update_months: [], billing_months: [] };
      setMonthsData(data);

      if (!selectedMonth) {
        if (data.update_months && data.update_months.length > 0) {
          setSelectedMonth(data.update_months[0].label);
        } else if (data.billing_months && data.billing_months.length > 0) {
          setSelectedMonth(data.billing_months[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load update months:', err);
    }
  };

  // 2. Fetch report data whenever filters, latestOnly, or pagination change
  useEffect(() => {
    fetchReport();
  }, [selectedMonth, filterBy, selectedField, latestOnly, currentPage, pageSize, refreshTrigger]);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchReport();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/excel/customer-update-report', {
        params: {
          month: selectedMonth,
          filter_by: filterBy,
          field: selectedField,
          search: searchQuery,
          latest_only: latestOnly,
          page: currentPage,
          per_page: pageSize,
        }
      });

      setLogs(res.data?.logs || []);
      setStats(res.data?.stats || null);
      setTotalCount(res.data?.total || 0);
      setLastPage(res.data?.last_page || 1);
    } catch (err) {
      console.error('Failed to fetch update report:', err);
      setError(err.response?.data?.message || 'Failed to fetch customer update audit report.');
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Client-side Excel Export using SheetJS
  const handleExportExcel = async (exportAll = true) => {
    setExporting(true);
    try {
      let recordsToExport = logs;

      // If user wants to export ALL records for the selected month/filters
      if (exportAll) {
        const res = await api.get('/excel/customer-update-report', {
          params: {
            month: selectedMonth,
            filter_by: filterBy,
            field: selectedField,
            search: searchQuery,
            latest_only: latestOnly,
            all: true,
          }
        });
        recordsToExport = res.data?.logs || [];
      }

      if (!recordsToExport || recordsToExport.length === 0) {
        alert('No audit logs available to export for the selected filter.');
        setExporting(false);
        return;
      }

      const rows = recordsToExport.map((item, index) => {
        const billingM = item.customer_record?.billing_month 
          || item.processed_file?.billing_month 
          || 'N/A';

        return {
          'SL': index + 1,
          'Edit Date & Time': formatTimestamp(item.created_at),
          'Customer ID': item.customer_id || '',
          'Customer Name': item.customer_name || '',
          'Field Changed': item.field_name || '',
          'Old Value': item.old_value !== null && item.old_value !== '' ? item.old_value : '(empty)',
          'New Value': item.new_value !== null && item.new_value !== '' ? item.new_value : '(empty)',
          'Total Edits': item.edit_count || 1,
          'Edited By': item.edited_by || 'Admin',
          'Billing Month': billingM,
          'Collector': item.customer_record?.collector_name || 'N/A',
          'Address': item.customer_record?.add_combined || 'N/A',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      ws['!cols'] = [
        { wch: 6 },  // SL
        { wch: 22 }, // Edit Date & Time
        { wch: 16 }, // Customer ID
        { wch: 28 }, // Customer Name
        { wch: 18 }, // Field Changed
        { wch: 18 }, // Old Value
        { wch: 18 }, // New Value
        { wch: 14 }, // Total Edits
        { wch: 20 }, // Edited By
        { wch: 16 }, // Billing Month
        { wch: 22 }, // Collector
        { wch: 35 }, // Address
      ];

      const wb = XLSX.utils.book_new();
      const sheetTitle = (selectedMonth || 'All_Months').substring(0, 31).replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

      const safeMonth = (selectedMonth || 'All_Months').replace(/\s+/g, '_');
      const safeField = selectedField !== 'all' ? `_${selectedField.replace(/\s+/g, '_')}` : '';
      const modeSuffix = latestOnly ? '_Latest_Only' : '_All_Edits';
      const fileName = `Customer_Update_Audit_${safeMonth}${safeField}${modeSuffix}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export update report to Excel:', err);
      alert('Failed to generate Excel file: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  // Server-side export fallback (PhpSpreadsheet)
  const handleServerExportExcel = async () => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const res = await api.get('/excel/customer-update-export', {
        params: {
          month: selectedMonth,
          filter_by: filterBy,
          field: selectedField,
          search: searchQuery,
          latest_only: latestOnly,
        }
      });

      if (res.data?.download_url) {
        window.open(res.data.download_url, '_blank');
      }
    } catch (err) {
      console.error('Server export failed:', err);
      alert('Failed to export report via server.');
    } finally {
      setExporting(false);
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Dynamic pagination range with ellipsis
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= lastPage; i++) {
      if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
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
  }, [currentPage, lastPage]);

  // All distinct field names seen in stats for filter dropdown
  const availableFields = useMemo(() => {
    const baseFields = [
      'Previous Dues',
      'Monthly Rent',
      'Status',
      'Collector Name',
      'Advance',
      'Discount',
      'House No',
      'Flat No',
      'Area Name',
      'Building Name',
    ];
    const statFields = stats?.top_fields?.map(f => f.field_name) || [];
    return Array.from(new Set([...baseFields, ...statFields]));
  }, [stats]);

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          aside, nav, header, footer, .no-print, .no-print * {
            display: none !important;
          }
          #printable-update-report, #printable-update-report * {
            visibility: visible !important;
          }
          #printable-update-report {
            display: block !important;
            position: static !important;
            width: 100% !important;
            color: #000000 !important;
            background: #ffffff !important;
            padding: 10px !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          #printable-update-report * {
            color: #000000 !important;
            background-color: transparent !important;
          }
          #printable-update-report table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
          }
          #printable-update-report th, #printable-update-report td {
            border: 1px solid #475569 !important;
            padding: 6px 8px !important;
            font-size: 9.5pt !important;
          }
          #printable-update-report th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          .print-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 15px !important;
          }
          .print-stat-box {
            border: 1px solid #64748b !important;
            padding: 8px !important;
            background: #f8fafc !important;
            border-radius: 6px !important;
          }
        }
      `}</style>

      {/* 1. Top Page Banner & Action Buttons */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/20">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>Customer Update Audit & Change Logs</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                Old vs New History
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a month to inspect all customer field edits, old values, new values, editors, and timestamps with Excel export.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Refresh Button */}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export to Excel Button with Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <div className="inline-flex rounded-xl shadow-lg shadow-emerald-600/20">
              <button
                onClick={() => handleExportExcel(true)}
                disabled={exporting || loading || totalCount === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-l-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer"
                title="Export entire month update logs to Excel"
              >
                <FileSpreadsheet className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
                <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
                {totalCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-700/80 text-[10px] font-mono text-emerald-100">
                    {totalCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                disabled={exporting || loading || totalCount === 0}
                className="px-2.5 py-2 rounded-r-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 border-l border-emerald-500/40 text-white transition cursor-pointer"
                title="More export options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 py-1.5 text-xs animate-fade-in divide-y divide-slate-800">
                <div className="p-1">
                  <button
                    onClick={() => handleExportExcel(true)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export All in Month (.xlsx)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({totalCount})</span>
                  </button>

                  <button
                    onClick={() => handleExportExcel(false)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between transition cursor-pointer mt-0.5"
                  >
                    <span className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Export Current Page ({logs.length})</span>
                    </span>
                  </button>
                </div>

                <div className="p-1">
                  <button
                    onClick={handleServerExportExcel}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center space-x-2 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Export via Server Engine</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 2. Month Selector Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Month Selector Dropdown */}
          <div className="flex items-center space-x-2.5 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-amber-500/30">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300 font-bold">Select Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-white font-extrabold outline-none cursor-pointer pr-2"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Months (Show All)</option>
              
              {monthsData.update_months?.length > 0 && (
                <optgroup label="Months with Updates" className="bg-slate-900 text-amber-300 font-bold">
                  {monthsData.update_months.map((m) => (
                    <option key={`up-${m.label}`} value={m.label} className="bg-slate-900 text-slate-200 font-medium">
                      {m.label} ({m.count} logs)
                    </option>
                  ))}
                </optgroup>
              )}

              {monthsData.billing_months?.length > 0 && (
                <optgroup label="Customer Billing Months" className="bg-slate-900 text-indigo-300 font-bold">
                  {monthsData.billing_months.map((m) => (
                    <option key={`bill-${m}`} value={m} className="bg-slate-900 text-slate-200 font-medium">
                      {m}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Filter Mode Toggle */}
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Filter by:</span>
            <button
              onClick={() => {
                setFilterBy('update_month');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterBy === 'update_month'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Update Date
            </button>
            <button
              onClick={() => {
                setFilterBy('billing_month');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterBy === 'billing_month'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Billing Month
            </button>
          </div>

          {/* Mode Toggle: Latest Change Only vs All Edit Logs */}
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Changes:</span>
            <button
              onClick={() => {
                setLatestOnly(true);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                latestOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show only the most recent change for each customer field"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Latest Change Only</span>
            </button>
            <button
              onClick={() => {
                setLatestOnly(false);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                !latestOnly
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show full history of all edits"
            >
              All Edit Logs
            </button>
          </div>

        </div>

        {/* Selected Month Badge / Counter */}
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>Active Filter:</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 font-bold text-white border border-slate-700">
            {selectedMonth === 'all' ? 'All Months' : selectedMonth}
          </span>
          <span className="text-amber-400 font-bold">
            ({totalCount} {latestOnly ? 'distinct changes' : 'total logs'})
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MASTER PRINTABLE REPORT CARD CONTAINER */}
      {/* ========================================================= */}
      <div id="printable-update-report" className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">

        {/* Printable Header Banner (Only visible during print) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                CUSTOMER DATA UPDATE & EDIT AUDIT REPORT
              </h1>
              <p className="text-xs text-slate-800 mt-1">
                Month: <span className="font-bold">{selectedMonth}</span> • Filter Mode: <span className="font-bold">{filterBy === 'billing_month' ? 'Billing Month' : 'Update Date'}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-800">
              <p className="font-bold">AutoExcel Enterprise Engine</p>
              <p>Total Records: {totalCount} | Printed: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 3. Key Summary KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-stats-grid">
          
          {/* Total Updates */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden print-stat-box">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                Total Modifications
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 no-print">
                <History className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-300 print:text-black">
                {loading ? '...' : (stats?.total_updates ?? totalCount).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-700 mt-0.5">
                Field changes logged in {selectedMonth === 'all' ? 'total' : selectedMonth}
              </p>
            </div>
          </div>

          {/* Unique Customers Modified */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden print-stat-box">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                Unique Customers
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 no-print">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white print:text-black">
                {loading ? '...' : (stats?.unique_customers || 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-700 mt-0.5">
                Distinct customer IDs edited
              </p>
            </div>
          </div>

          {/* Top Field Changed */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden print-stat-box">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                Top Edited Field
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 no-print">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-black text-emerald-300 truncate print:text-black" title={stats?.top_fields?.[0]?.field_name || 'N/A'}>
                {loading ? '...' : (stats?.top_fields?.[0]?.field_name || 'None')}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-700 mt-0.5">
                {stats?.top_fields?.[0] ? `${stats.top_fields[0].count} edits logged` : 'No data'}
              </p>
            </div>
          </div>

          {/* Active Editors / Users */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden print-stat-box">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                Primary Editor
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 no-print">
                <User className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-black text-purple-300 truncate print:text-black" title={stats?.top_editors?.[0]?.edited_by || 'Admin'}>
                {loading ? '...' : (stats?.top_editors?.[0]?.edited_by || 'Admin User')}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-700 mt-0.5">
                {stats?.top_editors?.[0] ? `${stats.top_editors[0].count} edits by user` : 'Active audit trail'}
              </p>
            </div>
          </div>

        </div>

        {/* 4. Filter & Search Toolbar */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 no-print">
            
            {/* Field Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-semibold">Field Filter:</span>
              <select
                value={selectedField}
                onChange={(e) => {
                  setSelectedField(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-amber-500 cursor-pointer font-bold"
              >
                <option value="all">All Fields ({totalCount})</option>
                {availableFields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Customer ID, Name, Value, User..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-amber-500 transition placeholder:text-slate-500"
              />
            </div>

          </div>

          {/* 5. Audit Records Table */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden print:border-black bg-slate-950/40">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-3" />
                Loading customer update history audit logs for {selectedMonth}...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-400 text-xs bg-rose-500/10 border-t border-rose-500/20">
                {error}
              </div>
            ) : logs.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Customer ID</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Field Changed</th>
                        <th className="py-3 px-4">Old Value</th>
                        <th className="py-3 px-2 text-center"></th>
                        <th className="py-3 px-4">New Value</th>
                        <th className="py-3 px-4">Edited By</th>
                        <th className="py-3 px-4">Billing Month</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                      {logs.map((item, idx) => {
                        const rec = item.customer_record;
                        const billingM = rec?.billing_month || item.processed_file?.billing_month || 'N/A';

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-800/40 font-medium transition">
                            
                            {/* Timestamp */}
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px] print:text-black">
                              <span className="flex items-center space-x-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500 no-print" />
                                <span>{formatTimestamp(item.created_at)}</span>
                              </span>
                            </td>

                            {/* Customer ID */}
                            <td className="py-3 px-4 font-mono font-bold text-amber-300 print:text-black whitespace-nowrap">
                              {item.customer_id || ('ID #' + item.customer_record_id)}
                            </td>

                            {/* Customer Name */}
                            <td className="py-3 px-4 text-white font-bold max-w-xs truncate print:text-black" title={item.customer_name}>
                              {item.customer_name || 'N/A'}
                            </td>

                            {/* Field Name */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold print:border-black print:text-black">
                                {item.field_name}
                              </span>
                            </td>

                            {/* Old Value */}
                            <td className="py-3 px-4 max-w-xs">
                              <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono text-[11px] truncate print:border-black print:text-black" title={item.old_value || '(empty)'}>
                                {item.old_value !== null && item.old_value !== '' ? item.old_value : <em className="text-slate-600 font-normal">None</em>}
                              </div>
                              {latestOnly && item.edit_count > 1 && item.initial_old_value !== undefined && item.initial_old_value !== item.old_value && (
                                <div className="text-[10px] text-slate-500 mt-0.5 no-print" title={`Initial value before ${item.edit_count} edits was: ${item.initial_old_value}`}>
                                  Initial: <span className="line-through">{item.initial_old_value}</span>
                                </div>
                              )}
                            </td>

                            {/* Arrow Indicator */}
                            <td className="py-3 px-2 text-center text-amber-400 no-print">
                              <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                            </td>

                            {/* New Value */}
                            <td className="py-3 px-4 max-w-xs">
                              <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[11px] truncate print:border-black print:text-black" title={item.new_value || '(empty)'}>
                                {item.new_value !== null && item.new_value !== '' ? item.new_value : <em className="text-slate-600 font-normal">Cleared</em>}
                              </div>
                              {latestOnly && item.edit_count > 1 && (
                                <div className="text-[10px] text-amber-400 font-semibold mt-0.5 no-print flex items-center space-x-1" title={`Modified ${item.edit_count} times in total. Showing latest change.`}>
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                    {item.edit_count} edits
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Edited By */}
                            <td className="py-3 px-4 text-slate-300 whitespace-nowrap print:text-black">
                              <span className="flex items-center space-x-1.5">
                                <User className="w-3.5 h-3.5 text-indigo-400 no-print" />
                                <span>{item.edited_by || 'Admin'}</span>
                              </span>
                            </td>

                            {/* Billing Month */}
                            <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap print:text-black">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                                {billingM}
                              </span>
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
                      Showing <span className="font-bold text-white">{totalCount > 0 ? startIndex + 1 : 0}</span> to{' '}
                      <span className="font-bold text-white">{endIndex}</span> of{' '}
                      <span className="font-bold text-white">{totalCount.toLocaleString()}</span> update logs
                      {searchQuery.trim() && (
                        <span className="text-slate-500 text-[11px] ml-1">
                          (search filtered)
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
                        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs outline-none focus:border-amber-500 cursor-pointer font-semibold"
                      >
                        <option value={15} className="bg-slate-900">15</option>
                        <option value={25} className="bg-slate-900">25</option>
                        <option value={50} className="bg-slate-900">50</option>
                        <option value={100} className="bg-slate-900">100</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Page Navigation Buttons */}
                  {lastPage > 1 && (
                    <div className="flex items-center space-x-1">
                      {/* First Page */}
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>

                      {/* Previous Page */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
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
                          const isActive = p === currentPage;
                          return (
                            <button
                              key={`page-${p}`}
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                                isActive
                                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
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
                        onClick={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))}
                        disabled={currentPage === lastPage}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition flex items-center space-x-1 cursor-pointer"
                        title="Next Page"
                      >
                        <span className="hidden sm:inline text-xs">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => setCurrentPage(lastPage)}
                        disabled={currentPage === lastPage}
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
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No Customer Modifications Found</h4>
                <p className="text-slate-500 max-w-sm mx-auto">
                  No data update history recorded for {selectedMonth} with the selected filters.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
