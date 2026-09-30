import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  PieChart,
  Users,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Tv,
  Radio,
  Layers,
  Filter,
  Printer
} from 'lucide-react';

// In-memory module cache for instant 0ms tab switching
const summaryCache = {};

export default function CustomerSummaryView({ refreshTrigger }) {
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [fileList, setFileList] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch available target months and files list on load or refresh
  useEffect(() => {
    fetchInitialOptions();
  }, [refreshTrigger]);

  const fetchInitialOptions = async () => {
    try {
      const monthsRes = await api.get('/excel/target-months');
      const availMonths = monthsRes.data?.months || [];
      const currentM = monthsRes.data?.current_month || (availMonths[0] ?? '');
      setMonths(availMonths);
      if (!selectedMonth) {
        setSelectedMonth(currentM);
      }

      const historyRes = await api.get('/excel/history');
      const files = historyRes.data?.data || historyRes.data || [];
      setFileList(files.filter(f => f.status === 'completed'));
    } catch (err) {
      console.error('Failed to load summary options:', err);
    }
  };

  useEffect(() => {
    fetchSummaryData(false);
  }, [selectedMonth, selectedFileId]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      Object.keys(summaryCache).forEach(k => delete summaryCache[k]);
      fetchSummaryData(true);
    }
  }, [refreshTrigger]);

  const fetchSummaryData = async (forceRefresh = false) => {
    const cacheKey = `${selectedFileId || ''}_${selectedMonth || ''}`;
    if (!forceRefresh && summaryCache[cacheKey]) {
      setSummaryData(summaryCache[cacheKey]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedFileId) {
        params.file_id = selectedFileId;
      } else if (selectedMonth && selectedMonth !== 'ALL') {
        params.billing_month = selectedMonth;
      }

      const res = await api.get('/excel/customer-summary', { params });
      const data = res.data?.data || null;
      summaryCache[cacheKey] = data;
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to fetch customer summary:', err);
      setError('Could not load active customer summary data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const computedStats = useMemo(() => {
    if (!summaryData?.summary_items || summaryData.summary_items.length === 0) {
      return {
        grandActive: 0,
        digitalActive: 0,
        analogActive: 0,
        totalFirstChild: 0,
        totalSecondChild: 0,
        totalThirdChild: 0,
        totalChild: 0,
        combinedTotal: 0,
        items: []
      };
    }

    let grandActive = 0;
    let digitalActive = 0;
    let analogActive = 0;
    let totalFirstChild = 0;
    let totalSecondChild = 0;
    let totalThirdChild = 0;
    let totalChild = 0;

    summaryData.summary_items.forEach((item) => {
      const isDigital = item.customer_type?.toLowerCase().includes('digital');
      const active = Number(item.active_count) || 0;
      const first = isDigital ? (Number(item.first_child_count) || 0) : 0;
      const second = isDigital ? (Number(item.second_child_count) || 0) : 0;
      const third = isDigital ? (Number(item.third_child_count) || 0) : 0;
      const childSum = isDigital ? (Number(item.total_child_count) || 0) : 0;

      grandActive += active;
      if (isDigital) {
        digitalActive += active;
      } else {
        analogActive += active;
      }
      totalFirstChild += first;
      totalSecondChild += second;
      totalThirdChild += third;
      totalChild += childSum;
    });

    return {
      grandActive,
      digitalActive,
      analogActive,
      totalFirstChild,
      totalSecondChild,
      totalThirdChild,
      totalChild,
      combinedTotal: grandActive + totalChild,
      items: summaryData.summary_items
    };
  }, [summaryData]);

  const selectedFileName = useMemo(() => {
    if (!selectedFileId) return null;
    const f = fileList.find(item => String(item.id) === String(selectedFileId));
    return f ? f.original_name : null;
  }, [selectedFileId, fileList]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CSS Print Styles targeting #printable-customer-summary exclusively */}
      <style>{`
        @media print {
          aside, nav, header, footer, .no-print, .no-print * {
            display: none !important;
          }

          #printable-customer-summary,
          #printable-customer-summary * {
            visibility: visible !important;
          }

          #printable-customer-summary {
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

          #printable-customer-summary * {
            color: #000000 !important;
            background-color: transparent !important;
          }

          #printable-customer-summary .overflow-x-auto {
            overflow: visible !important;
            height: auto !important;
          }

          #printable-customer-summary table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
            margin-top: 15px !important;
          }

          #printable-customer-summary thead {
            display: table-header-group !important;
          }

          #printable-customer-summary tbody {
            display: table-row-group !important;
          }

          #printable-customer-summary tr {
            display: table-row !important;
            page-break-inside: avoid !important;
          }

          #printable-customer-summary th,
          #printable-customer-summary td {
            display: table-cell !important;
            color: #000000 !important;
            border: 1px solid #475569 !important;
            padding: 6px 10px !important;
            font-size: 10pt !important;
          }

          #printable-customer-summary th {
            background-color: #e2e8f0 !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
          }

          #printable-customer-summary tr.grand-total-row {
            background-color: #cbd5e1 !important;
            font-weight: bold !important;
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
      
      {/* 1. Header Banner & Actions (Screen View) */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <PieChart className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>Customer Summary Dashboard</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                Active Only
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active customer metrics categorized by Customer Type (Digital/Analog) & Category (Army/Civil) with Child Connection breakdown.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSummaryData}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
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

      {/* 2. Filter & Selection Toolbar (Screen View) */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Month Selector */}
          <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 font-semibold">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedFileId('');
              }}
              className="bg-transparent text-xs text-slate-100 font-bold outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Billing Months</option>
              {months.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Specific File Selector (Optional) */}
          <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400 font-semibold">Specific File:</span>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="bg-transparent text-xs text-slate-100 font-bold outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Files in Selected Scope</option>
              {fileList
                .filter(f => !selectedMonth || selectedMonth === 'ALL' || f.billing_month === selectedMonth)
                .map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                    {f.original_name} ({f.billing_month || 'N/A'})
                  </option>
                ))}
            </select>
          </div>

        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-1">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Active Status Filter Enabled</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MASTER PRINTABLE CARD CONTAINER */}
      {/* ========================================================= */}
      <div id="printable-customer-summary" className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">

        {/* Printable Header Banner (Only visible during print) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                ACTIVE CUSTOMER TYPE & CATEGORY SUMMARY REPORT
              </h1>
              <p className="text-xs text-slate-800 mt-1">
                Filter Scope: <span className="font-bold">{selectedMonth === 'ALL' ? 'All Billing Months' : (selectedMonth || 'All Months')}</span>
                {selectedFileName ? ` • File: ${selectedFileName}` : ''}
              </p>
            </div>
            <div className="text-right text-xs text-slate-800">
              <p className="font-bold">AutoExcel Enterprise Engine</p>
              <p>Printed: {new Date().toLocaleString()}</p>
              <p className="font-semibold text-emerald-800 mt-0.5">Filter: Status = Active</p>
            </div>
          </div>
        </div>

        {/* 3. Top Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print-kpi-grid">
          
          {/* Total Active Customers */}
          <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider print:text-black">Total Active</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 no-print">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white print:text-black">
                {loading ? '...' : computedStats.grandActive.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 print:text-slate-700 mt-0.5">Primary Active Subscribers</p>
            </div>
          </div>

          {/* Digital Active */}
          <div className="glass-card p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider print:text-black">Digital Active</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 no-print">
                <Tv className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white print:text-black">
                {loading ? '...' : computedStats.digitalActive.toLocaleString()}
              </div>
              <p className="text-[11px] text-indigo-300/80 print:text-slate-700 mt-0.5">Digital Set-top Box Users</p>
            </div>
          </div>

          {/* Analog Active */}
          <div className="glass-card p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider print:text-black">Analog Active</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 no-print">
                <Radio className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white print:text-black">
                {loading ? '...' : computedStats.analogActive.toLocaleString()}
              </div>
              <p className="text-[11px] text-sky-300/80 print:text-slate-700 mt-0.5">Analog Cable Subscribers</p>
            </div>
          </div>

          {/* Total Child Connections */}
          <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider print:text-black">Total Child</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 no-print">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white print:text-black">
                {loading ? '...' : computedStats.totalChild.toLocaleString()}
              </div>
              <p className="text-[11px] text-amber-300/80 print:text-slate-700 mt-0.5">1st, 2nd & 3rd+ Extra Boxes</p>
            </div>
          </div>

          {/* Grand Total (Active + Child) */}
          <div className="glass-card p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 relative overflow-hidden sm:col-span-2 lg:col-span-1 print-kpi-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-300 uppercase tracking-wider print:text-black">Active + Child Total</span>
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 no-print">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-cyan-200 print:text-black">
                {loading ? '...' : computedStats.combinedTotal.toLocaleString()}
              </div>
              <p className="text-[11px] text-cyan-300/80 print:text-slate-700 mt-0.5">Cumulative Active Connections</p>
            </div>
          </div>

        </div>

        {/* 4. Type & Category Visual Breakdown Cards (Screen Only) */}
        {!loading && computedStats.items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            {computedStats.items.map((item, idx) => {
              const isDigital = item.customer_type?.toLowerCase().includes('digital');
              const percentOfActive = computedStats.grandActive > 0
                ? Math.round(((item.active_count || 0) / computedStats.grandActive) * 100)
                : 0;

              return (
                <div key={idx} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      isDigital
                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                    }`}>
                      {item.customer_type}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      item.category === 'Civil'
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {item.category}
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-white flex items-baseline justify-between">
                      <span>{item.active_count?.toLocaleString()}</span>
                      <span className="text-xs font-bold text-slate-400">{percentOfActive}% of Active</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDigital ? 'bg-indigo-500' : 'bg-sky-400'
                        }`}
                        style={{ width: `${percentOfActive}%` }}
                      />
                    </div>
                  </div>

                  {/* Digital Child details */}
                  {isDigital && (
                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[11px]">
                      <div className="text-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="block text-slate-400 text-[10px]">1st Child</span>
                        <span className="font-bold text-indigo-300">{item.first_child_count || 0}</span>
                      </div>
                      <div className="text-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="block text-slate-400 text-[10px]">2nd Child</span>
                        <span className="font-bold text-purple-300">{item.second_child_count || 0}</span>
                      </div>
                      <div className="text-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="block text-slate-400 text-[10px]">3rd Child</span>
                        <span className="font-bold text-amber-300">{item.third_child_count || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Detailed Customer Summary Matrix Table Container */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden print:border-black">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between no-print">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Active Customer Type & Category Matrix</h3>
                <p className="text-xs text-slate-400">
                  Detailed Breakdown of Active Customers and Connection Hierarchy
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs no-print">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
              Calculating active customer summary matrix...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-400 text-xs bg-rose-500/10 border-t border-rose-500/20 no-print">
              {error}
            </div>
          ) : computedStats.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                    <th className="py-4 px-6">Customer Type</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6 text-right text-slate-200 font-bold">Main Active</th>
                    <th className="py-4 px-6 text-right text-indigo-300">1st Child</th>
                    <th className="py-4 px-6 text-right text-purple-300">2nd Child</th>
                    <th className="py-4 px-6 text-right text-amber-300">3rd Child (3-10)</th>
                    <th className="py-4 px-6 text-right text-emerald-300">Total Child</th>
                    <th className="py-4 px-6 text-right text-cyan-300 font-extrabold">Active + Child</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {computedStats.items.map((item, idx) => {
                    const isDigital = item.customer_type?.toLowerCase().includes('digital');
                    const combinedRow = (item.active_count || 0) + (isDigital ? (item.total_child_count || 0) : 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 font-medium transition">
                        <td className="py-4 px-6 text-slate-200 font-bold flex items-center space-x-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${isDigital ? 'bg-indigo-400 shadow-sm shadow-indigo-400' : 'bg-sky-400 shadow-sm shadow-sky-400'} no-print`} />
                          <span className="text-sm">{item.customer_type}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.category === 'Civil'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-slate-100 font-black text-sm">
                          {item.active_count?.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right text-indigo-300 font-bold">
                          {isDigital ? (item.first_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-4 px-6 text-right text-purple-300 font-bold">
                          {isDigital ? (item.second_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-4 px-6 text-right text-amber-300 font-bold">
                          {isDigital ? (item.third_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-4 px-6 text-right text-emerald-400 font-extrabold text-sm">
                          {isDigital ? (item.total_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-4 px-6 text-right text-cyan-300 font-black text-base">
                          {combinedRow.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-900 font-black text-white border-t-2 border-slate-800 grand-total-row">
                    <td colSpan={2} className="py-4 px-6 text-indigo-400 tracking-wider text-sm">
                      GRAND TOTAL (ALL ACTIVE SUBSCRIBERS)
                    </td>
                    <td className="py-4 px-6 text-right text-slate-100 text-base font-black">
                      {computedStats.grandActive.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right text-indigo-300 font-extrabold">
                      {computedStats.totalFirstChild.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right text-purple-300 font-extrabold">
                      {computedStats.totalSecondChild.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right text-amber-300 font-extrabold">
                      {computedStats.totalThirdChild.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right text-emerald-400 font-black text-base">
                      {computedStats.totalChild.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right text-cyan-300 text-lg font-black">
                      {computedStats.combinedTotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs no-print">
              No active customers found for the selected month or file filters.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
