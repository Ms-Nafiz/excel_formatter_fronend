import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Plus, X } from 'lucide-react';

export default function SearchableSelect({
  value,
  options = [],
  onChange,
  placeholder = '-- Select Option --',
  accentColor = 'indigo',
  allowCustom = true,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    String(opt).toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const isCurrentInOptions = options.some(
    (opt) => String(opt).toLowerCase() === String(value || '').toLowerCase()
  );

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Color classes mapping
  const borderFocusColor =
    accentColor === 'amber'
      ? 'focus:border-amber-400 border-amber-500/40 text-amber-300'
      : accentColor === 'cyan'
      ? 'focus:border-cyan-400 border-cyan-500/40 text-cyan-300'
      : 'focus:border-indigo-400 border-indigo-500/40 text-indigo-300';

  const badgeColor =
    accentColor === 'amber'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : accentColor === 'cyan'
      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-950 text-left font-extrabold rounded-xl px-3 py-2 border transition flex items-center justify-between space-x-2 text-xs cursor-pointer ${
          isOpen ? 'ring-1 ring-amber-500/40 border-amber-500' : 'border-slate-800 hover:border-slate-700'
        } ${value ? 'text-white' : 'text-slate-500'}`}
      >
        <span className="truncate max-w-[90%]">
          {value || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
      </button>

      {/* Floating Searchable Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-64">
          
          {/* Search Box Input */}
          <div className="p-2 border-b border-slate-800 bg-slate-950/90 relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${options.length} options...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-white rounded-lg pl-8 pr-7 py-1.5 border border-slate-700 focus:border-amber-500 focus:outline-none text-xs font-semibold"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="flex-1 overflow-y-auto p-1 divide-y divide-slate-800/40 text-xs">
            
            {/* Clear / Empty Option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-2 rounded-lg transition font-semibold flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-white ${
                !value ? 'bg-slate-800/60 text-slate-300 font-bold' : ''
              }`}
            >
              <span>{placeholder}</span>
              {!value && <Check className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            {/* Current Value if not present in lookup list */}
            {value && !isCurrentInOptions && (
              <button
                type="button"
                onClick={() => handleSelect(value)}
                className={`w-full text-left px-3 py-2 rounded-lg transition font-bold flex items-center justify-between ${badgeColor}`}
              >
                <span className="truncate">{value} (Current)</span>
                <Check className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {/* Custom typed search term option */}
            {allowCustom && searchQuery.trim() && !options.some(o => o.toLowerCase() === searchQuery.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleSelect(searchQuery.trim())}
                className="w-full text-left px-3 py-2 rounded-lg transition font-bold text-amber-300 hover:bg-amber-500/20 flex items-center space-x-1.5 border border-dashed border-amber-500/40 my-1"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">Use Custom: "{searchQuery.trim()}"</span>
              </button>
            )}

            {/* Filtered Dropdown Items */}
            {filteredOptions.length === 0 && !searchQuery.trim() ? (
              <div className="py-4 text-center text-slate-500 text-xs">No options found.</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt).toLowerCase() === String(value || '').toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition font-semibold flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  </button>
                );
              })
            )}

          </div>

        </div>
      )}
    </div>
  );
}
