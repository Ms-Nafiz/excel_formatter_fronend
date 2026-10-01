import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CustomerSummaryModal from './CustomerSummaryModal';
import ConfirmModal from './ConfirmModal';
import AdvancePrintModal, { prefetchFileData, invalidateFileDataCache } from './AdvancePrintModal';
import { History, Download, Trash2, CheckCircle2, XCircle, FileSpreadsheet, RefreshCw, BarChart3, FileCheck, Layers, FileDown, Clock, Target, Calendar, RotateCcw, Archive, AlertTriangle, X, PieChart, Printer } from 'lucide-react';

export default function FileHistory({ refreshTrigger, isAuthenticated, onOpenAuth, onDataChange }) {
  const { isAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatingTargetId, setGeneratingTargetId] = useState(null);
  
  // Custom Confirmation Modal State
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(null);
  const [confirmForceDeleteFile, setConfirmForceDeleteFile] = useState(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(null);
  const [summaryModalFile, setSummaryModalFile] = useState(null);
  const [printModalFile, setPrintModalFile] = useState(null);

  // Soft Delete Trash Bin Modal State
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashItems, setTrashItems] = useState([]);
  const [loadingTrash, setLoadingTrash] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistoryData = async (pageNum = 1) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [histRes, analyticsRes] = await Promise.all([
        api.get(`/excel/history?page=${pageNum}`),
        api.get('/excel/history-analytics'),
      ]);

      setHistory(histRes.data.data || []);
      setTotalPages(histRes.data.last_page || 1);
      setPage(histRes.data.current_page || 1);
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error('Failed to fetch history data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrashItems = async () => {
    if (!isAuthenticated) return;
    setLoadingTrash(true);
    try {
      const res = await api.get('/excel/trash');
      setTrashItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch trash items:', err);
    } finally {
      setLoadingTrash(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(1);
    fetchTrashItems();
  }, [refreshTrigger, isAuthenticated]);

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/excel/history-report-export');
      if (res.data?.download_url) {
        window.open(res.data.download_url, '_blank');
      }
    } catch (err) {
      alert('Failed to generate master audit report.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadProcessedFile = async (item) => {
    try {
      const response = await api.get(`/excel/download/${item.id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      let cleanName = (item.original_name || 'report').replace(/\.[^/.]+$/, '').trim();
      if (/^(book\d*|sheet\d*|data|input|file|sample|raw.*)$/i.test(cleanName)) {
        cleanName = 'Customer_Billing_Report';
      } else {
        cleanName = cleanName.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
      }
      const monthStr = (item.billing_month || 'Report').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const downloadFileName = `Formatted_${cleanName}_${monthStr}.xlsx`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download Excel file from storage server.');
    }
  };

  const handleGenerateItemTargetReport = async (fileId) => {
    setGeneratingTargetId(fileId);
    try {
      const res = await api.post('/excel/target-report', { file_id: fileId });
      if (res.data?.download_url) {
        window.open(res.data.download_url, '_blank');
      }
    } catch (err) {
      alert('Failed to generate target report for this file.');
    } finally {
      setGeneratingTargetId(null);
    }
  };

  const executeDelete = async (id) => {
    try {
      const res = await api.delete(`/excel/destroy/${id}`);
      setDeleteSuccessMsg(res.data?.message || 'File moved to Trash / Recycle Bin!');
      fetchHistoryData(page);
      fetchTrashItems();
      if (onDataChange) onDataChange();
      setTimeout(() => {
        setDeleteSuccessMsg(null);
      }, 4000);
    } catch (err) {
      alert('Failed to delete file record.');
    }
  };

  const handleRestoreFile = async (id) => {
    try {
      const res = await api.post(`/excel/restore/${id}`);
      setDeleteSuccessMsg(res.data?.message || 'File restored back to active history!');
      fetchTrashItems();
      fetchHistoryData(page);
      if (onDataChange) onDataChange();
      setTimeout(() => {
        setDeleteSuccessMsg(null);
      }, 4000);
    } catch (err) {
      alert('Failed to restore file.');
    }
  };

  const executeForceDelete = async (id) => {
    try {
      const res = await api.delete(`/excel/force-delete/${id}`);
      setDeleteSuccessMsg(res.data?.message || 'File permanently deleted from database and storage disk!');
      fetchTrashItems();
      fetchHistoryData(page);
      if (onDataChange) onDataChange();
      setTimeout(() => {
        setDeleteSuccessMsg(null);
      }, 4000);
    } catch (err) {
      alert('Failed to permanently delete file.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center space-y-3">
        <History className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-white">Upload & Download History Locked</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please sign in or create an account to view your past uploaded Excel files and download history.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 gradient-bg text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:opacity-90 transition"
        >
          Sign In to Access History
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* History Analytics Summary Bar */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Files Processed</p>
                <p className="text-lg font-bold text-white">{analytics.total_files}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Rows Formatted</p>
                <p className="text-lg font-bold text-emerald-400">
                  {analytics.total_rows?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Downloads</p>
                <p className="text-lg font-bold text-purple-300">{analytics.total_downloads || 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Hours Saved</p>
                <p className="text-lg font-bold text-amber-300">~{analytics.hours_saved} hrs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Excel Processing History & Audit Logs</h2>
              <p className="text-xs text-slate-400">Track formatted files, inspect customer summaries, and generate monthly target reports</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowTrashModal(true);
                fetchTrashItems();
              }}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition relative"
            >
              <Archive className="w-4 h-4 text-rose-400" />
              <span>Trash / Recycle Bin</span>
              {trashItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-extrabold">
                  {trashItems.length}
                </span>
              )}
            </button>

            <button
              onClick={handleExportReport}
              disabled={exporting || history.length === 0}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <FileDown className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Generating Report...' : 'Export Master Report'}</span>
            </button>

            <button
              onClick={() => fetchHistoryData(page)}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Success Alert Banner for Deletion / Restore */}
        {deleteSuccessMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in shadow-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{deleteSuccessMsg}</span>
          </div>
        )}

        {loading && history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
            Loading upload history & analytics...
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No files processed yet. Upload your first raw Excel file above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Formatted Excel File</th>
                  <th className="py-3 px-4">Target Billing Month</th>
                  <th className="py-3 px-4">Rows Cleaned</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Processed Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="truncate max-w-[220px] font-bold text-white text-xs" title={item.formatted_name || item.original_name}>
                            {item.formatted_name || item.original_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 ml-6 font-normal">
                          Uploaded: {item.original_name}
                        </span>
                        {isAdmin && item.user && (
                          <span className="text-[10px] text-amber-300/90 ml-6 font-medium">
                            By: {item.user.name || item.user.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-bold">
                        <Calendar className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>{item.billing_month || 'N/A'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {item.row_count > 0 ? item.row_count.toLocaleString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {item.formatted_file_size}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.status === 'completed' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[10px]">
                          <XCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(item.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        
                        {/* Active Customer Summary Matrix Modal Button */}
                        <button
                          onClick={() => setSummaryModalFile(item)}
                          className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                          title="View Active Customer Summary Matrix"
                        >
                          <PieChart className="w-3.5 h-3.5 text-purple-400" />
                          <span>Summary</span>
                        </button>

                        {/* Dedicated Collector Target Report Button */}
                        <button
                          onClick={() => handleGenerateItemTargetReport(item.id)}
                          disabled={generatingTargetId === item.id}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-40"
                          title="Generate & Download 2-Sheet Target Excel Workbook"
                        >
                          <Target className={`w-3.5 h-3.5 text-amber-400 ${generatingTargetId === item.id ? 'animate-spin' : ''}`} />
                          <span>Target Sheet</span>
                        </button>

                        <button
                          onClick={() => handleDownloadProcessedFile(item)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                          title="Download Processed Excel File"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPrintModalFile({ id: item.id, name: item.original_name })}
                          onMouseEnter={() => prefetchFileData(item.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                          title="Open Advance Print Studio (Area/Collector Wise)"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            setConfirmDeleteFile({
                              id: item.id,
                              name: item.original_name,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          title="Move File to Recycle Bin (Soft Delete)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Page <span className="text-white font-bold">{page}</span> of{' '}
              <span className="text-white font-bold">{totalPages}</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchHistoryData(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-xl transition"
              >
                Previous
              </button>

              <button
                onClick={() => fetchHistoryData(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-xl transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recycle Bin / Trash Modal */}
      {showTrashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Recycle Bin / Trash Can</h3>
                  <p className="text-xs text-slate-400">Restore accidentally deleted files or purge them permanently</p>
                </div>
              </div>

              <button
                onClick={() => setShowTrashModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTrash ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-400 mb-2" />
                Loading trash items...
              </div>
            ) : trashItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                <Archive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                Trash Bin is currently empty.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                      <th className="py-2.5 px-3">File Name</th>
                      <th className="py-2.5 px-3">Billing Month</th>
                      <th className="py-2.5 px-3">Deleted Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trashItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <FileSpreadsheet className="w-4 h-4 text-rose-400 flex-shrink-0" />
                              <span className="truncate max-w-[200px] font-bold text-white text-xs" title={item.formatted_name || item.original_name}>
                                {item.formatted_name || item.original_name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 ml-6 font-normal">
                              Uploaded: {item.original_name}
                            </span>
                            {isAdmin && item.user && (
                              <span className="text-[10px] text-amber-300/90 ml-6 font-medium">
                                By: {item.user.name || item.user.email}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            <span>{item.billing_month || 'N/A'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          {new Date(item.deleted_at).toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            
                            {/* Restore File Button */}
                            <button
                              onClick={() => handleRestoreFile(item.id)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold flex items-center space-x-1 transition"
                              title="Restore file back to active history"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Restore</span>
                            </button>

                            {/* Permanent Delete Button */}
                            <button
                              onClick={() =>
                                setConfirmForceDeleteFile({
                                  id: item.id,
                                  name: item.original_name,
                                })
                              }
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg font-bold flex items-center space-x-1 transition"
                              title="Permanently Delete file from database and disk"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Purge Permanently</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowTrashModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Move to Trash */}
      <ConfirmModal
        isOpen={!!confirmDeleteFile}
        title="Move File to Recycle Bin?"
        message={`Are you sure you want to move '${confirmDeleteFile?.name}' to the Trash Bin? You can restore it anytime later.`}
        confirmText="Move to Trash"
        confirmVariant="rose"
        onConfirm={() => {
          if (confirmDeleteFile) {
            executeDelete(confirmDeleteFile.id);
            setConfirmDeleteFile(null);
          }
        }}
        onCancel={() => setConfirmDeleteFile(null)}
      />

      {/* Custom Confirmation Modal for Permanent Force Delete */}
      <ConfirmModal
        isOpen={!!confirmForceDeleteFile}
        title="Permanently Purge File?"
        message={`WARNING: This will PERMANENTLY delete '${confirmForceDeleteFile?.name}' and all associated customer records from the SQL database and storage server. This action CANNOT be undone!`}
        confirmText="Purge Permanently"
        confirmVariant="rose"
        onConfirm={() => {
          if (confirmForceDeleteFile) {
            executeForceDelete(confirmForceDeleteFile.id);
            setConfirmForceDeleteFile(null);
          }
        }}
        onCancel={() => setConfirmForceDeleteFile(null)}
      />
      {/* Active Customer Summary Matrix Modal */}
      {summaryModalFile && (
        <CustomerSummaryModal
          fileRecord={summaryModalFile}
          onClose={() => setSummaryModalFile(null)}
        />
      )}

      {/* Advance Print Modal */}
      {printModalFile && (
        <AdvancePrintModal
          isOpen={!!printModalFile}
          onClose={() => setPrintModalFile(null)}
          fileId={printModalFile.id}
          fileName={printModalFile.name}
        />
      )}
    </div>
  );
}
