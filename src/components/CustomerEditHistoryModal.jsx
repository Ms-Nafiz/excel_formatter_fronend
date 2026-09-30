import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { History, X, Clock, User, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export default function CustomerEditHistoryModal({ recordId, customerId, customerName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [histories, setHistories] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [recordId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/excel/customer-history/${recordId}`);
      setHistories(res.data.histories || []);
    } catch (err) {
      console.error('Failed to load customer history:', err);
      setError(err.response?.data?.message || 'Failed to load record change history.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <span>Customer Data Audit History</span>
              </h3>
              <p className="text-xs text-slate-400">
                {customerName || 'Customer'} • Customer ID: <strong className="text-amber-300">{customerId || recordId}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-2" />
              Fetching record change history from database...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : histories.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">No Edits Recorded Yet</h4>
              <p className="text-slate-500 max-w-sm mx-auto">
                No past data updates have been performed on this customer record. All future edits will be logged here with Old vs New values.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                <span>Total Update Logs: {histories.length}</span>
                <span className="text-[11px] text-slate-500">Sorted newest to oldest</span>
              </div>

              <div className="space-y-2.5">
                {histories.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 transition space-y-2 text-xs"
                  >
                    {/* Timestamp & User */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <div className="flex items-center space-x-2 text-slate-300">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold">
                          {h.field_name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{h.edited_by || 'Admin'}</span>
                        </span>
                        <span className="flex items-center space-x-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(h.created_at)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Old vs New Value Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center text-xs pt-1">
                      
                      {/* Old Value */}
                      <div className="sm:col-span-5 p-2.5 rounded-lg bg-slate-950 border border-rose-500/20 text-rose-300 space-y-0.5">
                        <span className="block text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Old Value:</span>
                        <div className="font-mono font-bold truncate" title={h.old_value || '(empty)'}>
                          {h.old_value !== null && h.old_value !== '' ? h.old_value : <em className="text-slate-600 font-normal">None / Empty</em>}
                        </div>
                      </div>

                      {/* Arrow indicator */}
                      <div className="sm:col-span-1 text-center py-1 sm:py-0">
                        <ArrowRight className="w-4 h-4 text-amber-400 mx-auto transform rotate-90 sm:rotate-0" />
                      </div>

                      {/* New Value */}
                      <div className="sm:col-span-5 p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30 text-emerald-300 space-y-0.5">
                        <span className="block text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">New Value:</span>
                        <div className="font-mono font-bold truncate" title={h.new_value || '(empty)'}>
                          {h.new_value !== null && h.new_value !== '' ? h.new_value : <em className="text-slate-600 font-normal">Cleared / Empty</em>}
                        </div>
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit Trail Active</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
