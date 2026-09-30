import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { X, RefreshCw, Calendar, PieChart, Printer } from 'lucide-react';

export default function CustomerSummaryModal({ fileRecord, onClose }) {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fileRecord?.id) {
      fetchSummary();
    }
  }, [fileRecord]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/excel/customer-summary/${fileRecord.id}`);
      setSummaryData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load customer summary:', err);
      setError('Failed to fetch active customer summary metrics.');
    } finally {
      setLoading(false);
    }
  };

  const computedGrandTotal = useMemo(() => {
    if (!summaryData?.summary_items) {
      return { active_count: 0, first_child_count: 0, second_child_count: 0, third_child_count: 0, total_child_count: 0, combined_total: 0 };
    }

    return summaryData.summary_items.reduce((acc, item) => {
      const isDigital = item.customer_type?.toLowerCase().includes('digital');
      const active = Number(item.active_count) || 0;
      const first = isDigital ? (Number(item.first_child_count) || 0) : 0;
      const second = isDigital ? (Number(item.second_child_count) || 0) : 0;
      const third = isDigital ? (Number(item.third_child_count) || 0) : 0;
      const totalChild = isDigital ? (Number(item.total_child_count) || 0) : 0;

      acc.active_count += active;
      acc.first_child_count += first;
      acc.second_child_count += second;
      acc.third_child_count += third;
      acc.total_child_count += totalChild;
      acc.combined_total += (active + totalChild);
      return acc;
    }, { active_count: 0, first_child_count: 0, second_child_count: 0, third_child_count: 0, total_child_count: 0, combined_total: 0 });
  }, [summaryData]);

  const handlePrint = () => {
    window.print();
  };

  if (!fileRecord) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <style>{`
        @media print {
          aside, nav, header, footer, .no-print {
            display: none !important;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
          }

          #printable-modal-summary {
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            padding: 0 !important;
          }

          #printable-modal-summary * {
            color: #000000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          #printable-modal-summary table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 2px solid #000000 !important;
            margin-top: 12px !important;
          }

          #printable-modal-summary th,
          #printable-modal-summary td {
            border: 1px solid #475569 !important;
            padding: 8px 12px !important;
            color: #000000 !important;
            font-size: 10pt !important;
          }

          #printable-modal-summary th {
            background-color: #e2e8f0 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
          }

          #printable-modal-summary tr.grand-total-row {
            background-color: #cbd5e1 !important;
            font-weight: 900 !important;
          }
        }
      `}</style>

      <div id="printable-modal-summary" className="w-full max-w-2xl glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 no-print">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase print:text-black">
                Active Customer Summary Matrix
              </h3>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-slate-400 font-medium truncate max-w-[220px] print:text-slate-800">
                  {fileRecord.original_name}
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold print:border-slate-400 print:text-slate-800">
                  <Calendar className="w-3 h-3 text-amber-400 no-print" />
                  <span>{fileRecord.billing_month || 'August 2026'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 no-print">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs no-print">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-400 mb-2" />
            Calculating Active Customer Type & Category Counts...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-400 text-xs bg-rose-500/10 rounded-xl border border-rose-500/20 p-4 no-print">
            {error}
          </div>
        ) : summaryData && summaryData.summary_items && summaryData.summary_items.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <span className="text-slate-400 print:text-slate-800">Total Active Subscribers:</span>
              <span className="text-emerald-400 font-extrabold text-sm print:text-black">
                {summaryData.grand_total?.active_count?.toLocaleString()} Customers
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-xl print:border-slate-400">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                    <th className="py-3 px-4">Customer Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right text-slate-200">Main Active</th>
                    <th className="py-3 px-4 text-right text-indigo-300">1st Child</th>
                    <th className="py-3 px-4 text-right text-purple-300">2nd Child</th>
                    <th className="py-3 px-4 text-right text-amber-300">3rd Child (3-10)</th>
                    <th className="py-3 px-4 text-right text-emerald-300">Total Child</th>
                    <th className="py-3 px-4 text-right text-cyan-300 font-extrabold">Active + Child</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {summaryData.summary_items.map((item, idx) => {
                    const isDigital = item.customer_type?.toLowerCase().includes('digital');
                    const combinedTotal = (item.active_count || 0) + (isDigital ? (item.total_child_count || 0) : 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 font-medium transition">
                        <td className="py-3.5 px-4 text-slate-200 font-bold flex items-center space-x-2 print:text-black">
                          <span className={`w-2 h-2 rounded-full ${isDigital ? 'bg-indigo-400' : 'bg-slate-500'} no-print`} />
                          <span>{item.customer_type}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.category === 'Civil'
                              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-100 font-extrabold text-sm print:text-black">
                          {item.active_count?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right text-indigo-300 font-bold print:text-black">
                          {isDigital ? (item.first_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right text-purple-300 font-bold print:text-black">
                          {isDigital ? (item.second_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right text-amber-300 font-bold print:text-black">
                          {isDigital ? (item.third_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-extrabold print:text-black">
                          {isDigital ? (item.total_child_count?.toLocaleString() ?? 0) : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right text-cyan-300 font-black text-sm print:text-black">
                          {combinedTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Grand Total Row */}
                  <tr className="bg-slate-900 font-extrabold text-white border-t-2 border-slate-800 grand-total-row">
                    <td colSpan={2} className="py-3.5 px-4 text-indigo-400 tracking-wider">
                      GRAND TOTAL (ALL ACTIVE)
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-100 text-sm font-extrabold">
                      {computedGrandTotal.active_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-indigo-300 font-bold">
                      {computedGrandTotal.first_child_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-purple-300 font-bold">
                      {computedGrandTotal.second_child_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-amber-300 font-bold">
                      {computedGrandTotal.third_child_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-extrabold">
                      {computedGrandTotal.total_child_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-cyan-300 text-base font-black">
                      {computedGrandTotal.combined_total.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800 no-print">
            No active customers found in this file.
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between no-print">
          <span className="text-[11px] text-slate-500">
            Filtered strictly for <span className="text-emerald-400 font-semibold">Active</span> status subscribers
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}
