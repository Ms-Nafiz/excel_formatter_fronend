import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Target, Download, RefreshCw, ShieldAlert, FileSpreadsheet, Building2, Printer } from 'lucide-react';

export default function TargetReportManager({ isAuthenticated, onOpenAuth }) {
  const auth = useAuth();
  const isAuth = isAuthenticated !== undefined ? isAuthenticated : Boolean(auth?.user);
  const handleOpenAuth = onOpenAuth || (() => {});

  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    if (!isAuth) {
      handleOpenAuth();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/excel/target-report');
      setReportResult(res.data);
    } catch (err) {
      console.error('Target report generation error:', err);
      setError(err.response?.data?.message || 'Failed to generate monthly target report. Please ensure at least one Excel file has been processed.');
    } finally {
      setLoading(false);
    }
  };

  const fmtNum = (val) => {
    if (!val || val === 0) return '-';
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const calcSectionTotal = (list, key) => {
    if (!list) return 0;
    return list.reduce((sum, item) => sum + (item[key] || 0), 0);
  };

  if (!isAuth) {
    return null;
  }

  const analogList = reportResult?.stats?.analog_stats || [];
  const digitalList = reportResult?.stats?.digital_stats || [];

  const analogTotalCount = calcSectionTotal(analogList, 'count_of_id');
  const analogTotalRent = calcSectionTotal(analogList, 'sum_of_rent');
  const analogTotalDue = calcSectionTotal(analogList, 'sum_of_due');
  const analogTotalAdv = calcSectionTotal(analogList, 'sum_of_advnc');
  const analogTotalActual = calcSectionTotal(analogList, 'sum_of_actual_bill');
  const analogTotalFifty = calcSectionTotal(analogList, 'sum_of_50');
  const analogTotalTarget = calcSectionTotal(analogList, 'sum_of_target');

  const digitalTotalCount = calcSectionTotal(digitalList, 'count_of_id');
  const digitalTotalRent = calcSectionTotal(digitalList, 'sum_of_rent');
  const digitalTotalDue = calcSectionTotal(digitalList, 'sum_of_due');
  const digitalTotalAdv = calcSectionTotal(digitalList, 'sum_of_advnc');
  const digitalTotalActual = calcSectionTotal(digitalList, 'sum_of_actual_bill');
  const digitalTotalFifty = calcSectionTotal(digitalList, 'sum_of_50');
  const digitalTotalTarget = calcSectionTotal(digitalList, 'sum_of_target');

  const grandCount = analogTotalCount + digitalTotalCount;
  const grandRent = analogTotalRent + digitalTotalRent;
  const grandDue = analogTotalDue + digitalTotalDue;
  const grandAdv = analogTotalAdv + digitalTotalAdv;
  const grandActual = analogTotalActual + digitalTotalActual;
  const grandFifty = analogTotalFifty + digitalTotalFifty;
  const grandTarget = analogTotalTarget + digitalTotalTarget;

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl mb-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Chittagong Communications Target Report Engine</h2>
            <p className="text-xs text-slate-400">
              Generate target collection breakdown by Collector & Type (Analog vs Digital)
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Generating Target Report...' : 'Generate Monthly Target Report'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 mb-4">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Report Matching User Image Layout */}
      {reportResult && reportResult.stats && (
        <div className="space-y-6 animate-fade-in bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          
          {/* Company Title & Month */}
          <div className="text-center space-y-1 mb-4 pb-4 border-b border-slate-800">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
              Chittagong Communications Ltd
            </h1>
            <p className="text-sm font-semibold text-amber-400">
              {reportResult.stats.month_label || 'Target for the month of August-26'}
            </p>
          </div>

          {/* Report Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                  <th className="py-2.5 px-3 border-r border-slate-800">Type</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Collector</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right">Customer</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right">Rent</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right">Due</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right">Advnc</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right">Actual Bill</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right">50%</th>
                  <th className="py-2.5 px-3 text-right">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-200">
                
                {/* --- ANALOG GROUP --- */}
                <tr className="bg-slate-900/80 font-bold text-indigo-300">
                  <td className="py-2 px-3 border-r border-slate-800">Analog</td>
                  <td colSpan={8}></td>
                </tr>

                {analogList.map((item, idx) => (
                  <tr key={`analog-${idx}`} className="hover:bg-slate-800/40 transition">
                    <td className="py-1.5 px-3 border-r border-slate-800"></td>
                    <td className="py-1.5 px-3 border-r border-slate-800 font-semibold text-white">{item.collector_name}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.count_of_id)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_rent)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_due)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_advnc)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_actual_bill)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_50)}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-amber-300">{fmtNum(item.sum_of_target)}</td>
                  </tr>
                ))}

                {/* Analog Total Row */}
                <tr className="bg-slate-900 font-bold border-y border-slate-700 text-white">
                  <td className="py-2 px-3 border-r border-slate-800">Analog Total</td>
                  <td className="py-2 px-3 border-r border-slate-800"></td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalCount)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalRent)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalDue)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalAdv)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalActual)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalFifty)}</td>
                  <td className="py-2 px-3 text-right text-amber-400">{fmtNum(analogTotalTarget)}</td>
                </tr>

                {/* --- DIGITAL GROUP --- */}
                <tr className="bg-slate-900/80 font-bold text-emerald-400">
                  <td className="py-2 px-3 border-r border-slate-800">Digital</td>
                  <td colSpan={8}></td>
                </tr>

                {digitalList.map((item, idx) => (
                  <tr key={`digital-${idx}`} className="hover:bg-slate-800/40 transition">
                    <td className="py-1.5 px-3 border-r border-slate-800"></td>
                    <td className="py-1.5 px-3 border-r border-slate-800 font-semibold text-white">{item.collector_name}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.count_of_id)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_rent)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_due)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_advnc)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_actual_bill)}</td>
                    <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_50)}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-emerald-300">{fmtNum(item.sum_of_target)}</td>
                  </tr>
                ))}

                {/* Digital Total Row */}
                <tr className="bg-slate-900 font-bold border-y border-slate-700 text-white">
                  <td className="py-2 px-3 border-r border-slate-800">Digital Total</td>
                  <td className="py-2 px-3 border-r border-slate-800"></td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalCount)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalRent)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalDue)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalAdv)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalActual)}</td>
                  <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalFifty)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">{fmtNum(digitalTotalTarget)}</td>
                </tr>

                {/* --- GRAND TOTAL ROW --- */}
                <tr className="bg-slate-950 font-extrabold border-t-2 border-b-4 border-slate-600 text-white text-xs">
                  <td className="py-3 px-3 border-r border-slate-800">Grand Total</td>
                  <td className="py-3 px-3 border-r border-slate-800"></td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandCount)}</td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandRent)}</td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandDue)}</td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandAdv)}</td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandActual)}</td>
                  <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandFifty)}</td>
                  <td className="py-3 px-3 text-right text-amber-400 text-sm">{fmtNum(grandTarget)}</td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Footer Signature */}
          <div className="pt-8 text-center space-y-1 text-xs text-slate-400">
            <p className="tracking-widest font-mono">_________________________</p>
            <p className="font-semibold text-slate-300">Prepared By</p>
          </div>

          {/* Download & Print Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => window.print()}
              className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Target Report</span>
            </button>

            <a
              href={reportResult.download_url}
              download
              className="py-3 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Target Report (.xlsx)</span>
            </a>
          </div>

        </div>
      )}

    </div>
  );
}
