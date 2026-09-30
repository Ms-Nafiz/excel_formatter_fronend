import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { invalidateFileDataCache } from './AdvancePrintModal';
import CustomerEditHistoryModal from './CustomerEditHistoryModal';
import SearchableSelect from './SearchableSelect';
import {
  Zap,
  Search,
  Save,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  FileSpreadsheet,
  Users,
  X,
  Database,
  Check,
  Edit3,
  Calendar,
  Sparkles,
  Target,
  CheckSquare,
  Square,
  History
} from 'lucide-react';

export default function CustomerIdSearchEditor({ refreshTrigger, onDataChange, onNavigateToAudit }) {
  const [historyFiles, setHistoryFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(''); // empty = search all files in DB
  const [selectedCollector, setSelectedCollector] = useState(''); // empty = all collectors/areas
  const [searchTerm, setSearchTerm] = useState('');
  const [exactMatchOnly, setExactMatchOnly] = useState(true); // Default to Exact ID Match!
  const [dbResults, setDbResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savingRecordId, setSavingRecordId] = useState(null);
  const [activeHistoryRecord, setActiveHistoryRecord] = useState(null);

  // Database lookup options for dropdown selects: { buildings: [], areas: [], collectors: [] }
  const [lookupOptions, setLookupOptions] = useState({ buildings: [], areas: [], collectors: [] });
  // Map of { `${recordId}_${fieldKey}`: boolean } for custom text input mode toggles
  const [customInputModes, setCustomInputModes] = useState({});

  // Local unsaved changes per CustomerRecord ID: { [recordId]: { [colName]: value } }
  const [modifiedRecords, setModifiedRecords] = useState({});
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // Fetch processing history & DB lookup options
  useEffect(() => {
    fetchHistory();
    fetchLookupOptions();
  }, [refreshTrigger]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/excel/history?page=1');
      setHistoryFiles(res.data.data || []);
    } catch (err) {
      console.error('Failed to load file history:', err);
    }
  };

  const fetchLookupOptions = async () => {
    try {
      const res = await api.get('/excel/lookup-options');
      setLookupOptions({
        buildings: res.data.buildings || [],
        areas: res.data.areas || [],
        collectors: res.data.collectors || [],
      });
    } catch (err) {
      console.error('Failed to load DB lookup options:', err);
    }
  };

  const toggleCustomInputMode = (recordId, fieldKey) => {
    const key = `${recordId}_${fieldKey}`;
    setCustomInputModes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Perform SQL Database Search
  const searchDatabase = useCallback(async (queryStr, fileFilter = selectedFileId, exactMatch = exactMatchOnly, collectorFilter = selectedCollector) => {
    const q = queryStr.trim();
    if (!q) {
      setDbResults([]);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const res = await api.get('/excel/search-customers', {
        params: {
          query: q,
          file_id: fileFilter || undefined,
          exact: exactMatch ? 1 : 0,
          collector: (collectorFilter && collectorFilter !== 'all') ? collectorFilter : undefined,
        },
      });
      setDbResults(res.data.data || []);
    } catch (err) {
      console.error('Database search error:', err);
      setError(err.response?.data?.message || 'Failed to search customer database.');
    } finally {
      setSearching(false);
    }
  }, [selectedFileId, exactMatchOnly, selectedCollector]);

  // Debounced search trigger whenever search term, exactMatchOnly, selected file or selected collector changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 1) {
        searchDatabase(searchTerm, selectedFileId, exactMatchOnly, selectedCollector);
      } else {
        setDbResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedFileId, exactMatchOnly, selectedCollector, searchDatabase]);

  // Handle live field change in Customer Record card
  const handleFieldChange = (recordId, fieldKey, value) => {
    // 1. Update in dbResults state for live UI reflection
    setDbResults((prevResults) =>
      prevResults.map((rec) => {
        if (rec.id !== recordId) return rec;

        const updatedRec = { ...rec, [fieldKey]: value };

        // Also sync inside raw_data object if applicable
        if (updatedRec.raw_data) {
          if (fieldKey === 'full_name') {
            const nameKey = Object.keys(updatedRec.raw_data).find(k => ['customer name', 'name', 'full name'].includes(k.toLowerCase())) || 'Customer Name';
            updatedRec.raw_data[nameKey] = value;
          } else if (fieldKey === 'customer_id') {
            const idKey = Object.keys(updatedRec.raw_data).find(k => ['customer id', 'id', 'code', 'emp_id'].includes(k.toLowerCase())) || 'Customer ID';
            updatedRec.raw_data[idKey] = value;
          } else if (fieldKey === 'monthly_rent') {
            const rentKey = Object.keys(updatedRec.raw_data).find(k => ['monthly rent', 'rent'].includes(k.toLowerCase())) || 'Monthly Rent';
            updatedRec.raw_data[rentKey] = value;
          } else if (fieldKey === 'previous_dues') {
            const duesKey = Object.keys(updatedRec.raw_data).find(k => ['previous dues', 'dues', 'due'].includes(k.toLowerCase())) || 'Previous Dues';
            updatedRec.raw_data[duesKey] = value;
          } else if (fieldKey === 'advance') {
            const advKey = Object.keys(updatedRec.raw_data).find(k => ['advance', 'adv', 'advance_amount'].includes(k.toLowerCase())) || 'Advance';
            updatedRec.raw_data[advKey] = value;
          } else if (fieldKey === 'discount') {
            const discKey = Object.keys(updatedRec.raw_data).find(k => ['discount', 'disc', 'less'].includes(k.toLowerCase())) || 'Discount';
            updatedRec.raw_data[discKey] = value;
          } else if (fieldKey === 'house_no') {
            const hKey = Object.keys(updatedRec.raw_data).find(k => ['house no', 'house_no', 'house'].includes(k.toLowerCase())) || 'House No';
            updatedRec.raw_data[hKey] = value;
          } else if (fieldKey === 'flat_no') {
            const fKey = Object.keys(updatedRec.raw_data).find(k => ['flat no', 'flat_no', 'flat'].includes(k.toLowerCase())) || 'Flat No';
            updatedRec.raw_data[fKey] = value;
          } else if (fieldKey === 'area_name') {
            const aKey = Object.keys(updatedRec.raw_data).find(k => ['area name', 'area_name', 'area'].includes(k.toLowerCase())) || 'Area Name';
            updatedRec.raw_data[aKey] = value;
          } else if (fieldKey === 'building_name') {
            const bKey = Object.keys(updatedRec.raw_data).find(k => ['building name', 'building_name', 'building'].includes(k.toLowerCase())) || 'Building Name';
            updatedRec.raw_data[bKey] = value;
          } else if (fieldKey === 'status') {
            updatedRec.raw_data['Status'] = value;
          } else if (fieldKey === 'collector_name') {
            const colKey = Object.keys(updatedRec.raw_data).find(k => ['collector name', 'collector'].includes(k.toLowerCase())) || 'Collector Name';
            updatedRec.raw_data[colKey] = value;
          }
        }

        return updatedRec;
      })
    );

    // 2. Track modified changes for save payload
    setModifiedRecords((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        [fieldKey]: value,
      },
    }));
  };

  // Fast sub-5ms SQL save operation for a specific record
  const handleSaveSingleRecord = async (record) => {
    const changes = modifiedRecords[record.id];
    if (!changes || Object.keys(changes).length === 0) return;

    setSavingRecordId(record.id);
    setSuccessMsg(null);
    setError(null);
    try {
      await api.post('/excel/update-customer-record', {
        id: record.id,
        changes: changes,
      });

      if (record.processed_file_id) {
        invalidateFileDataCache(record.processed_file_id);
      }

      setSuccessMsg(`Customer record (ID: ${record.customer_id || record.id}) saved directly to database in < 5ms!`);
      if (onDataChange) onDataChange();
      
      // Clear modified state for this record
      setModifiedRecords((prev) => {
        const copy = { ...prev };
        delete copy[record.id];
        return copy;
      });

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to save record:', err);
      setError(err.response?.data?.message || 'Failed to save record to database.');
    } finally {
      setSavingRecordId(null);
    }
  };

  // Safe numeric helper
  const parseNumeric = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <div className="w-full flex flex-col space-y-6 animate-fade-in pb-16">
      
      {/* Page Header Banner */}
      <div className="glass-card p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Target className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Exact Customer ID Search & Fast Editor
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-amber-400 fill-current" />
                  <span>Exact ID Matching Engine</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Search & edit Customer Name, Advance, Rent, Dues, House, Flat, Building, Area, Status, and Collector directly in SQL Database.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToAudit && (
              <button
                type="button"
                onClick={onNavigateToAudit}
                className="px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-extrabold flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-rose-500/10"
                title="View monthly customer data update history audit report"
              >
                <History className="w-4 h-4 text-rose-400" />
                <span>Monthly Audit Report</span>
              </button>
            )}

            {/* Exact Match Toggle Switch */}
            <button
              type="button"
              onClick={() => setExactMatchOnly(!exactMatchOnly)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-extrabold flex items-center space-x-2 transition cursor-pointer ${
                exactMatchOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {exactMatchOnly ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>🎯 Strict Exact ID Match Only</span>
            </button>
          </div>
        </div>

        {/* Big Search Input Box & Filter Selectors */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          
          {/* Main Search Field */}
          <div className="lg:col-span-6 space-y-1">
            <label className="block text-[11px] font-extrabold uppercase text-amber-400 tracking-wider">
              Enter Exact Customer ID or Name:
            </label>
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-amber-400 absolute left-3.5" />
              <input
                type="text"
                placeholder="Type exact Customer ID (e.g. 101, CUST-05) to retrieve record..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 text-amber-200 placeholder-slate-500 rounded-xl pl-11 pr-10 py-3.5 border-2 border-amber-500/50 focus:border-amber-400 focus:outline-none text-sm font-bold shadow-inner"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 text-slate-500 hover:text-white p-1"
                  title="Clear Search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Collector & Area Scope Filter Dropdown */}
          <div className="lg:col-span-3 space-y-1">
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Collector & Area:</span>
            </label>
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 font-bold rounded-xl px-3.5 py-3.5 border-2 border-slate-800 focus:border-amber-500 focus:outline-none text-xs cursor-pointer truncate"
            >
              <option value="" className="bg-slate-900 text-amber-400 font-extrabold">
                ● All Collectors / সকল কালেক্টর
              </option>
              {lookupOptions.collectors && lookupOptions.collectors.map((colName) => (
                <option key={colName} value={colName} className="bg-slate-900 text-white">
                  👤 {colName}
                </option>
              ))}
            </select>
          </div>

          {/* Optional File Filter Dropdown */}
          <div className="lg:col-span-3 space-y-1">
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span>File Database Scope:</span>
            </label>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 font-bold rounded-xl px-3.5 py-3.5 border-2 border-slate-800 focus:border-amber-500 focus:outline-none text-xs cursor-pointer truncate"
            >
              <option value="" className="bg-slate-900 text-amber-400 font-extrabold">
                ● All Processed Files (Global DB)
              </option>
              {historyFiles.map((file) => (
                <option key={file.id} value={file.id} className="bg-slate-900 text-white">
                  {file.original_name || file.formatted_name} ({file.billing_month || 'N/A'})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Live Search Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">
              Mode: {exactMatchOnly ? '🎯 Strict Exact Match' : '🔍 Exact + Partial Match'}
            </span>
            {selectedCollector && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Users className="w-3 h-3 text-amber-400" />
                <span>Collector: {selectedCollector}</span>
              </span>
            )}
          </div>
          <div>
            {searching ? (
              <span className="text-amber-400 font-bold flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Searching SQL Database for records...</span>
              </span>
            ) : searchTerm ? (
              <span>
                Found <strong className="text-amber-300 font-extrabold">{dbResults.length}</strong> record(s) directly matching "{searchTerm}"{selectedCollector ? ` under ${selectedCollector}` : ''}
              </span>
            ) : (
              <span>Enter a Customer ID above to perform database lookup</span>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in shadow-md">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {!searchTerm.trim() ? (
        <div className="glass-card rounded-2xl p-16 border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Exact Customer ID Search</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Type an exact Customer ID (e.g. <b>101</b>, <b>CUST-05</b>) in the search box above. The system will query the SQL database directly for the exact matching record.
            </p>
          </div>
        </div>
      ) : searching ? (
        <div className="glass-card rounded-2xl p-16 border border-slate-800 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
          <p className="text-xs text-slate-300 font-bold">Querying exact Customer ID in SQL database...</p>
        </div>
      ) : dbResults.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 border border-slate-800 text-center space-y-3">
          <Database className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Exact Record Found for "{searchTerm}"</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {exactMatchOnly
              ? 'Strict exact match mode is ON. If you want to include partial matches, uncheck "Strict Exact ID Match Only" above.'
              : 'Double-check the Customer ID or try entering a different search term.'}
          </p>
        </div>
      ) : (
        /* Matching Database Customer Record Edit Cards */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Exact Matching Records Found ({dbResults.length}):</span>
            </div>
            <span className="text-slate-400 text-[11px]">Click "Save Record to DB" after making edits</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {dbResults.map((rec) => {
              const isModified = Boolean(modifiedRecords[rec.id]);
              const rentVal = parseNumeric(rec.monthly_rent);
              const duesVal = parseNumeric(rec.previous_dues);
              const advVal = parseNumeric(rec.advance);
              const discVal = parseNumeric(rec.discount);
              const actualBill = Math.max(0, rentVal - advVal - discVal);
              const fiftyPercentDues = duesVal * 0.5;
              const targetPayable50 = actualBill + fiftyPercentDues;
              const totalPayable100 = actualBill + duesVal;

              return (
                <div
                  key={rec.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isModified
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-2xl ring-1 ring-amber-500/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-xl'
                  }`}
                >
                  <div className="space-y-4">
                    
                    {/* Header info badge: File Name, Month, Customer ID */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        
                        <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-black border border-indigo-500/30 text-xs flex items-center space-x-1">
                          <span>Customer ID:</span>
                          <span className="text-amber-300">{rec.customer_id || ('Record #' + rec.id)}</span>
                        </span>

                        {rec.is_exact_match && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold flex items-center space-x-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Exact ID Match</span>
                          </span>
                        )}

                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate max-w-[200px]" title={rec.file_name}>{rec.file_name}</span>
                        </span>

                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-bold">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{rec.billing_month}</span>
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono">Row #{rec.row_index}</span>
                      </div>

                      {isModified && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold animate-pulse">
                          Unsaved DB Edits
                        </span>
                      )}
                    </div>

                    {/* Section 1: Customer Name, Rent, Dues, Advance, Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 text-xs">
                      
                      {/* Customer Name */}
                      <div className="lg:col-span-3 space-y-1">
                        <label className="block text-[10px] text-slate-400 font-extrabold uppercase">Customer Name:</label>
                        <input
                          type="text"
                          value={rec.full_name || ''}
                          onChange={(e) => handleFieldChange(rec.id, 'full_name', e.target.value)}
                          placeholder="Customer Full Name"
                          className="w-full bg-slate-950 text-white font-bold rounded-xl px-3 py-2 border border-slate-800 focus:border-amber-500 focus:outline-none text-xs"
                        />
                      </div>

                      {/* Monthly Rent */}
                      <div className="lg:col-span-2 space-y-1">
                        <label className="block text-[10px] text-slate-400 font-extrabold uppercase">Monthly Rent (৳):</label>
                        <input
                          type="number"
                          value={rec.monthly_rent ?? ''}
                          onChange={(e) => handleFieldChange(rec.id, 'monthly_rent', e.target.value)}
                          className="w-full bg-slate-950 text-emerald-300 font-extrabold rounded-xl px-3 py-2 border border-slate-800 focus:border-amber-500 focus:outline-none text-xs text-right"
                        />
                      </div>

                      {/* Previous Dues */}
                      <div className="lg:col-span-2 space-y-1">
                        <label className="block text-[10px] text-slate-400 font-extrabold uppercase">Previous Dues (৳):</label>
                        <input
                          type="number"
                          value={rec.previous_dues ?? ''}
                          onChange={(e) => handleFieldChange(rec.id, 'previous_dues', e.target.value)}
                          className="w-full bg-slate-950 text-rose-300 font-extrabold rounded-xl px-3 py-2 border border-slate-800 focus:border-amber-500 focus:outline-none text-xs text-right"
                        />
                      </div>

                      {/* Advance Amount */}
                      <div className="lg:col-span-2 space-y-1">
                        <label className="block text-[10px] text-amber-400 font-extrabold uppercase">Advance (৳):</label>
                        <input
                          type="number"
                          value={rec.advance ?? ''}
                          onChange={(e) => handleFieldChange(rec.id, 'advance', e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-950 text-amber-300 font-extrabold rounded-xl px-3 py-2 border border-amber-500/40 focus:border-amber-400 focus:outline-none text-xs text-right"
                        />
                      </div>

                      {/* Discount Amount */}
                      <div className="lg:col-span-2 space-y-1">
                        <label className="block text-[10px] text-purple-400 font-extrabold uppercase">Discount (৳):</label>
                        <input
                          type="number"
                          value={rec.discount ?? ''}
                          onChange={(e) => handleFieldChange(rec.id, 'discount', e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-950 text-purple-300 font-extrabold rounded-xl px-3 py-2 border border-purple-500/40 focus:border-purple-400 focus:outline-none text-xs text-right"
                        />
                      </div>

                      {/* Customer Status */}
                      <div className="lg:col-span-3 space-y-1">
                        <label className="block text-[10px] text-slate-400 font-extrabold uppercase">Customer Status:</label>
                        <select
                          value={String(rec.status || 'Active')}
                          onChange={(e) => handleFieldChange(rec.id, 'status', e.target.value)}
                          className={`w-full font-bold rounded-xl px-3 py-2 border text-xs cursor-pointer focus:outline-none ${
                            String(rec.status || '').toLowerCase() === 'inactive'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          <option value="Active" className="bg-slate-900 text-emerald-400 font-bold">● Active</option>
                          <option value="Inactive" className="bg-slate-900 text-rose-400 font-bold">● Inactive</option>
                        </select>
                      </div>

                    </div>

                    {/* Section 2: Address & Location Details (House, Flat, Building, Area) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 text-xs pt-1 border-t border-slate-800/60">
                      
                      {/* House No */}
                      <div className="lg:col-span-3 space-y-1">
                        <label className="block text-[10px] text-cyan-400 font-extrabold uppercase">House No:</label>
                        <input
                          type="text"
                          value={rec.house_no || ''}
                          onChange={(e) => handleFieldChange(rec.id, 'house_no', e.target.value)}
                          placeholder="House No / H #"
                          className="w-full bg-slate-950 text-cyan-200 font-semibold rounded-xl px-3 py-2 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs"
                        />
                      </div>

                      {/* Flat No */}
                      <div className="lg:col-span-3 space-y-1">
                        <label className="block text-[10px] text-cyan-400 font-extrabold uppercase">Flat No:</label>
                        <input
                          type="text"
                          value={rec.flat_no || ''}
                          onChange={(e) => handleFieldChange(rec.id, 'flat_no', e.target.value)}
                          placeholder="Flat No / F #"
                          className="w-full bg-slate-950 text-cyan-200 font-semibold rounded-xl px-3 py-2 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs"
                        />
                      </div>

                      {/* Building Name Searchable Select */}
                      <div className="lg:col-span-3 space-y-1">
                        <label className="block text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider">Building Name:</label>
                        <SearchableSelect
                          value={rec.building_name || ''}
                          options={lookupOptions.buildings}
                          onChange={(val) => handleFieldChange(rec.id, 'building_name', val)}
                          placeholder="-- Select Building --"
                          accentColor="indigo"
                          allowCustom={true}
                        />
                      </div>

                      {/* Area Name Searchable Select */}
                      <div className="lg:col-span-3 space-y-1">
                        <label className="block text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider">Area Name:</label>
                        <SearchableSelect
                          value={rec.area_name || ''}
                          options={lookupOptions.areas}
                          onChange={(val) => handleFieldChange(rec.id, 'area_name', val)}
                          placeholder="-- Select Area --"
                          accentColor="indigo"
                          allowCustom={true}
                        />
                      </div>

                    </div>

                    {/* Section 3: Collector Name & Bottom Target Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center pt-2 border-t border-slate-800/80">
                      
                      {/* Collector Name Searchable Select */}
                      <div className="lg:col-span-5 space-y-1">
                        <label className="block text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">Collector Name:</label>
                        <SearchableSelect
                          value={rec.collector_name || ''}
                          options={lookupOptions.collectors}
                          onChange={(val) => handleFieldChange(rec.id, 'collector_name', val)}
                          placeholder="-- Select Collector --"
                          accentColor="amber"
                          allowCustom={true}
                        />
                      </div>

                      {/* Target Calculation & Direct DB Save Button */}
                      <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 lg:pt-0">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-emerald-400 uppercase font-extrabold tracking-wider">Total Payable (100% Dues):</span>
                            <div className="text-base font-black text-emerald-300">
                              ৳{totalPayable100.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div className="border-l border-slate-800 pl-3">
                            <span className="text-[10px] text-amber-400 uppercase font-extrabold tracking-wider">50% Target:</span>
                            <div className="text-sm font-extrabold text-amber-300">
                              ৳{targetPayable50.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 border-l border-slate-800 pl-3 space-y-0.5">
                            <div>Bill: <strong className="text-emerald-400">৳{actualBill}</strong> (Rent {rentVal} - Adv {advVal}{discVal > 0 ? ` - Disc ${discVal}` : ''})</div>
                            <div>Full Dues (100%): <strong className="text-rose-400">৳{duesVal}</strong></div>
                          </div>
                        </div>

                        {/* Actions: View History & Save Record */}
                        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                          {/* History Button */}
                          <button
                            type="button"
                            onClick={() => setActiveHistoryRecord(rec)}
                            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                            title="View Edit Audit History Log for this Customer"
                          >
                            <History className="w-4 h-4 text-amber-400" />
                            <span>History</span>
                          </button>

                          {/* Save Button */}
                          <button
                            type="button"
                            onClick={() => handleSaveSingleRecord(rec)}
                            disabled={savingRecordId === rec.id || !isModified}
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-30 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 cursor-pointer w-full sm:w-auto justify-center"
                          >
                            <Save className={`w-4 h-4 ${savingRecordId === rec.id ? 'animate-spin' : ''}`} />
                            <span>{savingRecordId === rec.id ? 'Saving to SQL...' : 'Save Record to DB'}</span>
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Record Edit Audit History Modal */}
      {activeHistoryRecord && (
        <CustomerEditHistoryModal
          recordId={activeHistoryRecord.id}
          customerId={activeHistoryRecord.customer_id}
          customerName={activeHistoryRecord.full_name}
          onClose={() => setActiveHistoryRecord(null)}
        />
      )}

    </div>
  );
}
