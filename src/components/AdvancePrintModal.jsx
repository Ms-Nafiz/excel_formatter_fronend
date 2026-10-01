import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import {
  Printer,
  X,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Users,
  MapPin,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';

// Module-level in-memory cache for excel file data (instant 0ms loading on repeated opens)
const fileDataCache = new Map();

/**
 * Pre-fetch excel data in background on hover or pre-load
 */
export const prefetchFileData = async (fileId) => {
  if (!fileId || fileDataCache.has(fileId)) return;
  try {
    const res = await api.get(`/excel/file-data/${fileId}`);
    const h = res.data.data?.headers || [];
    const r = res.data.data?.rows || [];
    if (h.length > 0 || r.length > 0) {
      fileDataCache.set(fileId, { headers: h, rows: r });
    }
  } catch (err) {
    // Ignore prefetch error
  }
};

/**
 * Invalidate cache when file data is updated or deleted
 */
export const invalidateFileDataCache = (fileId) => {
  if (fileId) {
    fileDataCache.delete(fileId);
  } else {
    fileDataCache.clear();
  }
};

export default function AdvancePrintModal({
  isOpen,
  onClose,
  fileId,
  fileName = 'Excel_Report',
  initialRows,
  initialHeaders,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(initialRows || []);
  const [headers, setHeaders] = useState(initialHeaders || []);
  const [fetchError, setFetchError] = useState(null);

  // Column Mode: 'standard' (Name, ID, Add, Rent, Previous Dues, Total, Date) | 'custom'
  const [columnPreset, setColumnPreset] = useState('standard');

  // Print Configuration Options
  const [groupingMode, setGroupingMode] = useState('collector'); // 'collector' | 'area' | 'none'
  const [selectedCollectors, setSelectedCollectors] = useState([]); // array of collector strings; [] means all
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  // Multi-Level Sort Rules (Excel Style): Array of { column, order }
  const [sortRules, setSortRules] = useState([
    { column: 'area', order: 'asc' },
    { column: 'building', order: 'asc' },
    { column: 'house', order: 'asc' },
    { column: 'flat', order: 'asc' },
  ]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [showSummaries, setShowSummaries] = useState(false);
  const [rowDensity, setRowDensity] = useState('ultra-compact'); // 'ultra-compact' | 'compact' | 'normal'

  // Fetch data if fileId is passed and initialRows not available
  useEffect(() => {
    if (isOpen && fileId && (!initialRows || initialRows.length === 0)) {
      fetchData();
    } else if (initialRows && initialRows.length > 0) {
      setRows(initialRows);
      setHeaders(initialHeaders || []);
      if (initialHeaders && initialHeaders.length > 0) {
        setSelectedColumns(initialHeaders);
      }
    }
  }, [isOpen, fileId, initialRows, initialHeaders]);

  const fetchData = async () => {
    // 1. Instant load from in-memory cache if available (0ms delay)
    if (fileId && fileDataCache.has(fileId)) {
      const cached = fileDataCache.get(fileId);
      if (cached.rows && cached.rows.length > 0 && cached.rows[0]._db_previous_dues !== undefined) {
        setHeaders(cached.headers);
        setRows(cached.rows);
        setSelectedColumns(cached.headers);
        setLoading(false);
        return;
      }
      fileDataCache.delete(fileId);
    }

    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get(`/excel/file-data/${fileId}`);
      const h = res.data.data?.headers || [];
      const r = res.data.data?.rows || [];

      // Save to memory cache
      if (fileId) {
        fileDataCache.set(fileId, { headers: h, rows: r });
      }

      setHeaders(h);
      setRows(r);
      setSelectedColumns(h);
    } catch (err) {
      console.error('Failed to load file data for printing:', err);
      setFetchError(err.response?.data?.message || 'Failed to load spreadsheet data for printing.');
    } finally {
      setLoading(false);
    }
  };

  // Header keys lookup helpers
  const collectorHeaderKey = useMemo(() => {
    return headers.find((h) =>
      ['collector name', 'collector_name', 'collector', 'collectorname'].includes(h.toLowerCase().trim())
    ) || 'Collector Name';
  }, [headers]);

  const areaHeaderKey = useMemo(() => {
    return headers.find((h) =>
      ['area', 'area name', 'location', 'zone'].includes(h.toLowerCase().trim())
    ) || 'Area';
  }, [headers]);

  const buildingHeaderKey = useMemo(() => {
    return headers.find((h) =>
      ['building', 'building name', 'house/building', 'house name'].includes(h.toLowerCase().trim())
    ) || 'Building Name';
  }, [headers]);

  const houseHeaderKey = useMemo(() => {
    return headers.find((h) =>
      ['house', 'house no', 'house_no', 'holding'].includes(h.toLowerCase().trim())
    ) || 'House No';
  }, [headers]);

  const flatHeaderKey = useMemo(() => {
    return headers.find((h) =>
      ['flat', 'flat no', 'flat_no', 'room'].includes(h.toLowerCase().trim())
    ) || 'Flat No';
  }, [headers]);

  const statusHeaderKey = useMemo(() => {
    return headers.find((h) =>
      ['status', 'customer status', 'state'].includes(h.toLowerCase().trim())
    ) || 'Status';
  }, [headers]);

  const rentHeaderKey = useMemo(() => {
    const explicitKey = headers.find((h) => {
      const hLower = h.toLowerCase().trim().replace(/_/g, ' ');
      return !hLower.includes('total') && ['monthly rent', 'monthly fee'].some((k) => hLower.includes(k));
    });
    if (explicitKey) return explicitKey;

    const genericKey = headers.find((h) => {
      const hLower = h.toLowerCase().trim().replace(/_/g, ' ');
      return !hLower.includes('total') && ['rent', 'fee', 'salary', 'bill'].some((k) => hLower.includes(k));
    });
    return genericKey || 'Monthly Rent';
  }, [headers]);

  const duesHeaderKey = useMemo(() => {
    const explicitKey = headers.find((h) => {
      const hLower = h.toLowerCase().trim().replace(/_/g, ' ');
      return !hLower.includes('total') && ['previous dues', 'prev dues', 'previous baki', 'bokea'].some((k) => hLower.includes(k));
    });
    if (explicitKey) return explicitKey;

    const genericKey = headers.find((h) => {
      const hLower = h.toLowerCase().trim().replace(/_/g, ' ');
      return !hLower.includes('total') && ['dues', 'due', 'arrear', 'baki'].some((k) => hLower.includes(k));
    });
    return genericKey || 'Dues';
  }, [headers]);

  const advanceHeaderKey = useMemo(() => {
    return headers.find((h) =>
      ['advance', 'adv', 'advance amount'].includes(h.toLowerCase().trim())
    ) || 'Advance';
  }, [headers]);

  const dateHeaderKey = useMemo(() => {
    const explicitKey = headers.find((h) => {
      const hLower = h.toLowerCase().trim().replace(/_/g, ' ');
      return ['entry dt.', 'entry dt', 'entry date', 'entry_dt', 'entry_date', 'entrydt', 'date of entry'].some((k) => hLower.includes(k));
    });
    if (explicitKey) return explicitKey;

    const genericKey = headers.find((h) => {
      const hLower = h.toLowerCase().trim().replace(/_/g, ' ');
      return ['billing month', 'date', 'month'].some((k) => hLower.includes(k));
    });
    return genericKey || 'Date';
  }, [headers]);

  // Unique Lists
  const uniqueCollectors = useMemo(() => {
    const list = new Set();
    rows.forEach((r) => {
      const val = String(r[collectorHeaderKey] || 'Unassigned').trim();
      if (val) list.add(val);
    });
    return Array.from(list).sort();
  }, [rows, collectorHeaderKey]);

  // Row counts per collector
  const collectorRowCounts = useMemo(() => {
    const counts = {};
    rows.forEach((r) => {
      const val = String(r[collectorHeaderKey] || 'Unassigned').trim();
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }, [rows, collectorHeaderKey]);

  // Dynamic Available Areas based on Selected Collector(s)
  const availableAreas = useMemo(() => {
    const list = new Set();
    const rowsToInspect =
      selectedCollectors.length === 0
        ? rows
        : rows.filter((r) => {
            const val = String(r[collectorHeaderKey] || 'Unassigned').trim();
            return selectedCollectors.includes(val);
          });

    rowsToInspect.forEach((r) => {
      const val = String(r[areaHeaderKey] || 'Unspecified Area').trim();
      if (val) list.add(val);
    });
    return Array.from(list).sort();
  }, [rows, selectedCollectors, collectorHeaderKey, areaHeaderKey]);

  // Row counts per area under current collector filter
  const areaRowCounts = useMemo(() => {
    const counts = {};
    const rowsToInspect =
      selectedCollectors.length === 0
        ? rows
        : rows.filter((r) => {
            const val = String(r[collectorHeaderKey] || 'Unassigned').trim();
            return selectedCollectors.includes(val);
          });

    rowsToInspect.forEach((r) => {
      const area = String(r[areaHeaderKey] || 'Unspecified Area').trim();
      counts[area] = (counts[area] || 0) + 1;
    });
    return counts;
  }, [rows, selectedCollectors, collectorHeaderKey, areaHeaderKey]);

  // Handlers for Collector Multi-Select
  const handleToggleCollector = (collectorName) => {
    setSelectedCollectors((prev) =>
      prev.includes(collectorName) ? prev.filter((c) => c !== collectorName) : [...prev, collectorName]
    );
  };

  const handleSelectAllCollectors = () => {
    setSelectedCollectors([...uniqueCollectors]);
  };

  const handleClearAllCollectors = () => {
    setSelectedCollectors([]);
  };

  // Handlers for Area Multi-Select
  const handleToggleArea = (areaName) => {
    setSelectedAreas((prev) =>
      prev.includes(areaName) ? prev.filter((a) => a !== areaName) : [...prev, areaName]
    );
  };

  const handleSelectAllAreas = () => {
    setSelectedAreas([...availableAreas]);
  };

  const handleClearAllAreas = () => {
    setSelectedAreas([]);
  };

  // Options for Multi-Level Sorting
  const sortOptions = useMemo(() => {
    const options = [
      { key: 'area', label: 'Area Name' },
      { key: 'building', label: 'Building Name' },
      { key: 'house', label: 'House No / Name' },
      { key: 'flat', label: 'Flat No / Room' },
      { key: 'name', label: 'Customer Name' },
      { key: 'id', label: 'Customer ID' },
      { key: 'rent', label: 'Monthly Rent' },
      { key: 'dues', label: 'Previous Dues' },
      { key: 'total', label: 'Total Amount' },
      { key: 'collector', label: 'Collector Name' },
      { key: 'status', label: 'Customer Status' },
    ];

    headers.forEach((h) => {
      const isAlreadyCovered = options.some(
        (opt) => opt.label.toLowerCase() === h.toLowerCase() || opt.key === h.toLowerCase()
      );
      if (!isAlreadyCovered) {
        options.push({ key: `raw:${h}`, label: `Excel Header: ${h}` });
      }
    });

    return options;
  }, [headers]);

  // Helper to safely parse numeric values from strings, numbers, or DB fallbacks
  const parseNumeric = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to safely parse date parts from DD-MM-YYYY, YYYY-MM-DD, or Month-Year strings
  const parseDateParts = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    // YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-08-15)
    if (/^\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}/.test(str)) {
      const p = str.split(/[\-\/]/);
      return {
        year: parseInt(p[0], 10),
        month: parseInt(p[1], 10),
        day: parseInt(p[2], 10),
      };
    }

    // DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY (e.g. 15-08-2026 or 15-08-26)
    if (/^\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}/.test(str)) {
      const p = str.split(/[\-\/]/);
      let day = parseInt(p[0], 10);
      let month = parseInt(p[1], 10);
      let year = parseInt(p[2], 10);
      if (year < 100) year += 2000;

      if (month > 12 && day <= 12) {
        const temp = day;
        day = month;
        month = temp;
      }

      return { year, month, day };
    }

    // Month Name + Year (e.g. "August 2026", "Aug 2026", "Aug-26")
    if (/^[A-Za-z]+\s*[\-\/]?\s*\d{2,4}$/.test(str)) {
      const parts = str.split(/[\s\-\/]+/);
      const monthMap = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
      };
      const monthKey = parts[0].slice(0, 3).toLowerCase();
      const month = monthMap[monthKey] || 1;
      let year = parseInt(parts[1], 10);
      if (year < 100) year += 2000;
      return { year, month, day: 1 };
    }

    // Standard JS Date parse
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      };
    }

    return null;
  };

  // Format dates into short day-month-year format (e.g. "15-08-26" or "05-09-26")
  const formatShortDate = (val) => {
    const parts = parseDateParts(val);
    if (!parts) {
      const now = new Date();
      const dayStr = String(now.getDate()).padStart(2, '0');
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const yearStr = now.getFullYear().toString().slice(-2);
      return `${dayStr}-${monthStr}-${yearStr}`;
    }

    const dayStr = String(parts.day).padStart(2, '0');
    const monthStr = String(parts.month).padStart(2, '0');
    const yearStr = String(parts.year).slice(-2);

    return `${dayStr}-${monthStr}-${yearStr}`;
  };

  // Helper to check if date belongs ONLY to last month of current year (e.g. August 2026 when current is September 2026)
  const checkIsLastMonthOfCurrentYear = (val) => {
    const parts = parseDateParts(val);
    if (!parts) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed (e.g. 9 for September)

    let targetYear = currentYear;
    let targetMonth = currentMonth - 1; // Last month (e.g. 8 for August)

    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear = currentYear - 1;
    }

    return parts.year === targetYear && parts.month === targetMonth;
  };

  // Extract sortable value from row for a given column key
  const getSortableValue = (row, key, idx) => {
    if (key === 'area') {
      return String(row[areaHeaderKey] || '').trim();
    }
    if (key === 'building') {
      return String(row[buildingHeaderKey] || '').trim();
    }
    if (key === 'house') {
      return String(row[houseHeaderKey] || '').trim();
    }
    if (key === 'flat') {
      return String(row[flatHeaderKey] || '').trim();
    }
    if (key === 'name') {
      return String(row['Customer Name'] || row['Name'] || (headers[1] ? row[headers[1]] : '') || '').trim();
    }
    if (key === 'id') {
      const rawId = row['Customer ID'] || row['ID'] || row['Customer Code'] || row['Code'] || row['SL'] || (idx + 1);
      const num = parseFloat(rawId);
      return isNaN(num) ? String(rawId || '').trim() : num;
    }
    if (key === 'rent') {
      const rawRent = row._db_monthly_rent !== undefined
        ? row._db_monthly_rent
        : (row[rentHeaderKey] ?? row['Monthly Rent'] ?? row['monthly_rent'] ?? row['Rent'] ?? row['rent'] ?? 0);
      return parseNumeric(rawRent);
    }
    if (key === 'dues') {
      const rawDues = row._db_previous_dues !== undefined
        ? row._db_previous_dues
        : (row[duesHeaderKey] ?? row['Previous Dues'] ?? row['previous_dues'] ?? row['Dues'] ?? row['due'] ?? row['prev_dues'] ?? 0);
      return parseNumeric(rawDues);
    }
    if (key === 'total') {
      const rawRent = row._db_monthly_rent !== undefined
        ? row._db_monthly_rent
        : (row[rentHeaderKey] ?? row['Monthly Rent'] ?? row['monthly_rent'] ?? row['Rent'] ?? row['rent'] ?? 0);
      const rawDues = row._db_previous_dues !== undefined
        ? row._db_previous_dues
        : (row[duesHeaderKey] ?? row['Previous Dues'] ?? row['previous_dues'] ?? row['Dues'] ?? row['due'] ?? row['prev_dues'] ?? 0);
      return parseNumeric(rawRent) + parseNumeric(rawDues);
    }
    if (key === 'collector') {
      return String(row[collectorHeaderKey] || '').trim();
    }
    if (key === 'status') {
      return String(row[statusHeaderKey] || '').trim();
    }
    if (key.startsWith('raw:')) {
      const rawHeader = key.slice(4);
      const val = row[rawHeader];
      const num = parseFloat(val);
      return isNaN(num) || String(val).trim() === '' ? String(val || '').trim() : num;
    }

    const val = row[key];
    const num = parseFloat(val);
    return isNaN(num) || String(val).trim() === '' ? String(val || '').trim() : num;
  };

  // Sort Rules Handlers
  const handleAddSortRule = () => {
    setSortRules((prev) => [...prev, { column: 'name', order: 'asc' }]);
  };

  const handleUpdateSortRule = (index, field, value) => {
    setSortRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveSortRule = (index) => {
    setSortRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Readable Summary of Active Sort Rules
  const sortSummaryText = useMemo(() => {
    if (!sortRules || sortRules.length === 0) return 'None';
    return sortRules
      .map((r) => {
        const opt = sortOptions.find((o) => o.key === r.column);
        const label = opt ? opt.label : r.column;
        return `${label} (${r.order === 'asc' ? 'A-Z/Low-High' : 'Z-A/High-Low'})`;
      })
      .join(' ➔ ');
  }, [sortRules, sortOptions]);

  // Dynamic cell padding & height classes based on rowDensity
  const densityCellClasses = useMemo(() => {
    if (rowDensity === 'ultra-compact') {
      return {
        th: 'py-0.5 px-1.5 text-[10px] leading-tight font-bold',
        td: 'py-0.5 px-1.5 text-[10px] leading-tight font-medium',
        subtotal: 'py-0.5 px-1.5 text-[10px] leading-tight font-extrabold',
      };
    }
    if (rowDensity === 'compact') {
      return {
        th: 'py-1 px-2 text-[11px] leading-snug font-bold',
        td: 'py-1 px-2 text-[11px] leading-snug font-medium',
        subtotal: 'py-1 px-2 text-[11px] leading-snug font-extrabold',
      };
    }
    return {
      th: 'py-2 px-2.5 text-xs leading-normal font-bold',
      td: 'py-1.5 px-2.5 text-xs leading-normal font-medium',
      subtotal: 'py-2 px-2.5 text-xs leading-normal font-extrabold',
    };
  }, [rowDensity]);

  // Readable Area / Collector scope filter text for document header
  const printHeaderFilterText = useMemo(() => {
    const parts = [];
    if (selectedCollectors.length > 0) {
      if (selectedCollectors.length <= 2) {
        parts.push(`Collector(s): ${selectedCollectors.join(', ')}`);
      } else {
        parts.push(`Collector(s): ${selectedCollectors.slice(0, 2).join(', ')} (+${selectedCollectors.length - 2} more)`);
      }
    } else {
      parts.push(`Collectors: All (${uniqueCollectors.length})`);
    }

    if (selectedAreas && selectedAreas.length > 0) {
      if (selectedAreas.length <= 3) {
        parts.push(`Area(s): ${selectedAreas.join(', ')}`);
      } else {
        parts.push(`Area(s): ${selectedAreas.slice(0, 3).join(', ')} (+${selectedAreas.length - 3} more)`);
      }
    } else if (selectedCollectors.length > 0) {
      parts.push(`Areas: All Assigned (${availableAreas.length})`);
    } else {
      parts.push('Areas: All Areas');
    }

    if (groupingMode === 'none') {
      parts.push('Mode: Grouping All (Combined)');
    }

    return parts.join(' | ');
  }, [selectedCollectors, uniqueCollectors, selectedAreas, availableAreas, groupingMode]);

  // Extract Standard Print Columns (ID, Name, Add Name, Rent, Previous Dues, Total, Date) for any row
  const getStandardRowData = (r, idx) => {
    const idVal = r['Customer ID'] || r['ID'] || r['Customer Code'] || r['Code'] || r['SL'] || r['_row_index'] || (idx + 1);
    const nameVal = r['Customer Name'] || r['Name'] || r['Client Name'] || 'N/A';
    
    // Formatted Address (Add / Add Name)
    let addVal = r['Add Name'] || r['Add'] || r['Add Combined'] || r['Address'] || r['Full Address'] || '';
    if (!addVal) {
      const parts = [r[areaHeaderKey], r[buildingHeaderKey], r[houseHeaderKey], r[flatHeaderKey]].filter(Boolean);
      addVal = parts.join(', ') || 'N/A';
    }

    const rawRent = r._db_monthly_rent !== undefined
      ? r._db_monthly_rent
      : (r[rentHeaderKey] ?? r['Monthly Rent'] ?? r['monthly_rent'] ?? r['Rent'] ?? r['rent'] ?? 0);
    const rentVal = parseNumeric(rawRent);

    const rawDues = r._db_previous_dues !== undefined
      ? r._db_previous_dues
      : (r[duesHeaderKey] ?? r['Previous Dues'] ?? r['previous_dues'] ?? r['Dues'] ?? r['due'] ?? r['prev_dues'] ?? 0);
    const duesVal = parseNumeric(rawDues);
    const totalVal = rentVal + duesVal;
    
    const rawDate =
      r[dateHeaderKey] ??
      r['Entry Dt.'] ??
      r['Entry Dt'] ??
      r['Entry Date'] ??
      r['entry_dt'] ??
      r['entry_date'] ??
      r['Billing Month'] ??
      r['billing_month'] ??
      r['Date'] ??
      r['date'] ??
      r['Month'];
    const dateVal = formatShortDate(rawDate);
    const isLastMonth = checkIsLastMonthOfCurrentYear(rawDate);

    return {
      id: idVal,
      name: nameVal,
      add: addVal,
      collector: String(r[collectorHeaderKey] || '').trim(),
      rent: rentVal,
      previousDues: duesVal,
      total: totalVal,
      date: dateVal,
      isPreviousMonth: isLastMonth,
    };
  };

  // Filter & Sort Logic
  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    // 1. Multi-Select Bill Collector Filter
    if (selectedCollectors.length > 0) {
      result = result.filter((r) => {
        const val = String(r[collectorHeaderKey] || 'Unassigned').trim();
        return selectedCollectors.includes(val);
      });
    }

    // 2. Multi-Select Area Filter
    if (selectedAreas.length > 0) {
      result = result.filter((r) => {
        const area = String(r[areaHeaderKey] || 'Unspecified Area').trim();
        return selectedAreas.includes(area);
      });
    }

    // 3. Status Filter
    if (selectedStatus !== 'all') {
      result = result.filter((r) => {
        const st = String(r[statusHeaderKey] || 'Active').trim().toLowerCase();
        return selectedStatus === 'active' ? st === 'active' : st === 'inactive';
      });
    }

    // 4. Multi-Level Excel Sorting
    if (sortRules && sortRules.length > 0) {
      result.sort((a, b) => {
        for (let i = 0; i < sortRules.length; i++) {
          const rule = sortRules[i];
          const valA = getSortableValue(a, rule.column, 0);
          const valB = getSortableValue(b, rule.column, 0);

          let comparison = 0;

          if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else {
            const strA = String(valA ?? '');
            const strB = String(valB ?? '');
            comparison = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
          }

          if (comparison !== 0) {
            return rule.order === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    return result;
  }, [
    rows,
    selectedCollectors,
    selectedAreas,
    selectedStatus,
    sortRules,
    collectorHeaderKey,
    areaHeaderKey,
    buildingHeaderKey,
    houseHeaderKey,
    flatHeaderKey,
    statusHeaderKey,
    rentHeaderKey,
    duesHeaderKey,
    headers,
  ]);

  // Grouping Data
  const groupedData = useMemo(() => {
    // Mode 'none' represents "Grouping All (Combined)" - everything in one table without group separation
    if (groupingMode === 'none') {
      let gName = 'All Records';
      if (selectedCollectors.length > 0 && selectedAreas.length > 0) {
        gName = `${selectedCollectors.join(', ')} | ${selectedAreas.join(', ')}`;
      } else if (selectedCollectors.length > 0) {
        gName = `Collectors: ${selectedCollectors.join(', ')}`;
      } else if (selectedAreas.length > 0) {
        gName = `Areas: ${selectedAreas.join(', ')}`;
      }
      return [{ groupName: gName, rows: filteredAndSortedRows }];
    }

    const groups = {};
    const keyToUse = groupingMode === 'collector' ? collectorHeaderKey : areaHeaderKey;
    const defaultLabel = groupingMode === 'collector' ? 'Unassigned Collector' : 'Unspecified Area';

    filteredAndSortedRows.forEach((r) => {
      const gKey = String(r[keyToUse] || defaultLabel).trim();
      if (!groups[gKey]) {
        groups[gKey] = [];
      }
      groups[gKey].push(r);
    });

    return Object.keys(groups)
      .sort()
      .map((gName) => ({
        groupName: gName,
        rows: groups[gName],
      }));
  }, [filteredAndSortedRows, groupingMode, collectorHeaderKey, areaHeaderKey, selectedCollectors, selectedAreas]);

  // Overall Totals
  const grandTotals = useMemo(() => {
    let activeCount = 0;
    let totalRent = 0;
    let totalDues = 0;
    let totalAdvance = 0;
    let totalPayable = 0;

    filteredAndSortedRows.forEach((r, idx) => {
      const st = String(r[statusHeaderKey] || 'Active').trim().toLowerCase();
      if (st === 'active') activeCount++;

      const stdData = getStandardRowData(r, idx);
      totalRent += stdData.rent;
      totalDues += stdData.previousDues;
      totalPayable += stdData.total;
      totalAdvance += parseFloat(r[advanceHeaderKey]) || 0;
    });

    return {
      totalRows: filteredAndSortedRows.length,
      activeCount,
      totalRent,
      totalDues,
      totalAdvance,
      totalPayable,
    };
  }, [filteredAndSortedRows, statusHeaderKey, rentHeaderKey, duesHeaderKey, advanceHeaderKey]);

  // Column Toggle Handler
  const handleToggleColumn = (colName) => {
    setSelectedColumns((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(headers);
  };

  const handleClearAllColumns = () => {
    setSelectedColumns(headers.slice(0, 2));
  };

  // Trigger Native Print Dialog
  const handlePrint = () => {
    window.print();
  };

  const renderPrintableDocumentContent = () => {
    if (loading || fetchError || filteredAndSortedRows.length === 0) return null;

    return (
      <div
        id="printable-advance-document"
        className={`printable-card bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200 min-h-full font-sans text-xs ${
          orientation === 'landscape' ? 'w-full' : 'max-w-4xl mx-auto'
        }`}
      >
        {/* Printable Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600 no-print" />
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                Chittagong Communications
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Collector Target & Excel Data Report • {fileName}
            </p>
          </div>

          <div className="text-left sm:text-right text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-[9px] font-normal text-slate-500 mt-0.5 leading-tight">{printHeaderFilterText}</p>
          </div>
        </div>

        {/* Printable Overall Summary Matrix Box */}
        {showSummaries && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-300 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-2 border-r border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Records</p>
              <p className="text-sm font-extrabold text-slate-900">{grandTotals.totalRows}</p>
            </div>
            <div className="p-2 border-r border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Active Customers</p>
              <p className="text-sm font-extrabold text-emerald-700">{grandTotals.activeCount}</p>
            </div>
            <div className="p-2 border-r border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Monthly Rent</p>
              <p className="text-sm font-extrabold text-slate-900">৳{grandTotals.totalRent.toLocaleString()}</p>
            </div>
            <div className="p-2 border-r border-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Dues</p>
              <p className="text-sm font-extrabold text-rose-700">৳{grandTotals.totalDues.toLocaleString()}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Payable</p>
              <p className="text-sm font-extrabold text-indigo-700">৳{grandTotals.totalPayable.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Grouped Table Sections */}
        <div className="space-y-8">
          {groupedData.map((group, groupIdx) => {
            // Group summary metrics
            let groupRent = 0;
            let groupDues = 0;
            let groupPayable = 0;
            let groupActive = 0;

            group.rows.forEach((r, idx) => {
              const stdData = getStandardRowData(r, idx);
              groupRent += stdData.rent;
              groupDues += stdData.previousDues;
              groupPayable += stdData.total;
              const st = String(r[statusHeaderKey] || 'Active').trim().toLowerCase();
              if (st === 'active') groupActive++;
            });

            return (
              <div
                key={groupIdx}
                className={`print-group-box border border-slate-300 rounded-xl ${
                  groupIdx > 0 ? 'print-page-break mt-6' : ''
                }`}
              >
                {/* Group Header Banner */}
                <div className="bg-slate-100 py-1.5 px-3 border-b border-slate-300 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {groupingMode === 'collector' ? (
                      <Users className="w-3.5 h-3.5 text-indigo-600 no-print" />
                    ) : groupingMode === 'area' ? (
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 no-print" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-amber-600 no-print" />
                    )}
                    <h3 className="font-bold text-xs text-slate-900 tracking-tight">
                      {groupingMode === 'collector'
                        ? `Collector: ${group.groupName}`
                        : groupingMode === 'area'
                        ? `Area: ${group.groupName}`
                        : `Grouping All: ${group.groupName}`}
                    </h3>
                    <span className="px-1.5 py-0.2 bg-slate-200 rounded-full text-[9px] font-semibold text-slate-600">
                      {group.rows.length} Customer(s)
                    </span>
                  </div>

                  <div className="text-[10px] font-semibold text-slate-700 space-x-2.5">
                    <span>Active: <strong className="text-emerald-700">{groupActive}</strong></span>
                    <span>Rent: <strong>৳{groupRent.toLocaleString()}</strong></span>
                    <span>Dues: <strong className="text-rose-700">৳{groupDues.toLocaleString()}</strong></span>
                    <span>Total: <strong className="text-indigo-700">৳{groupPayable.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Group Table Data */}
                <div className="overflow-x-auto">
                  {columnPreset === 'standard' ? (
                    /* Standard Mode explicitly requested: Name, ID, Add Name, Rent, Dues, Total, Date */
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 uppercase border-b border-slate-300">
                          <th className={`${densityCellClasses.th} border-r border-slate-300 whitespace-nowrap`}>Name</th>
                          <th className={`${densityCellClasses.th} border-r border-slate-300 whitespace-nowrap`}>ID</th>
                          <th className={`${densityCellClasses.th} border-r border-slate-300 whitespace-nowrap`}>Add Name</th>
                          <th className={`${densityCellClasses.th} border-r border-slate-300 text-right whitespace-nowrap`}>Rent</th>
                          <th className={`${densityCellClasses.th} border-r border-slate-300 text-right whitespace-nowrap`}>Dues</th>
                          <th className={`${densityCellClasses.th} border-r border-slate-300 text-right whitespace-nowrap`}>Total</th>
                          <th className={`${densityCellClasses.th} border-r border-slate-300 text-center whitespace-nowrap`}>Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {group.rows.map((r, rIdx) => {
                          const std = getStandardRowData(r, rIdx);
                          const st = String(r[statusHeaderKey] || 'Active').trim().toLowerCase();
                          const isInactive = st === 'inactive';

                          return (
                            <tr key={rIdx} className={`hover:bg-slate-50 ${isInactive ? 'bg-rose-50/60' : ''}`}>
                              <td className={`${densityCellClasses.td} border-r border-slate-300 font-bold text-indigo-950`}>
                                {std.name}
                              </td>
                              <td className={`${densityCellClasses.td} border-r border-slate-300 font-bold text-slate-900 whitespace-nowrap`}>
                                {std.id}
                              </td>
                              <td className={`${densityCellClasses.td} border-r border-slate-300 text-slate-800`}>
                                {std.add}
                              </td>
                              <td className={`${densityCellClasses.td} border-r border-slate-300 text-right font-bold text-slate-900`}>
                                ৳{std.rent.toLocaleString()}
                              </td>
                              <td className={`${densityCellClasses.td} border-r border-slate-300 text-right font-bold text-rose-700`}>
                                ৳{std.previousDues.toLocaleString()}
                              </td>
                              <td className={`${densityCellClasses.td} border-r border-slate-300 text-right font-extrabold text-indigo-700`}>
                                ৳{std.total.toLocaleString()}
                              </td>
                              <td className={`${densityCellClasses.td} border-r border-slate-300 text-center text-[7.5px] leading-none tracking-tight whitespace-nowrap`}>
                                {std.isPreviousMonth ? (
                                  <span className="inline-block bg-slate-200 text-slate-900 font-extrabold px-1 py-0.5 rounded border border-slate-400 print:bg-slate-200 shadow-sm">
                                    {std.date}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-normal">
                                    {std.date}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Standard Subtotal Row */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                          <td colSpan={3} className={`${densityCellClasses.subtotal} border-r border-slate-300 tracking-wide`}>
                            {groupingMode === 'none' ? `TOTAL (All Combined - ${group.rows.length} Customers)` : `SUBTOTAL (${group.groupName})`}
                          </td>
                          <td className={`${densityCellClasses.subtotal} border-r border-slate-300 text-right text-slate-900`}>
                            ৳{groupRent.toLocaleString()}
                          </td>
                          <td className={`${densityCellClasses.subtotal} border-r border-slate-300 text-right text-rose-700`}>
                            ৳{groupDues.toLocaleString()}
                          </td>
                          <td className={`${densityCellClasses.subtotal} border-r border-slate-300 text-right text-indigo-700`}>
                            ৳{groupPayable.toLocaleString()}
                          </td>
                          <td className="border-r border-slate-300" />
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    /* Custom Columns Mode */
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 uppercase border-b border-slate-300">
                          {selectedColumns.map((col, cIdx) => (
                            <th key={cIdx} className={`${densityCellClasses.th} border-r border-slate-300 whitespace-nowrap`}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {group.rows.map((r, rIdx) => {
                          const st = String(r[statusHeaderKey] || 'Active').trim().toLowerCase();
                          const isInactive = st === 'inactive';

                          return (
                            <tr key={rIdx} className={`hover:bg-slate-50 ${isInactive ? 'bg-rose-50/60' : ''}`}>
                              {selectedColumns.map((col, colIdx) => (
                                <td key={colIdx} className={`${densityCellClasses.td} border-r border-slate-300`}>
                                  {r[col] ?? ''}
                                </td>
                              ))}
                            </tr>
                          );
                        })}

                        {/* Custom Subtotal Row */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                          <td colSpan={2} className={`${densityCellClasses.subtotal} border-r border-slate-300`}>
                            {groupingMode === 'none' ? `TOTAL (All Combined - ${group.rows.length} Customers)` : `SUBTOTAL (${group.groupName})`}
                          </td>
                          {selectedColumns.slice(1).map((col, colIdx) => {
                            if (col === rentHeaderKey) {
                              return (
                                <td key={colIdx} className={`${densityCellClasses.subtotal} border-r border-slate-300 text-slate-900`}>
                                  ৳{groupRent.toLocaleString()}
                                </td>
                              );
                            }
                            if (col === duesHeaderKey) {
                              return (
                                <td key={colIdx} className={`${densityCellClasses.subtotal} border-r border-slate-300 text-rose-700`}>
                                  ৳{groupDues.toLocaleString()}
                                </td>
                              );
                            }
                            return <td key={colIdx} className="border-r border-slate-300" />;
                          })}
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Printable Signature Footer Block */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-[11px] font-bold text-slate-700">
          <div>
            <div className="border-b border-slate-400 w-32 mx-auto mb-2" />
            <span>Prepared By</span>
          </div>
          <div>
            <div className="border-b border-slate-400 w-32 mx-auto mb-2" />
            <span>Collector Signature</span>
          </div>
          <div>
            <div className="border-b border-slate-400 w-32 mx-auto mb-2" />
            <span>Supervisor Sign</span>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. On-Screen Interactive Modal Overlay (Hidden during print) */}
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print-bg no-print">
          <div className="relative w-full max-w-6xl h-[92vh] glass-card rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between no-print">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Advance Excel Data Print Studio</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      {filteredAndSortedRows.length} Rows Ready
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Print Format: Name, ID, Address (Add), Rent, Previous Dues, Total, Date
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrint}
                  disabled={loading || filteredAndSortedRows.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-40 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document Now</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content: Split Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              
              {/* LEFT SIDEBAR: Print Controls & Customizations */}
              <div className="lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40 overflow-y-auto space-y-5 no-print text-xs">
                
                {/* 1. Print Column Preset Selection */}
                <div className="space-y-2">
                  <label className="text-slate-300 font-bold flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>1. Print Column Format:</span>
                  </label>
                  <div className="space-y-1.5 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setColumnPreset('standard')}
                      className={`w-full text-left py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-between ${
                        columnPreset === 'standard'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`w-4 h-4 ${columnPreset === 'standard' ? 'text-amber-400' : 'text-slate-600'}`} />
                        <div>
                          <div className="font-bold text-amber-200">Standard Required Columns</div>
                          <div className="text-[10px] text-slate-400 font-normal">Name, ID, Add Name, Rent, Dues, Total, Date</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setColumnPreset('custom')}
                      className={`w-full text-left py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-between ${
                        columnPreset === 'custom'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`w-4 h-4 ${columnPreset === 'custom' ? 'text-amber-400' : 'text-slate-600'}`} />
                        <div>
                          <div className="font-bold">Raw Excel Column Selector</div>
                          <div className="text-[10px] text-slate-400 font-normal">Pick custom headers from uploaded Excel</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Grouping Mode */}
                <div className="space-y-2">
                  <label className="text-slate-300 font-bold flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>2. Grouping & Layout Mode:</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setGroupingMode('collector')}
                      className={`py-2 px-2 rounded-lg font-bold text-[11px] transition text-center ${
                        groupingMode === 'collector'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      By Collector
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupingMode('area')}
                      className={`py-2 px-2 rounded-lg font-bold text-[11px] transition text-center ${
                        groupingMode === 'area'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      By Area
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupingMode('none')}
                      className={`py-2 px-2 rounded-lg font-bold text-[11px] transition text-center ${
                        groupingMode === 'none'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Combine all selected areas & collectors into 1 unified table without separation"
                    >
                      Grouping All
                    </button>
                  </div>
                  <div className="text-[10px] px-1 text-slate-400">
                    {groupingMode === 'none' ? (
                      <span className="text-amber-400 font-semibold">
                        ⚡ <strong>Grouping All Mode:</strong> Selected areas & bill collectors will be displayed together in ONE table (no separate group breaks).
                      </span>
                    ) : groupingMode === 'collector' ? (
                      <span>Separate tables & page breaks per Bill Collector.</span>
                    ) : (
                      <span>Separate tables & page breaks per Area.</span>
                    )}
                  </div>
                </div>

                {/* 3. Multi-Level Sorting Criteria */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold flex items-center space-x-2">
                      <ArrowUpDown className="w-4 h-4 text-amber-400" />
                      <span>3. Multi-Level Sort Rules (Excel Style):</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSortRule}
                      className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Level</span>
                    </button>
                  </div>
                  {/* Quick 1-Click Presets */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-thin">
                    <span className="text-amber-400 font-bold shrink-0">1-Click Presets:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSortRules([
                          { column: 'area', order: 'asc' },
                          { column: 'building', order: 'asc' },
                          { column: 'house', order: 'asc' },
                          { column: 'flat', order: 'asc' },
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold whitespace-nowrap cursor-pointer transition"
                      title="Apply Default Hierarchy: Area ➔ Building ➔ House ➔ Flat"
                    >
                      Default Filter (Area ➔ Building ➔ House ➔ Flat)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSortRules([
                          { column: 'name', order: 'asc' },
                          { column: 'area', order: 'asc' },
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold whitespace-nowrap cursor-pointer transition"
                    >
                      Name (A-Z)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSortRules([
                          { column: 'dues', order: 'desc' },
                          { column: 'area', order: 'asc' },
                          { column: 'house', order: 'asc' },
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold whitespace-nowrap cursor-pointer transition"
                    >
                      High Dues First
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCollectors([]);
                        setSelectedAreas([]);
                        setSelectedStatus('all');
                        setGroupingMode('collector');
                        setSortRules([
                          { column: 'area', order: 'asc' },
                          { column: 'building', order: 'asc' },
                          { column: 'house', order: 'asc' },
                          { column: 'flat', order: 'asc' },
                        ]);
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 font-bold whitespace-nowrap cursor-pointer transition"
                      title="Reset all filters and sorting to defaults"
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sortRules.map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-1.5 p-1.5 bg-slate-950 rounded-xl border border-slate-800"
                      >
                        <span className="text-[10px] font-extrabold text-amber-400 w-4 text-center">
                          #{index + 1}
                        </span>

                        <select
                          value={rule.column}
                          onChange={(e) => handleUpdateSortRule(index, 'column', e.target.value)}
                          className="flex-1 bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-[11px] px-2 py-1 focus:outline-none focus:border-amber-500"
                        >
                          {sortOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSortRule(index, 'order', rule.order === 'asc' ? 'desc' : 'asc')
                          }
                          className="px-2 py-1 bg-slate-900 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-[10px] font-bold"
                          title="Toggle Ascending / Descending"
                        >
                          {rule.order === 'asc' ? 'A ➔ Z' : 'Z ➔ A'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveSortRule(index)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                          title="Remove Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Filter Subset Data (Bill Collector & Area Filter) */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <label className="text-slate-300 font-bold flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-amber-400" />
                    <span>4. Filter Subset Data:</span>
                  </label>

                  {/* Multi-Select Bill Collector Filter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-medium text-slate-300">
                        Filter by Bill Collector(s):
                        {selectedCollectors.length > 0 ? (
                          <span className="text-amber-400 font-bold ml-1.5">
                            ({selectedCollectors.length} selected)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px] ml-1.5 font-normal">
                            (All included)
                          </span>
                        )}
                      </label>
                      <div className="space-x-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllCollectors}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                        >
                          All
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={handleClearAllCollectors}
                          className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 scrollbar-thin">
                      {uniqueCollectors.length === 0 ? (
                        <div className="text-[11px] text-slate-500 text-center py-2">
                          No collectors available
                        </div>
                      ) : (
                        uniqueCollectors.map((c) => {
                          const isChecked = selectedCollectors.includes(c);
                          const count = collectorRowCounts[c] || 0;
                          return (
                            <label
                              key={c}
                              className="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white text-[11px] py-0.5"
                            >
                              <div className="flex items-center space-x-2 truncate pr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCollector(c)}
                                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                                />
                                <span className="truncate">{c}</span>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                {count}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Multi-Select Area Checkboxes */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-medium text-slate-300">
                        {selectedCollectors.length > 0 ? (
                          <span>
                            Assigned Areas for Selected Collector(s):
                            {selectedAreas.length > 0 && (
                              <span className="text-amber-400 font-bold ml-1.5">
                                ({selectedAreas.length} selected)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>
                            Filter by Area(s):
                            {selectedAreas.length > 0 ? (
                              <span className="text-amber-400 font-bold ml-1.5">
                                ({selectedAreas.length} selected)
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] ml-1.5 font-normal">
                                (All included)
                              </span>
                            )}
                          </span>
                        )}
                      </label>
                      <div className="space-x-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllAreas}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                        >
                          All
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={handleClearAllAreas}
                          className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 scrollbar-thin">
                      {availableAreas.length === 0 ? (
                        <div className="text-[11px] text-slate-500 text-center py-2">
                          No areas available
                        </div>
                      ) : (
                        availableAreas.map((area) => {
                          const isChecked = selectedAreas.includes(area);
                          const count = areaRowCounts[area] || 0;
                          return (
                            <label
                              key={area}
                              className="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white text-[11px] py-0.5"
                            >
                              <div className="flex items-center space-x-2 truncate pr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleArea(area)}
                                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                                />
                                <span className="truncate">{area}</span>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                {count}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Customer Status Filter */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">Customer Status:</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedStatus('all')}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition ${
                          selectedStatus === 'all'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStatus('active')}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition ${
                          selectedStatus === 'active'
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStatus('inactive')}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition ${
                          selectedStatus === 'inactive'
                            ? 'bg-rose-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Column Customizer */}
                {columnPreset === 'custom' && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-bold flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-amber-400" />
                        <span>5. Select Custom Columns ({selectedColumns.length}):</span>
                      </label>
                      <div className="space-x-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllColumns}
                          className="text-[10px] text-amber-400 hover:underline"
                        >
                          All
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={handleClearAllColumns}
                          className="text-[10px] text-slate-400 hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                      {headers.map((h) => {
                        const isChecked = selectedColumns.includes(h);
                        return (
                          <label
                            key={h}
                            className="flex items-center space-x-2 text-slate-300 cursor-pointer hover:text-white text-[11px]"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleColumn(h)}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="truncate">{h}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Paper Setup */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="text-slate-300 font-bold flex items-center space-x-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                    <span>6. Print Page Setup:</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        orientation === 'landscape'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Landscape (Wide)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        orientation === 'portrait'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Portrait (Tall)
                    </button>
                  </div>

                  {/* Row Height / Spacing Density */}
                  <div className="pt-1">
                    <label className="block text-[11px] text-slate-300 font-bold mb-1">
                      Row Height / Spacing Density:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setRowDensity('ultra-compact')}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          rowDensity === 'ultra-compact'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Minimum (Ultra-Tight)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRowDensity('compact')}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          rowDensity === 'compact'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Compact
                      </button>
                      <button
                        type="button"
                        onClick={() => setRowDensity('normal')}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          rowDensity === 'normal'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Normal
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={showSummaries}
                      onChange={(e) => setShowSummaries(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Include Total Summary Box at Header</span>
                  </label>
                </div>

              </div>

              {/* RIGHT SIDEBAR: Live Document Print Preview */}
              <div className="lg:col-span-8 p-4 sm:p-6 bg-slate-950 overflow-y-auto printable-area">
                {loading ? (
                  <div className="py-24 text-center text-slate-400 text-xs no-print">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-3" />
                    Loading spreadsheet data for print setup...
                  </div>
                ) : fetchError ? (
                  <div className="py-16 text-center text-rose-300 text-xs no-print">
                    {fetchError}
                  </div>
                ) : filteredAndSortedRows.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 text-xs no-print">
                    <Filter className="w-10 h-10 text-amber-400/60 mx-auto mb-3" />
                    No records match your selected filter criteria.
                  </div>
                ) : (
                  renderPrintableDocumentContent()
                )}
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 2. Pure Print Document Portal (Hidden on screen, Visible ONLY during window.print()) */}
      {createPortal(
        <div id="printable-advance-document-portal">
          <style>{`
            @media screen {
              #printable-advance-document-portal {
                display: none !important;
              }
            }
            @media print {
              body > *:not(#printable-advance-document-portal) {
                display: none !important;
              }
              #printable-advance-document-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              #printable-advance-document-portal table {
                display: table !important;
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              #printable-advance-document-portal thead {
                display: table-header-group !important;
              }
              #printable-advance-document-portal tbody {
                display: table-row-group !important;
              }
              #printable-advance-document-portal tr {
                display: table-row !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #printable-advance-document-portal th {
                display: table-cell !important;
                background-color: #f1f5f9 !important;
                color: #0f172a !important;
                border: 1.5px solid #334155 !important;
                padding: 3px 6px !important;
                font-weight: 800 !important;
                font-size: 8.5pt !important;
              }
              #printable-advance-document-portal td {
                display: table-cell !important;
                color: #0f172a !important;
                border: 1px solid #475569 !important;
                padding: 2.5px 6px !important;
                font-size: 8.5pt !important;
              }
              #printable-advance-document-portal .print-page-break {
                page-break-before: always !important;
                break-before: page !important;
              }
              #printable-advance-document-portal .print-group-box {
                display: block !important;
                page-break-inside: auto !important;
                break-inside: auto !important;
                margin-bottom: 1rem !important;
                border: 1.5px solid #334155 !important;
              }
            }
          `}</style>
          {renderPrintableDocumentContent()}
        </div>,
        document.body
      )}
    </>
  );
}
