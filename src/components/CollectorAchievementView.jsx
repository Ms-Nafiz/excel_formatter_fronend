import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Award,
  Trophy,
  Target,
  TrendingUp,
  Receipt,
  Download,
  RefreshCw,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Filter,
  BarChart3,
  Flame,
  UserCheck,
  Building,
  DollarSign
} from 'lucide-react';

export default function CollectorAchievementView({ refreshTrigger }) {
  // State
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    total_target: 0,
    total_collected: 0,
    overall_achievement_rate: 0,
    total_remaining: 0,
    total_customers: 0,
    total_collections_count: 0,
    top_performer: null
  });
  const [errorMessage, setErrorMessage] = useState(null);

  // Search & Filter & Sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Achieved' | 'On Track' | 'In Progress' | 'Needs Attention'
  const [sortBy, setSortBy] = useState('rank'); // 'rank' | 'achievement' | 'target' | 'collected' | 'remaining' | 'name'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Fetch Achievement Report
  const fetchReport = async (monthOverride = null) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const monthToFetch = monthOverride !== null ? monthOverride : selectedMonth;
      const params = {};
      if (monthToFetch && monthToFetch !== 'ALL') {
        params.billing_month = monthToFetch;
      }

      const res = await api.get('/collections/achievement', { params });
      if (res.data && res.data.success) {
        setReportData(res.data.data || []);
        setSummary(res.data.summary || {});
        if (res.data.available_months && res.data.available_months.length > 0) {
          setAvailableMonths(res.data.available_months);
        }
        if (res.data.selected_month) {
          setSelectedMonth((prev) => prev || res.data.selected_month);
        }
      } else {
        setErrorMessage(res.data?.message || 'কালেকশন অর্জনের তথ্য লোড করতে সমস্যা হয়েছে।');
      }
    } catch (err) {
      console.error('Failed to fetch achievement report:', err);
      setErrorMessage('সার্ভার থেকে অর্জনের তথ্য আনতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, refreshTrigger]);

  // Handle Month Change
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    fetchReport(newMonth);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = {};
      if (selectedMonth) {
        params.billing_month = selectedMonth;
      }

      const response = await api.get('/collections/export-achievement', {
        params,
        responseType: 'blob'
      });

      const cleanMonth = (selectedMonth || 'Overall').replace(/\s+/g, '_');
      const filename = `Collector_Target_vs_Achievement_${cleanMonth}.xlsx`;

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('এক্সেল ফাইল এক্সপোর্ট করতে সমস্যা হয়েছে।');
    } finally {
      setExporting(false);
    }
  };

  // Handle Sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' || field === 'rank' ? 'asc' : 'desc');
    }
  };

  // Filtered & Sorted Collector List
  const filteredCollectors = useMemo(() => {
    let list = [...reportData];

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(item => 
        (item.collector_name || '').toLowerCase().includes(q) ||
        (item.status_label || '').toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      list = list.filter(item => item.status === statusFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rank':
          comparison = (b.achievement_rate || 0) - (a.achievement_rate || 0);
          break;
        case 'achievement':
          comparison = (a.achievement_rate || 0) - (b.achievement_rate || 0);
          break;
        case 'target':
          comparison = (a.assigned_target || 0) - (b.assigned_target || 0);
          break;
        case 'collected':
          comparison = (a.total_collected || 0) - (b.total_collected || 0);
          break;
        case 'remaining':
          comparison = (a.remaining_amount || 0) - (b.remaining_amount || 0);
          break;
        case 'name':
          comparison = (a.collector_name || '').localeCompare(b.collector_name || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [reportData, searchTerm, statusFilter, sortBy, sortOrder]);

  // Format Currencies
  const formatTk = (amount) => {
    return '৳ ' + Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Color helper for achievement percentages
  const getAchievementColor = (rate) => {
    if (rate >= 100) return 'text-emerald-400';
    if (rate >= 70) return 'text-teal-400';
    if (rate >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getAchievementBgGradient = (rate) => {
    if (rate >= 100) return 'from-emerald-500 to-green-500';
    if (rate >= 70) return 'from-teal-500 to-emerald-500';
    if (rate >= 40) return 'from-amber-500 to-yellow-500';
    return 'from-rose-500 to-red-500';
  };

  const getStatusBadge = (status, statusLabel) => {
    switch (status) {
      case 'Achieved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {statusLabel || 'Achieved (অর্জিত)'}
          </span>
        );
      case 'On Track':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <TrendingUp className="w-3.5 h-3.5" />
            {statusLabel || 'On Track (৭৯-৯৯%)'}
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            {statusLabel || 'In Progress (৪০-৬৯%)'}
          </span>
        );
      case 'Needs Attention':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            {statusLabel || 'Needs Attention (<৪০%)'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Banner & Actions */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-emerald-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  কালেক্টর টার্গেট ও কালেকশন অর্জনের ড্যাশবোর্ড
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Sparkles className="w-3 h-3" />
                  Target vs Actual %
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                মাস ভিত্তিক প্রতিটি কালেক্টরের বরাদ্দকৃত টার্গেট, প্রাপ্ত কালেকশন এবং শতকরা অর্জনের তুলনামূলক অগ্রগতি হিসাব।
              </p>
            </div>
          </div>

          {/* Action Bar: Month Selector & Export & Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Selector Dropdown */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 shadow-inner">
              <Calendar className="w-4 h-4 text-amber-400" />
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer pr-2"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchReport()}
              disabled={loading}
              title="রিফ্রেশ করুন"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={exporting || loading || reportData.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 border border-emerald-500/30 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>এক্সপোর্ট হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Excel Export</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Target Card */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">মোট টার্গেট (Target)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatTk(summary.total_target)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>সক্রিয় গ্রাহক:</span>
              <span className="font-semibold text-slate-200">{Number(summary.total_customers || 0).toLocaleString()} জন</span>
            </div>
          </div>
        </div>

        {/* Total Collected Card */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">মোট কালেকশন (Collected)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatTk(summary.total_collected)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>মোট রসিদ:</span>
              <span className="font-semibold text-slate-200">{Number(summary.total_collections_count || 0).toLocaleString()} টি</span>
            </div>
          </div>
        </div>

        {/* Overall Achievement Rate Card */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden group hover:border-teal-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">সামগ্রিক অর্জন (Achievement)</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black tracking-tight ${getAchievementColor(summary.overall_achievement_rate)}`}>
                {summary.overall_achievement_rate}%
              </span>
              <span className="text-xs text-slate-400">লক্ষ্যমাত্রা</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden border border-slate-700/50">
              <div
                className={`h-full bg-gradient-to-r ${getAchievementBgGradient(summary.overall_achievement_rate)} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(summary.overall_achievement_rate || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Remaining Deficit Card */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">অবশিষ্ট ঘাটতি (Remaining)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatTk(summary.total_remaining)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {summary.total_remaining <= 0 ? 'টার্গেট পূরণ সম্পন্ন!' : 'লক্ষ্য অর্জনে প্রয়োজন'}
            </div>
          </div>
        </div>

        {/* Top Performer Card */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/60 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              সেরা কালেক্টর (Top)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            {summary.top_performer ? (
              <>
                <div className="text-lg font-black text-white truncate" title={summary.top_performer.name}>
                  {summary.top_performer.name}
                </div>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="font-bold text-emerald-400">{summary.top_performer.achievement_rate}% অর্জন</span>
                  <span className="text-slate-400">{formatTk(summary.top_performer.collected)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 mt-2">কোন তথ্য নেই</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="কালেক্টরের নাম দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> ফিল্টার:
          </span>
          {[
            { key: 'ALL', label: 'সকল' },
            { key: 'Achieved', label: 'অর্জিত (≥১০০%)' },
            { key: 'On Track', label: 'সন্তোষজনক (৭০-৯৯%)' },
            { key: 'In Progress', label: 'চলমান (৪০-৬৯%)' },
            { key: 'Needs Attention', label: 'মনোযোগ প্রয়োজন (<৪০%)' },
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition duration-150 border ${
                statusFilter === pill.key
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Leaderboard & Achievement Table */}
      <div className="glass-card rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              কালেক্টর ভিত্তিক টার্গেট বনাম কালেকশন অগ্রগতি তালিকা
            </h2>
            <span className="text-xs text-slate-400 ml-1">
              ({filteredCollectors.length} জন কালেক্টর)
            </span>
          </div>
          <div className="text-xs text-slate-400">
            মাস: <span className="font-semibold text-amber-300">{selectedMonth || 'অনির্দিষ্ট'}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th
                  onClick={() => handleSort('rank')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span># র‍্যাঙ্ক</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>কালেক্টরের নাম</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('target')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>টার্গেট (৳)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('collected')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>আদায় (৳)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('achievement')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition min-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>অর্জনের শতকরা হার (%)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('remaining')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>অবশিষ্ট ঘাটতি (৳)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">গ্রাহক / রসিদ</th>
                <th className="py-3.5 px-4 text-center">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                      <p className="text-sm">কালেকশন অর্জনের তথ্য লোড হচ্ছে...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCollectors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Target className="w-10 h-10 text-slate-600" />
                      <p className="font-semibold text-slate-300">কোন কালেকশন অর্জনের তথ্য পাওয়া যায়নি</p>
                      <p className="text-xs text-slate-500">অন্য কোনো মাস নির্বাচন করুন অথবা অনুসন্ধান ফিল্টার পরিবর্তন করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCollectors.map((item, index) => {
                  const rankNumber = index + 1;
                  const isTopOne = rankNumber === 1 && item.total_collected > 0;
                  const isTopTwo = rankNumber === 2 && item.total_collected > 0;
                  const isTopThree = rankNumber === 3 && item.total_collected > 0;

                  return (
                    <tr
                      key={item.collector_name || index}
                      className="hover:bg-slate-800/40 transition duration-150 group"
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {isTopOne ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs shadow-md shadow-amber-500/10">
                            🥇 1
                          </span>
                        ) : isTopTwo ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 text-xs">
                            🥈 2
                          </span>
                        ) : isTopThree ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/40 text-xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-slate-500 ml-2">{rankNumber}</span>
                        )}
                      </td>

                      {/* Collector Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${
                            item.collector_name === 'Unassigned / Unmapped'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-800 text-slate-300 border-slate-700 group-hover:border-amber-500/40'
                          }`}>
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-amber-300 transition flex items-center gap-1.5">
                              <span>{item.collector_name}</span>
                              {isTopOne && (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.assigned_target > 0 ? (
                                <span>বিল: {formatTk(item.target_actual_bill)} + বকেয়া ৫০%: {formatTk(item.target_dues_component)}</span>
                              ) : (
                                <span>টার্গেট নির্ধারিত নেই</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-200">
                        {formatTk(item.assigned_target)}
                      </td>

                      {/* Collected */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {formatTk(item.total_collected)}
                      </td>

                      {/* Achievement Progress Bar & % */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-black ${getAchievementColor(item.achievement_rate)}`}>
                              {item.achievement_rate}%
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {item.assigned_target > 0 
                                ? `${Math.round((item.total_collected / item.assigned_target) * 100)}% সম্পন্ন` 
                                : 'অনির্ধারিত'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-700/60">
                            <div
                              className={`h-full bg-gradient-to-r ${getAchievementBgGradient(item.achievement_rate)} rounded-full transition-all duration-500`}
                              style={{ width: `${Math.min(item.achievement_rate || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Remaining Deficit */}
                      <td className="py-3.5 px-4 text-right">
                        {item.remaining_amount <= 0 ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            অতিরিক্ত {formatTk(Math.abs(item.remaining_amount))}
                          </span>
                        ) : (
                          <span className="font-semibold text-rose-400">
                            {formatTk(item.remaining_amount)}
                          </span>
                        )}
                      </td>

                      {/* Customer / Receipt Count */}
                      <td className="py-3.5 px-4 text-center text-xs">
                        <div className="font-semibold text-slate-300">
                          {item.customer_count} জন
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.receipt_count} টি রসিদ
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(item.status, item.status_label)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Totals */}
            {!loading && filteredCollectors.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950 border-t-2 border-slate-700 font-bold text-slate-200">
                  <td className="py-4 px-4 text-center text-amber-400 font-mono">
                    মোট
                  </td>
                  <td className="py-4 px-4 text-white">
                    সর্বমোট ({filteredCollectors.length} জন কালেক্টর)
                  </td>
                  <td className="py-4 px-4 text-right text-white">
                    {formatTk(filteredCollectors.reduce((acc, c) => acc + (c.assigned_target || 0), 0))}
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-400 text-base">
                    {formatTk(filteredCollectors.reduce((acc, c) => acc + (c.total_collected || 0), 0))}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${getAchievementColor(summary.overall_achievement_rate)}`}>
                        {summary.overall_achievement_rate}%
                      </span>
                      <span className="text-xs text-slate-400 font-normal">গড় অর্জন হার</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-rose-400">
                    {formatTk(filteredCollectors.reduce((acc, c) => acc + Math.max(0, c.remaining_amount || 0), 0))}
                  </td>
                  <td className="py-4 px-4 text-center text-xs text-slate-300">
                    <div>{filteredCollectors.reduce((acc, c) => acc + (c.customer_count || 0), 0)} গ্রাহক</div>
                    <div className="text-slate-400 font-normal">{filteredCollectors.reduce((acc, c) => acc + (c.receipt_count || 0), 0)} রসিদ</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-xs font-semibold text-slate-400">
                      —
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

