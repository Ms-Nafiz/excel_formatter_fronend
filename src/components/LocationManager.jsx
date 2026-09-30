import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { MapPin, Building, Plus, Edit2, Trash2, Search, Check, X, RefreshCw, AlertCircle } from 'lucide-react';

export default function LocationManager({ isAuthenticated, onOpenAuth, refreshTrigger, onDataChange }) {
  const auth = useAuth();
  const isAuth = isAuthenticated !== undefined ? isAuthenticated : Boolean(auth?.user);
  const handleOpenAuth = onOpenAuth || (() => {});

  const [activeTab, setActiveTab] = useState('areas'); // 'areas' | 'buildings'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // Custom Confirmation Modal State
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    if (!isAuth) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === 'areas' ? '/locations/areas' : '/locations/buildings';
      const res = await api.get(`${endpoint}?search=${encodeURIComponent(search)}`);
      setItems(activeTab === 'areas' ? res.data.areas : res.data.buildings);
    } catch (err) {
      console.error(`Failed to fetch ${activeTab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab, search, isAuth, refreshTrigger]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setError(null);
    setMessage(null);
    try {
      const endpoint = activeTab === 'areas' ? '/locations/areas' : '/locations/buildings';
      const res = await api.post(endpoint, { name: newName.trim() });
      setMessage(res.data.message);
      setNewName('');
      fetchItems();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.name?.[0] || 'Failed to create item.');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;

    setError(null);
    setMessage(null);
    try {
      const endpoint = activeTab === 'areas' ? `/locations/areas/${id}` : `/locations/buildings/${id}`;
      const res = await api.put(endpoint, { name: editName.trim() });
      setMessage(res.data.message);
      setEditingId(null);
      setEditName('');
      fetchItems();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.name?.[0] || 'Failed to update item.');
    }
  };

  const executeDelete = async (id) => {
    setError(null);
    setMessage(null);
    try {
      const endpoint = activeTab === 'areas' ? `/locations/areas/${id}` : `/locations/buildings/${id}`;
      const res = await api.delete(endpoint);
      setMessage(res.data.message);
      fetchItems();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError('Failed to delete item.');
    }
  };

  if (!isAuth) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center space-y-3 mb-8">
        <MapPin className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-white">Area & Building Lookup Management Locked</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Sign in to add, edit, or delete Area names and Building names used by the Smart Address Parser.
        </p>
        <button
          onClick={handleOpenAuth}
          className="px-4 py-2 gradient-bg text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:opacity-90 transition"
        >
          Sign In to Manage Locations
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl mb-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {activeTab === 'areas' ? <MapPin className="w-6 h-6" /> : <Building className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Address Parser Lookup Database</h2>
            <p className="text-xs text-slate-400">
              Manage pre-approved Areas and Buildings for high-precision address parsing and collector routing
            </p>
          </div>
        </div>

        {/* Tab Toggle Switch */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => { setActiveTab('areas'); setSearch(''); }}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'areas'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Target Areas</span>
          </button>
          <button
            onClick={() => { setActiveTab('buildings'); setSearch(''); }}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'buildings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Building Names</span>
          </button>
        </div>
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

      {/* Add New Entry Input Bar */}
      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder={`Add new ${activeTab === 'areas' ? 'Area name (e.g. Banani-2)' : 'Building name (e.g. Rose Villa)'}...`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-2.5 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="px-5 py-2.5 gradient-bg hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add {activeTab === 'areas' ? 'Area' : 'Building'}</span>
        </button>
      </form>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder={`Search ${activeTab === 'areas' ? 'areas' : 'buildings'}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 text-white rounded-xl pl-10 pr-4 py-2 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs"
        />
      </div>

      {/* Grid List */}
      {loading && items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
          Loading database records...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
          No {activeTab} found in database. Add one above!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
            >
              {editingId === item.id ? (
                <div className="flex items-center space-x-2 w-full">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-slate-950 text-white rounded-lg px-2.5 py-1 border border-indigo-500 focus:outline-none text-xs"
                  />
                  <button
                    onClick={() => handleUpdate(item.id)}
                    className="p-1 text-emerald-400 hover:text-white bg-emerald-500/20 rounded-md"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                    <span className="font-semibold text-xs text-slate-200">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteItem(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Confirmation Modal for Area / Building Deletion */}
      {confirmDeleteItem && (
        <ConfirmModal
          isOpen={Boolean(confirmDeleteItem)}
          title={`Delete ${activeTab === 'areas' ? 'Area' : 'Building'} Name?`}
          message={`Are you sure you want to delete "${confirmDeleteItem.name}" from ${activeTab}?`}
          confirmText="Yes, Delete"
          variant="danger"
          onConfirm={() => executeDelete(confirmDeleteItem.id)}
          onClose={() => setConfirmDeleteItem(null)}
        />
      )}

    </div>
  );
}
