import React, { useState, useRef } from 'react';
import api from '../services/api';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Download, RefreshCw, Sliders, Play, ArrowUpDown, Plus, Trash2, ArrowUp, ArrowDown, Calendar } from 'lucide-react';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Automatically get real calendar current month & year (e.g. "October 2026")
const getCurrentCalendarMonth = () => {
  const now = new Date();
  return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
};

// Generate rolling list of months (2 months ahead down to 14 months past)
const getDynamicMonthOptions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const options = [];

  for (let offset = 2; offset >= -14; offset--) {
    const d = new Date(currentYear, now.getMonth() + offset, 1);
    const mStr = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (!options.includes(mStr)) {
      options.push(mStr);
    }
  }
  return options;
};

// Try to auto-detect month from uploaded filename (e.g. "Bill_October_2026.xlsx" -> "October 2026")
const detectMonthFromFileName = (fileName) => {
  if (!fileName) return null;
  const lower = fileName.toLowerCase();
  for (let idx = 0; idx < monthNames.length; idx++) {
    const m = monthNames[idx];
    const mLower = m.toLowerCase();
    const shortM = mLower.substring(0, 3);
    const regex = new RegExp(`\\b(${mLower}|${shortM})\\b`, 'i');
    if (regex.test(lower)) {
      const yearMatch = fileName.match(/\b(202[0-9]|203[0-9])\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
      return `${m} ${year}`;
    }
  }
  return null;
};

export default function FileUpload({ onProcessingSuccess, onOpenAuth, isAuthenticated }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const currentCalendarMonth = getCurrentCalendarMonth();
  const [billingMonth, setBillingMonth] = useState(currentCalendarMonth);
  const [monthOptions, setMonthOptions] = useState(getDynamicMonthOptions);

  // Advanced Sorting Rules State (Default: Area Name -> Building Name -> House No -> Flat No)
  const [showSortCustomizer, setShowSortCustomizer] = useState(false);
  const [sortRules, setSortRules] = useState([
    { column: 'Area Name', direction: 'asc' },
    { column: 'Building Name', direction: 'asc' },
    { column: 'House No', direction: 'asc' },
    { column: 'Flat No', direction: 'asc' },
  ]);

  const fileInputRef = useRef(null);

  const availableColumns = [
    'Area Name',
    'Building Name',
    'House No',
    'Flat No',
    'Collector Name',
    'Add',
    'Customer Type',
    'Full Name',
    'Monthly Rent',
    'Joining Date',
  ];

  const handleAddSortRule = () => {
    setSortRules([...sortRules, { column: 'Collector Name', direction: 'asc' }]);
  };

  const handleRemoveSortRule = (index) => {
    setSortRules(sortRules.filter((_, i) => i !== index));
  };

  const handleUpdateSortRule = (index, field, value) => {
    const updated = [...sortRules];
    updated[index][field] = value;
    setSortRules(updated);
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
        setFile(null);
        return;
      }
      setError(null);
      setFile(selectedFile);

      // Auto-detect month from file name if filename mentions a month (e.g. "bill_september_2026.xlsx")
      const detectedMonth = detectMonthFromFileName(selectedFile.name);
      if (detectedMonth) {
        setBillingMonth(detectedMonth);
        setMonthOptions((prev) => prev.includes(detectedMonth) ? prev : [detectedMonth, ...prev]);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sort_rules', JSON.stringify(sortRules));
    formData.append('billing_month', billingMonth);

    try {
      setProgressStep('Uploading & Analyzing Spreadsheet Structure...');
      await new Promise((r) => setTimeout(r, 400));

      setProgressStep('Parsing Addresses & Mapping Areas to Collectors...');
      await new Promise((r) => setTimeout(r, 400));

      setProgressStep('Applying Multi-Level Sorting (Area -> Building -> House -> Flat)...');
      
      const response = await api.post('/excel/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(response.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onProcessingSuccess) {
        onProcessingSuccess();
      }
    } catch (err) {
      console.error('Processing Error:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'An error occurred while processing the Excel file.'
      );
    } finally {
      setLoading(false);
      setProgressStep('');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Excel Upload & Formatting Engine</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Automated Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Drag & drop raw customer billing spreadsheets. Smart parser extracts addresses, routes Collectors, and formats currency.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Billing Month Tracker Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Target Billing Month & Year Tracker:</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <select
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="py-1.5 px-3 bg-slate-950 border border-slate-700 hover:border-indigo-500 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m} {m === currentCalendarMonth ? '(Current Month)' : ''}
                </option>
              ))}
            </select>

            {billingMonth !== currentCalendarMonth && (
              <button
                type="button"
                onClick={() => setBillingMonth(currentCalendarMonth)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                title="Reset to current calendar month"
              >
                Set Current
              </button>
            )}
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
              : file
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            {file ? (
              <>
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg animate-bounce">
                  <FileSpreadsheet className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Target Month: <span className="text-amber-300 font-bold">{billingMonth}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Drop your raw Excel file here, or <span className="text-indigo-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports .xlsx, .xls, .csv files up to 25MB • Target Month: <span className="text-amber-300 font-bold">{billingMonth}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custom Multi-Column Sorting Customizer */}
        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSortCustomizer(!showSortCustomizer)}
              className="flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-indigo-400 transition"
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Multi-Column Sorting Engine Rules ({sortRules.length} Active Rules)</span>
              <span className="text-[10px] text-indigo-400 font-semibold underline">
                {showSortCustomizer ? 'Hide Rules' : 'Customize Priorities'}
              </span>
            </button>

            <span className="text-[11px] text-slate-400 italic hidden sm:inline">
              Default Priority: Area Name ➔ Building Name ➔ House No ➔ Flat No
            </span>
          </div>

          {showSortCustomizer && (
            <div className="pt-3 border-t border-slate-800 space-y-3 animate-fade-in">
              <p className="text-xs text-slate-400">
                Drag or re-order priority rules. Rows will be sorted strictly in the sequential order defined below:
              </p>

              <div className="space-y-2">
                {sortRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="w-6 text-center text-slate-500 font-bold">{idx + 1}.</span>

                    <select
                      value={rule.column}
                      onChange={(e) => handleUpdateSortRule(idx, 'column', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>

                    <select
                      value={rule.direction}
                      onChange={(e) => handleUpdateSortRule(idx, 'direction', e.target.value)}
                      className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="asc">Ascending (A ➔ Z / 1 ➔ 9)</option>
                      <option value="desc">Descending (Z ➔ A / 9 ➔ 1)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveSortRule(idx)}
                      disabled={sortRules.length <= 1}
                      className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddSortRule}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sort Level</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSortRules([
                      { column: 'Area Name', direction: 'asc' },
                      { column: 'Building Name', direction: 'asc' },
                      { column: 'House No', direction: 'asc' },
                      { column: 'Flat No', direction: 'asc' },
                    ])
                  }
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Reset to Standard Rules
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={!file || loading}
          className="w-full py-3.5 px-6 gradient-bg hover:opacity-95 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{progressStep || 'Formatting & Sorting Excel File...'}</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Format, Sort & Generate Target Report ({billingMonth})</span>
            </>
          )}
        </button>
      </form>

      {/* Result Card */}
      {result && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">{result.message}</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Target Month: <span className="text-amber-300 font-bold">{billingMonth}</span> • {result.stats?.row_count?.toLocaleString()} Rows Formatted & Sorted
                </p>
                {result.meaningful_name && (
                  <p className="text-[11px] text-emerald-200 font-mono font-bold mt-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 inline-block">
                    {result.meaningful_name}
                  </p>
                )}
              </div>
            </div>

            <a
              href={result.download_url}
              download={result.meaningful_name || 'Formatted_Customer_Billing_Report.xlsx'}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg transition flex items-center space-x-2 shrink-0"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Download Formatted Excel</span>
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
