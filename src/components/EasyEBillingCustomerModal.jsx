import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  X,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Building,
  CreditCard,
  DollarSign,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function EasyEBillingCustomerModal({ customerId, onClose, onSyncSuccess }) {
  const [activeTab, setActiveTab] = useState('billing'); // 'billing' | 'deposit'
  
  // Billing Summary State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryFilter, setSummaryFilter] = useState('all'); // 'all' | 'payment' | 'bill'
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Security Deposit State
  const [depositData, setDepositData] = useState(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState(null);
  const [depositRefreshing, setDepositRefreshing] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchLiveSummary(false);
    }
  }, [customerId]);

  const fetchLiveSummary = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get(`/billing/customer-summary/${encodeURIComponent(customerId)}`, {
        params: { refresh: forceRefresh ? 1 : 0 }
      });

      if (res.data?.success) {
        setData(res.data);
      } else {
        setError(res.data?.message || 'Customer not found or failed to load EasyEBilling data.');
      }
    } catch (err) {
      console.error('Failed to load EasyEBilling summary:', err);
      setError(err.response?.data?.message || err.message || 'Error communicating with EasyEBilling server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSecurityDeposit = async (forceRefresh = false) => {
    if (forceRefresh) {
      setDepositRefreshing(true);
    } else {
      setDepositLoading(true);
    }
    setDepositError(null);

    try {
      const res = await api.get(`/billing/customer-security-deposit/${encodeURIComponent(customerId)}`, {
        params: { refresh: forceRefresh ? 1 : 0 }
      });

      if (res.data?.success) {
        setDepositData(res.data);
      } else {
        setDepositError(res.data?.message || 'Could not fetch security deposit details from EasyEBilling.');
      }
    } catch (err) {
      console.error('Failed to load EasyEBilling deposit:', err);
      setDepositError(err.response?.data?.message || err.message || 'Error communicating with EasyEBilling server.');
    } finally {
      setDepositLoading(false);
      setDepositRefreshing(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'deposit' && !depositData && !depositLoading) {
      fetchSecurityDeposit(false);
    }
  };

  if (!customerId) return null;

  const meta = data?.customer_meta || {};
  const totals = data?.totals || {};
  const ledger = data?.ledger || [];

  // Filtered and paginated ledger
  const filteredLedger = ledger.filter((item) => {
    if (summaryFilter === 'payment' && item.type !== 'payment') return false;
    if (summaryFilter === 'bill' && item.type !== 'bill') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const d = (item.date || '').toLowerCase().includes(q);
      const c = (item.collector || '').toLowerCase().includes(q);
      const n = (item.note || '').toLowerCase().includes(q);
      const desc = (item.description || item.particulars || '').toLowerCase().includes(q);
      const p = String(item.paid_amount || item.credit || '').includes(q);
      const r = String(item.monthly_rent || item.debit || '').includes(q);
      const due = String(item.total_due || item.due || item.balance || '').includes(q);
      return d || c || n || desc || p || r || due;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLedger.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedLedger = filteredLedger.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const currentDue = Number(totals.current_due ?? totals.current_balance ?? 0);
  const monthlyRent = Number(totals.monthly_rent ?? meta.monthly_bill ?? 0);
  const totalPaid = Number(totals.total_paid ?? totals.total_credit ?? 0);
  const lastPayment = totals.last_payment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-white tracking-wide">
                  EasyEBilling Live Profile
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Cloud Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Customer ID: <strong className="text-amber-300 font-mono">{customerId}</strong></span>
                {data?.pk && <span className="text-slate-500 text-[10px] font-mono">PK: {data.pk}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => activeTab === 'billing' ? fetchLiveSummary(true) : fetchSecurityDeposit(true)}
              disabled={loading || refreshing || depositLoading || depositRefreshing}
              className="p-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-40 cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
              title="Force Refresh Live Data from EasyEBilling"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing || depositRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">{refreshing || depositRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-2 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <nav className="flex space-x-2" aria-label="Tabs">
            <button
              type="button"
              onClick={() => handleTabChange('billing')}
              className={`pb-2.5 px-3.5 inline-flex items-center gap-2 border-b-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Bill Payment Summary</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {totals.total_transactions || ledger.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('deposit')}
              className={`pb-2.5 px-3.5 inline-flex items-center gap-2 border-b-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'deposit'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Security Deposit</span>
              {depositData?.records && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {depositData.records.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: BILLING SUMMARY */}
          {activeTab === 'billing' && (
            <>
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-9 h-9 animate-spin mx-auto text-amber-400" />
                  <p className="text-sm font-bold text-slate-300">
                    Connecting to EasyEBilling & fetching live billing ledger...
                  </p>
                  <p className="text-xs text-slate-500">
                    Querying catv.easyebilling.com/customer_summary for {customerId}
                  </p>
                </div>
              ) : error ? (
                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3 text-center">
                  <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">EasyEBilling Fetch Error</h3>
                    <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
                  </div>
                  <button
                    onClick={() => fetchLiveSummary(true)}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold transition inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Live Connection</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Top Financial KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    
                    {/* Current Due */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Current Due</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          currentDue > 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {currentDue > 0 ? 'Pending' : 'Clear'}
                        </span>
                      </div>
                      <div className={`mt-2 text-xl sm:text-2xl font-black ${currentDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ৳{currentDue.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">As per EasyEBilling cloud</p>
                    </div>

                    {/* Monthly Rent */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Monthly Rent</span>
                        <CreditCard className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="mt-2 text-xl sm:text-2xl font-black text-purple-300">
                        ৳{monthlyRent.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Package rate</p>
                    </div>

                    {/* Total Paid */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Total Paid</span>
                        <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-300">
                        ৳{totalPaid.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{totals.payments_count || 0} payments collected</p>
                    </div>

                    {/* Last Payment */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Last Payment</span>
                        <ArrowUpRight className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="mt-2 text-xl sm:text-2xl font-black text-sky-300 truncate">
                        {lastPayment?.paid_amount ? `৳${Number(lastPayment.paid_amount).toLocaleString()}` : '-'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {lastPayment ? `${lastPayment.date} • ${lastPayment.collector || 'Agent'}` : 'No payment record'}
                      </p>
                    </div>

                  </div>

                  {/* Customer Details in EasyEBilling */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                        <User className="w-4 h-4 text-amber-400" />
                        <span>Customer Profile</span>
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">Status:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          String(meta.status).toLowerCase().includes('enable') || String(meta.status) === '1'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {meta.status || 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Full Name</span>
                        <div className="font-bold text-white text-sm mt-0.5">{meta.name || 'N/A'}</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Mobile Phone</span>
                        <div className="font-bold text-amber-300 mt-0.5 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-amber-400" />
                          <span>{meta.mobile || 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Area / Zone</span>
                        <div className="font-bold text-slate-200 mt-0.5 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          <span>{meta.area || 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Building</span>
                        <div className="font-bold text-slate-200 mt-0.5 flex items-center space-x-1">
                          <Building className="w-3 h-3 text-indigo-400" />
                          <span>{meta.building || '(None)'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">House & Flat No</span>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {meta.house_no ? `House: ${meta.house_no}` : ''} {meta.flat_no ? `| Flat: ${meta.flat_no}` : ''}
                          {!meta.house_no && !meta.flat_no && '(Not specified)'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Connected By</span>
                        <div className="font-bold text-slate-200 mt-0.5 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          <span>{meta.connected_by || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => { setSummaryFilter('all'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          summaryFilter === 'all'
                            ? 'bg-blue-600 text-white shadow font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({totals.total_transactions || ledger.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSummaryFilter('payment'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          summaryFilter === 'payment'
                            ? 'bg-emerald-600 text-white shadow font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Payments ({totals.payments_count || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSummaryFilter('bill'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          summaryFilter === 'bill'
                            ? 'bg-purple-600 text-white shadow font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Bills ({totals.bills_count || 0})
                      </button>
                    </div>

                    <div className="relative sm:w-64">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        placeholder="Search date, collector, note, ৳..."
                        className="w-full text-xs pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setPage(1); }}
                          className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="space-y-2">
                    {filteredLedger.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-400">
                        No transactions found matching your filter/search criteria.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">#</th>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Type</th>
                                <th className="py-2.5 px-3">Description / Collector</th>
                                <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                                <th className="py-2.5 px-3 text-right">Bill (৳)</th>
                                <th className="py-2.5 px-3 text-right">Balance / Due (৳)</th>
                                <th className="py-2.5 px-3">Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {paginatedLedger.map((item, idx) => {
                                const rowNum = (currentPage - 1) * pageSize + idx + 1;
                                const isPayment = item.type === 'payment';
                                const paidAmt = Number(item.paid_amount ?? item.credit ?? 0);
                                const billAmt = Number(item.sum_with_vat ?? item.sum ?? item.debit ?? 0);
                                const balanceAmt = Number(item.total_due ?? item.due ?? item.balance ?? 0);

                                return (
                                  <tr key={item.id || idx} className="hover:bg-slate-900/50 transition">
                                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                                      {rowNum}
                                    </td>
                                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap text-[11px]">
                                      {item.date || 'N/A'}
                                    </td>
                                    <td className="py-2 px-3">
                                      {isPayment ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                          Payment
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                          Bill
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-sans text-slate-200 max-w-xs truncate" title={item.description || item.particulars}>
                                      {isPayment
                                        ? (item.collector ? `Collected By: ${item.collector}` : 'Payment Received')
                                        : `Monthly Bill ${item.monthly_rent ? `(Rent: ৳${item.monthly_rent})` : ''}`
                                      }
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-emerald-300 text-[11px]">
                                      {paidAmt > 0 ? `৳${paidAmt.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-purple-300 text-[11px]">
                                      {billAmt > 0 ? `৳${billAmt.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-amber-300 text-[11px]">
                                      ৳{balanceAmt.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3 font-sans text-slate-400 text-[11px] max-w-[120px] truncate" title={item.note || ''}>
                                      {item.note || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
                            <div>
                              Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                              <strong className="text-white">{Math.min(currentPage * pageSize, filteredLedger.length)}</strong> of{' '}
                              <strong className="text-white">{filteredLedger.length}</strong> transactions
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="px-2 font-bold text-slate-300">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* TAB 2: SECURITY DEPOSIT */}
          {activeTab === 'deposit' && (
            <>
              {depositLoading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-9 h-9 animate-spin mx-auto text-emerald-400" />
                  <p className="text-sm font-bold text-slate-300">
                    Fetching security deposit records from EasyEBilling...
                  </p>
                  <p className="text-xs text-slate-500">
                    Querying catv.easyebilling.com/security-deposit for {customerId}
                  </p>
                </div>
              ) : depositError ? (
                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3 text-center">
                  <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Deposit Fetch Error</h3>
                    <p className="text-xs text-rose-300 max-w-md mx-auto">{depositError}</p>
                  </div>
                  <button
                    onClick={() => fetchSecurityDeposit(true)}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold transition inline-flex items-center space-x-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Deposit Fetch</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Deposit KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Deposit Received
                      </span>
                      <div className="mt-2 text-2xl font-black text-emerald-400">
                        ৳{Number(depositData?.total_deposit || 0).toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Total deposit balance</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Return
                      </span>
                      <div className="mt-2 text-2xl font-black text-rose-400">
                        ৳{Number(depositData?.total_return || 0).toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Refunded to customer</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Current Deposit Balance
                      </span>
                      <div className="mt-2 text-2xl font-black text-amber-300">
                        ৳{Number(depositData?.current_balance || 0).toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Net refundable security</p>
                    </div>
                  </div>

                  {/* Deposit Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Security Deposit History ({depositData?.records?.length || 0} entries)</span>
                    </h3>

                    {(!depositData?.records || depositData.records.length === 0) ? (
                      <div className="p-8 rounded-2xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-400">
                        No security deposit records recorded for this customer in EasyEBilling.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3 text-right">Deposit (৳)</th>
                              <th className="py-2.5 px-3 text-right">Return (৳)</th>
                              <th className="py-2.5 px-3">Remarks / Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {depositData.records.map((rec, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/50 transition">
                                <td className="py-2 px-3 text-slate-500 text-[11px]">
                                  {rec.sl || idx + 1}
                                </td>
                                <td className="py-2 px-3 text-slate-300 whitespace-nowrap text-[11px]">
                                  {rec.date || 'N/A'}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-300 text-[11px]">
                                  ৳{Number(rec.deposit || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-rose-300 text-[11px]">
                                  {Number(rec.return || 0) > 0 ? `৳${Number(rec.return).toLocaleString()}` : '-'}
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                                  {rec.remarks || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Connected to catv.easyebilling.com</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
