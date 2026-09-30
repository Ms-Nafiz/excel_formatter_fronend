import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Plus, Edit2, Trash2, Search, Check, X, RefreshCw, AlertCircle, Phone, MapPin } from 'lucide-react';

export default function CollectorManager({ isAuthenticated, onOpenAuth, refreshTrigger, onDataChange }) {
  const auth = useAuth();
  const isAuth = isAuthenticated !== undefined ? isAuthenticated : Boolean(auth?.user);
  const handleOpenAuth = onOpenAuth || (() => {});

  const [collectors, setCollectors] = useState([]);
  const [allAreas, setAllAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Add / Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCollectorId, setEditingCollectorId] = useState(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);

  // Custom Confirmation Modal State
  const [confirmDeleteCollector, setConfirmDeleteCollector] = useState(null);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchCollectorsAndAreas = async () => {
    if (!isAuth) return;
    setLoading(true);
    setError(null);
    try {
      const [colRes, areaRes] = await Promise.all([
        api.get(`/collectors?search=${encodeURIComponent(search)}`),
        api.get('/locations/areas'),
      ]);
      setCollectors(colRes.data.collectors || []);
      setAllAreas(areaRes.data.areas || []);
    } catch (err) {
      console.error('Failed to fetch collectors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorsAndAreas();
  }, [search, isAuth, refreshTrigger]);

  const handleOpenAdd = () => {
    setEditingCollectorId(null);
    setFormName('');
    setFormPhone('');
    setSelectedAreaIds([]);
    setIsFormOpen(true);
    setError(null);
  };

  const handleOpenEdit = (collector) => {
    setEditingCollectorId(collector.id);
    setFormName(collector.name);
    setFormPhone(collector.phone || '');
    setSelectedAreaIds(collector.areas ? collector.areas.map((a) => a.id) : []);
    setIsFormOpen(true);
    setError(null);
  };

  const handleToggleArea = (areaId) => {
    if (selectedAreaIds.includes(areaId)) {
      setSelectedAreaIds(selectedAreaIds.filter((id) => id !== areaId));
    } else {
      setSelectedAreaIds([...selectedAreaIds, areaId]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setError(null);
    setMessage(null);

    const payload = {
      name: formName.trim(),
      phone: formPhone.trim() || null,
      area_ids: selectedAreaIds,
    };

    try {
      if (editingCollectorId) {
        const res = await api.put(`/collectors/${editingCollectorId}`, payload);
        setMessage(res.data.message);
      } else {
        const res = await api.post('/collectors', payload);
        setMessage(res.data.message);
      }
      setIsFormOpen(false);
      fetchCollectorsAndAreas();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save collector.');
    }
  };

  const executeDelete = async (id) => {
    setError(null);
    setMessage(null);
    try {
      const res = await api.delete(`/collectors/${id}`);
      setMessage(res.data.message);
      fetchCollectorsAndAreas();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError('Failed to delete collector.');
    }
  };

  if (!isAuth) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center space-y-3 mb-8">
        <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-white">Collector & Multi-Area Assignment Management</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Sign in to add Collectors and assign multiple Areas to them for automatic Excel report formatting.
        </p>
        <button
          onClick={handleOpenAuth}
          className="px-4 py-2 gradient-bg text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:opacity-90 transition"
        >
          Sign In to Manage Collectors
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl mb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Collector & Area Assignment Manager</h2>
            <p className="text-xs text-slate-400">
              Create Collectors and assign multiple Areas to automatically populate Collector Name in Excel reports
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-2.5 px-4 gradient-bg text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:opacity-95 transition flex items-center justify-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Collector</span>
        </button>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="mb-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">
              {editingCollectorId ? 'Edit Collector & Assigned Areas' : 'Add New Collector'}
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Collector Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr.Al-Amin"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl px-3.5 py-2 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. +880 1700 000000"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl px-3.5 py-2 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Area Multi-Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>Assign Collection Areas ({selectedAreaIds.length} selected)</span>
              </label>

              {allAreas.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No areas available in location manager. Add areas first.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800">
                  {allAreas.map((area) => {
                    const isSelected = selectedAreaIds.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => handleToggleArea(area.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between border transition ${
                          isSelected
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate mr-1">{area.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 gradient-bg text-white text-xs font-bold rounded-xl shadow-lg hover:opacity-90 transition"
              >
                {editingCollectorId ? 'Update Collector' : 'Create Collector'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search collectors by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 text-white rounded-xl pl-10 pr-4 py-2.5 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs"
        />
      </div>

      {/* Collectors Table */}
      {loading && collectors.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
          Loading collectors roster...
        </div>
      ) : collectors.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
          <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          No collectors found. Click "Add New Collector" above to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Collector Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Assigned Areas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {collectors.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <span>{c.name}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    {c.phone ? (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{c.phone}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No phone</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {c.areas && c.areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {c.areas.map((a) => (
                          <span
                            key={a.id}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-semibold"
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No areas assigned</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-indigo-500/10 rounded-lg border border-slate-700/50 hover:border-indigo-500/30 transition"
                      title="Edit Collector"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteCollector(c)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-500/10 rounded-lg border border-slate-700/50 hover:border-rose-500/30 transition"
                      title="Delete Collector"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Collector */}
      {confirmDeleteCollector && (
        <ConfirmModal
          isOpen={Boolean(confirmDeleteCollector)}
          title="Delete Collector?"
          message={`Are you sure you want to delete collector "${confirmDeleteCollector.name}"? Assigned area mappings will be released.`}
          confirmText="Yes, Delete Collector"
          variant="danger"
          onConfirm={() => executeDelete(confirmDeleteCollector.id)}
          onClose={() => setConfirmDeleteCollector(null)}
        />
      )}

    </div>
  );
}
