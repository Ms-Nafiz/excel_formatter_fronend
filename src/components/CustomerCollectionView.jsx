import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';
import {
  Receipt,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
  Calendar,
  Users,
  Wallet,
  ArrowUpDown,
  FileDown,
  X,
  Plus,
  Sliders,
  Sparkles,
  CreditCard,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function CustomerCollectionView({ refreshTrigger }) {
  // State for List & Filtering
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [metrics, setMetrics] = useState({
    total_amount: 0,
    total_count: 0,
    method_stats: [],
    collector_stats: [],
    unique_collectors: 0,
  });

  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableCollectors, setAvailableCollectors] = useState([]);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCollector, setSelectedCollector] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Upload Modal / Drawer State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadMode, setUploadMode] = useState('append'); // 'append' | 'replace'
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Demo Template Download State
  const [downloadingDemo, setDownloadingDemo] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Confirm Modal State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    title: '',
    message: '',
    action: null,
  });

  // Fetch Months and Filter Options on load
  useEffect(() => {
    fetchFilterOptions();
  }, [refreshTrigger]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/collections/months');
      const months = res.data?.months || [];
      const collectors = res.data?.collectors || [];
      const methods = res.data?.methods || [];
      const currentMonth = res.data?.current_month || '';

      setAvailableMonths(months);
      setAvailableCollectors(collectors);
      setAvailableMethods(methods);

      // Default upload month to current month
      if (!uploadMonth && currentMonth) {
        setUploadMonth(currentMonth);
      } else if (!uploadMonth && months.length > 0) {
        setUploadMonth(months[0]);
      }

      // If no month selected yet, default to first available month or ALL
      if (selectedMonth === 'ALL' && months.length > 0) {
        // Keep ALL or pick the latest month
        setSelectedMonth(currentMonth || months[0]);
      }
    } catch (err) {
      console.error('Failed to fetch collection filter options:', err);
    }
  };

  // Fetch Collections Data whenever filters or page changes
  useEffect(() => {
    fetchCollections();
  }, [selectedMonth, selectedCollector, selectedMethod, searchTerm, currentPage, refreshTrigger]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: 25,
      };

      if (selectedMonth && selectedMonth !== 'ALL') {
        params.billing_month = selectedMonth;
      }
      if (selectedCollector && selectedCollector !== 'ALL') {
        params.collector_name = selectedCollector;
      }
      if (selectedMethod && selectedMethod !== 'ALL') {
        params.payment_method = selectedMethod;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await api.get('/collections', { params });
      const collData = res.data?.collections;

      setCollections(collData?.data || []);
      setTotalPages(collData?.last_page || 1);
      setTotalRecords(collData?.total || 0);

      if (res.data?.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Download Demo Template Handler
  const handleDownloadDemoTemplate = async () => {
    setDownloadingDemo(true);
    try {
      const response = await api.get('/collections/sample-template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Customer_Collection_Sample_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download demo template file. Please try again.');
      console.error('Template download error:', err);
    } finally {
      setDownloadingDemo(false);
    }
  };

  // 2. Export Filtered Data to Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = {};
      if (selectedMonth && selectedMonth !== 'ALL') params.billing_month = selectedMonth;
      if (selectedCollector && selectedCollector !== 'ALL') params.collector_name = selectedCollector;
      if (selectedMethod && selectedMethod !== 'ALL') params.payment_method = selectedMethod;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await api.get('/collections/export', {
        params,
        responseType: 'blob',
      });

      const fileName = `Collections_${selectedMonth || 'All'}.xlsx`.replace(/\s+/g, '_');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export collections report.');
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // 3. File Upload & Processing
  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setUploadError('Please select a valid Excel (.xlsx, .xls) or CSV file.');
      setUploadFile(null);
      return;
    }
    setUploadError(null);
    setUploadFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select an Excel file to upload.');
      return;
    }
    if (!uploadMonth.trim()) {
      setUploadError('Please select or specify the Collection Month.');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('billing_month', uploadMonth.trim());
    formData.append('upload_mode', uploadMode);

    try {
      setUploadProgress('Reading & Analyzing Spreadsheet Rows...');
      await new Promise((r) => setTimeout(r, 300));

      setUploadProgress('Matching Customer IDs & Linking Master Profiles...');
      const res = await api.post('/collections/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadResult(res.data);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh filter options and data table
      await fetchFilterOptions();
      setSelectedMonth(uploadMonth.trim());
      fetchCollections();
    } catch (err) {
      setUploadError(err.response?.data?.message || err.response?.data?.error || 'Failed to upload collection file.');
    } finally {
      setUploadLoading(false);
      setUploadProgress('');
    }
  };

  // 4. Delete Single Record Handler
  const handleDeleteRecord = (record) => {
    setDeleteConfirm({
      isOpen: true,
      id: record.id,
      title: 'Delete Collection Entry?',
      message: `Are you sure you want to remove collection record for Customer ID "${record.customer_id}" (৳${Number(record.amount_paid).toLocaleString()})?`,
      action: async () => {
        try {
          await api.delete(`/collections/${record.id}`);
          fetchCollections();
          fetchFilterOptions();
        } catch (err) {
          alert('Failed to delete record: ' + (err.response?.data?.message || err.message));
        }
      },
    });
  };

  // 5. Clear Month Handler
  const handleClearMonth = () => {
    if (!selectedMonth || selectedMonth === 'ALL') return;

    setDeleteConfirm({
      isOpen: true,
      title: `Clear All Records for ${selectedMonth}?`,
      message: `Warning: This will permanently delete all customer collection entries recorded for "${selectedMonth}".`,
      action: async () => {
        try {
          await api.post('/collections/clear-month', { billing_month: selectedMonth });
          fetchFilterOptions();
          fetchCollections();
        } catch (err) {
          alert('Failed to clear month: ' + (err.response?.data?.message || err.message));
        }
      },
    });
  };

  // Helpers
  const fmtNum = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getMethodBadge = (method) => {
    const m = (method || 'Cash').toLowerCase();
    if (m.includes('bkash')) {
      return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    }
    if (m.includes('nagad')) {
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    }
    if (m.includes('rocket')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    if (m.includes('bank') || m.includes('cheque')) {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
    return 'bg-slate-700/50 text-slate-200 border-slate-600/40';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ========================================================= */}
      {/* 1. TOP HEADER BANNER & MAIN ACTIONS */}
      {/* ========================================================= */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Title & Description */}
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 flex-shrink-0 mt-0.5">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Customer Collection System
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase tracking-wider">
                  Excel Sync & Revenue Logs
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Upload daily or monthly customer collection spreadsheets, monitor total revenue, track receipts by collector, and download the standardized Excel format template.
              </p>
            </div>
          </div>

          {/* Right Action Buttons: Download Demo File & Upload Collection */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Download Demo Excel Template Button */}
            <button
              onClick={handleDownloadDemoTemplate}
              disabled={downloadingDemo}
              title="Download standardized demo Excel file with sample data and column instructions"
              className="py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {downloadingDemo ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <FileDown className="w-4 h-4 text-emerald-400" />
              )}
              <span>{downloadingDemo ? 'Generating...' : 'Download Demo Excel File'}</span>
            </button>

            {/* Upload Collection Excel Button */}
            <button
              onClick={() => {
                setShowUploadModal(!showUploadModal);
                setUploadResult(null);
                setUploadError(null);
              }}
              className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 cursor-pointer hover:scale-[1.02]"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>{showUploadModal ? 'Close Upload Box' : 'Upload Collection Excel'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* EXPANDABLE EXCEL UPLOAD PANEL */}
        {/* ========================================================= */}
        {showUploadModal && (
          <div className="mt-6 pt-6 border-t border-slate-800 animate-fade-in">
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Import Customer Collections from Excel</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Month Selector & Upload Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Select Collection Month *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={uploadMonth}
                      onChange={(e) => setUploadMonth(e.target.value)}
                      placeholder="e.g. September 2026"
                      list="upload-month-list"
                      className="w-full py-2.5 px-3 bg-slate-900 border border-slate-700 hover:border-emerald-500/50 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none transition"
                      required
                    />
                    <datalist id="upload-month-list">
                      {availableMonths.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Choose from existing months or type a custom month (e.g., September 2026).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import Behavior</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadMode('append')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        uploadMode === 'append'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Append Records
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('replace')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        uploadMode === 'replace'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Replace Month
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {uploadMode === 'append'
                      ? 'Adds records to any existing collections for this month.'
                      : 'Clears previous collections for this month before importing.'}
                  </p>
                </div>
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  uploadFile
                    ? 'border-emerald-500/70 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-emerald-500/50 bg-slate-900/60 hover:bg-slate-900/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex flex-col items-center space-y-2 text-xs">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <p className="font-extrabold text-white text-sm">{uploadFile.name}</p>
                    <p className="text-slate-400">{(uploadFile.size / 1024).toFixed(1)} KB • Ready for import</p>
                    <span className="text-[11px] text-emerald-400 font-bold underline">Click or drop to choose another file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-800 text-slate-400">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-slate-200">
                      Drop your collection Excel file here, or <span className="text-emerald-400 underline">browse</span>
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Supports .xlsx, .xls, .csv • Don't know the format?{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDemoTemplate();
                        }}
                        className="text-emerald-400 hover:underline font-bold"
                      >
                        Download Demo File
                      </button>
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Action Button & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400">
                  {uploadLoading && (
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{uploadProgress || 'Processing collection file...'}</span>
                    </div>
                  )}
                  {uploadError && (
                    <div className="flex items-center space-x-2 text-rose-400 font-bold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                  {uploadResult && (
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Successfully imported {uploadResult.total_inserted} records! Total: ৳{fmtNum(uploadResult.total_amount)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={uploadLoading || !uploadFile}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading || !uploadFile}
                    className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {uploadLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Process & Save Collections</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. KPI METRICS CARDS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Collected Amount */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Collections</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              ৳ {fmtNum(metrics.total_amount)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {selectedMonth === 'ALL' ? 'Across all months' : `For ${selectedMonth}`}
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Total Collection Receipts Count */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Collection Entries</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {metrics.total_count?.toLocaleString() || 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Total payment receipts
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 3: Active Collectors Count */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Active Collectors</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {metrics.unique_collectors || 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Collectors with receipts
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 4: Payment Methods Breakdown */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Payment Methods</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1 overflow-y-auto max-h-14 pr-1">
            {metrics.method_stats?.length > 0 ? (
              metrics.method_stats.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">{m.payment_method || 'Cash'}:</span>
                  <span className="text-emerald-400 font-bold">৳{fmtNum(m.total_amount)}</span>
                </div>
              ))
            ) : (
              <span className="text-[11px] text-slate-500 italic">No collections yet</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. FILTER & SEARCH CONTROLS BAR */}
      {/* ========================================================= */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left Filter Group */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Month Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-bold">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 px-3 bg-slate-900 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Collector Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-bold">Collector:</span>
            <select
              value={selectedCollector}
              onChange={(e) => {
                setSelectedCollector(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 px-3 bg-slate-900 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer max-w-[160px]"
            >
              <option value="ALL">All Collectors</option>
              {availableCollectors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-bold">Method:</span>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 px-3 bg-slate-900 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="ALL">All Methods</option>
              {availableMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Search Box */}
          <div className="relative min-w-[180px] sm:min-w-[240px] flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by ID, Name, Address, MR#, Collector..."
              className="w-full py-2 pl-9 pr-8 bg-slate-900/90 border border-slate-700 hover:border-emerald-500/50 focus:border-emerald-500 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: Export to Excel & Clear Month */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleExportExcel}
            disabled={exporting || totalRecords === 0}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
            title="Export current view to Excel"
          >
            {exporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Export Excel</span>
          </button>

          {selectedMonth !== 'ALL' && totalRecords > 0 && (
            <button
              onClick={handleClearMonth}
              className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              title={`Clear all records for ${selectedMonth}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Clear {selectedMonth}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. DATA TABLE SECTION */}
      {/* ========================================================= */}
      <div className="glass-card rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-300 select-none">
                <th className="py-3 px-3 w-12 text-center border-r border-slate-800">#</th>
                <th className="py-3 px-3 border-r border-slate-800">Customer ID</th>
                <th className="py-3 px-3 border-r border-slate-800">Customer Name</th>
                <th className="py-3 px-3 border-r border-slate-800">Address</th>
                <th className="py-3 px-3 border-r border-slate-800">Month</th>
                <th className="py-3 px-3 border-r border-slate-800">Payment Date</th>
                <th className="py-3 px-3 border-r border-slate-800 text-right">Amount (৳)</th>
                <th className="py-3 px-3 border-r border-slate-800 text-center">Method</th>
                <th className="py-3 px-3 border-r border-slate-800">Collector</th>
                <th className="py-3 px-3 border-r border-slate-800">Receipt No</th>
                <th className="py-3 px-3 border-r border-slate-800">Remarks</th>
                <th className="py-3 px-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="font-bold">Loading collection logs...</span>
                    </div>
                  </td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Receipt className="w-10 h-10 text-slate-600" />
                      <div className="space-y-1">
                        <p className="font-bold text-white text-sm">No collection records found</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Upload an Excel file with collection details or adjust the active filters above.
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 pt-2">
                        <button
                          onClick={handleDownloadDemoTemplate}
                          className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Get Demo Template</span>
                        </button>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center space-x-1.5 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                collections.map((item, idx) => {
                  const sl = (currentPage - 1) * 25 + (idx + 1);
                  const dateStr = item.payment_date
                    ? new Date(item.payment_date).toLocaleDateString('en-GB')
                    : 'N/A';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-center border-r border-slate-800 text-slate-500 font-mono text-[11px]">
                        {sl}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 font-bold text-indigo-300 font-mono">
                        {item.customer_id}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 font-medium text-white">
                        {item.customer_name || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-slate-300 text-[11px] max-w-[220px] truncate" title={item.address || item.area_name || ''}>
                        {item.address ? (
                          <span>{item.address}</span>
                        ) : item.area_name ? (
                          <span className="text-emerald-400/80 font-medium">{item.area_name}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-slate-400 whitespace-nowrap">
                        {item.billing_month}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-right font-black text-emerald-400 font-mono">
                        ৳ {fmtNum(item.amount_paid)}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getMethodBadge(item.payment_method)}`}>
                          {item.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-slate-200 font-semibold">
                        {item.collector_name || 'Unassigned'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-slate-400 font-mono text-[11px]">
                        {item.receipt_no || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-slate-400 text-[11px] truncate max-w-[180px]" title={item.remarks || ''}>
                        {item.remarks || '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteRecord(item)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                          title="Delete this record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Total Row */}
            {collections.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950 font-black border-t-2 border-slate-700 text-white text-xs">
                  <td colSpan={6} className="py-3 px-3 text-right border-r border-slate-800 text-slate-300 uppercase tracking-wider">
                    Total Collections in Current Filter:
                  </td>
                  <td className="py-3 px-3 text-right border-r border-slate-800 text-emerald-400 text-sm font-black font-mono">
                    ৳ {fmtNum(metrics.total_amount)}
                  </td>
                  <td colSpan={5} className="py-3 px-3 text-slate-400 font-medium">
                    {metrics.total_count} Total Receipts Recorded
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {collections.length} of {totalRecords} collections
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg font-bold text-white transition disabled:opacity-40 flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="font-bold text-white px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg font-bold text-white transition disabled:opacity-40 flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.action || (() => {})}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '', message: '', action: null })}
      />
    </div>
  );
}
