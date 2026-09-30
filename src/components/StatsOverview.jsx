import React from 'react';
import { Layers, Zap, Clock, ShieldCheck } from 'lucide-react';

export default function StatsOverview({ totalFiles = 0, totalRows = 0 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      {/* Metric 1 */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl border border-slate-800 flex items-center space-x-4">
        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Files Formatted</p>
          <h4 className="text-xl font-bold text-white">{totalFiles}</h4>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl border border-slate-800 flex items-center space-x-4">
        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Total Rows Cleaned</p>
          <h4 className="text-xl font-bold text-white">
            {totalRows > 0 ? totalRows.toLocaleString() : '4,000+ Row Engine'}
          </h4>
        </div>
      </div>

      {/* Metric 3 */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl border border-slate-800 flex items-center space-x-4">
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Avg Speed</p>
          <h4 className="text-xl font-bold text-white">&lt; 2.5 sec / file</h4>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl border border-slate-800 flex items-center space-x-4">
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Excel Standards</p>
          <h4 className="text-xl font-bold text-white">Automated Rules</h4>
        </div>
      </div>

    </div>
  );
}
