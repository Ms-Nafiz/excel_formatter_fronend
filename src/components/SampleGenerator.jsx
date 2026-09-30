import React, { useState } from 'react';
import api from '../services/api';
import { Sparkles, Download, FileText, CheckCircle2, RefreshCw, Layers } from 'lucide-react';

export default function SampleGenerator({ onOpenAuth, isAuthenticated, onProcessingSuccess }) {
  const [rows, setRows] = useState(4000);
  const [loading, setLoading] = useState(false);
  const [sampleResult, setSampleResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setLoading(true);
    setError(null);
    setSampleResult(null);

    try {
      const res = await api.post('/excel/sample-generator', { rows });
      setSampleResult(res.data);
      if (onProcessingSuccess) {
        onProcessingSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate sample data file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
      {/* Header & Controls Container */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Icon & Title */}
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white">Instant Raw Sample Generator</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                Benchmark Tool
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Need test data? Instantly generate a raw Excel file with messy headers, unformatted dates, dollar signs, and raw phone numbers to test system performance.
            </p>
          </div>
        </div>

        {/* Right: Row Selector & Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Rows:</span>
            <select
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="py-2 px-3 bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value={1000}>1,000 Rows</option>
              <option value={4000}>4,000 Rows (SRD Standard)</option>
              <option value={7500}>7,500 Rows</option>
              <option value={10000}>10,000 Rows (Stress Test)</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Generating {rows.toLocaleString()} Rows...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-slate-950" />
                <span>Generate Raw Sample</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Download Alert */}
      {sampleResult && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center space-x-3 text-xs">
            <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-200">{sampleResult.message}</p>
              <p className="text-slate-400 text-[11px]">Download raw Excel file, then drag & drop it into the uploader above to test formatting.</p>
            </div>
          </div>
          <a
            href={sampleResult.download_url}
            download
            className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition flex items-center justify-center space-x-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Raw Excel</span>
          </a>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
