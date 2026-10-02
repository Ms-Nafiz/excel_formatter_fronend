import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import {
  Target,
  Download,
  RefreshCw,
  Printer,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  Info,
  Filter,
  Users,
  Search,
  X,
  Layers,
  FileSpreadsheet,
  RotateCcw,
  Check,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles
} from 'lucide-react';

// In-memory cache store so target report data persists across tab switches & month changes
const targetReportCache = {};

const defaultMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const getCurrentCalendarMonth = () => {
  const now = new Date();
  return `${defaultMonthNames[now.getMonth()]} ${now.getFullYear()}`;
};

export default function MonthlyTargetView({ refreshTrigger }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentCalendarMonth);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [activeDataMonths, setActiveDataMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Custom filter and view states
  // viewMode: 'type_collector' (Default), 'collector_wise', 'collector_type', 'type_wise'
  const [viewMode, setViewMode] = useState('type_collector');
  const [selectedCollector, setSelectedCollector] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL' | 'Analog' | 'Digital'
  const [searchQuery, setSearchQuery] = useState('');
  const [isTargetOnly, setIsTargetOnly] = useState(false); // Target Only Checkmark Toggle

  // Previous month comparison states
  const [customCompareMonth, setCustomCompareMonth] = useState('');
  const [prevMonthReport, setPrevMonthReport] = useState(null);
  const [loadingPrevMonth, setLoadingPrevMonth] = useState(false);

  // Helper to extract calendar previous month string (e.g. 'September 2026' -> 'August 2026')
  const getPreviousMonthString = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIdx = monthNames.findIndex((m) => m.toLowerCase() === parts[0].toLowerCase());
      const year = parseInt(parts[1], 10);
      if (monthIdx !== -1 && !isNaN(year)) {
        if (monthIdx === 0) {
          return `${monthNames[11]} ${year - 1}`;
        } else {
          return `${monthNames[monthIdx - 1]} ${year}`;
        }
      }
    }
    return '';
  };

  const activeCompareMonth = customCompareMonth || getPreviousMonthString(selectedMonth);

  // 1. Fetch available target months list on initial mount & refreshTrigger
  const fetchTargetMonths = async () => {
    try {
      const res = await api.get('/excel/target-months');
      if (res.data?.months && Array.isArray(res.data.months)) {
        setAvailableMonths(res.data.months);
      }
      if (res.data?.active_data_months && Array.isArray(res.data.active_data_months)) {
        setActiveDataMonths(res.data.active_data_months);
      }
      if (res.data?.current_month && !reportResult) {
        setSelectedMonth(res.data.current_month);
      }
    } catch (err) {
      console.error('Failed to fetch target months:', err);
    }
  };

  useEffect(() => {
    fetchTargetMonths();
  }, [refreshTrigger]);

  // 2. Fetch/Load Target Report for selected month with Caching
  const loadTargetReport = async (month, forceRefresh = false) => {
    const targetMonth = month || selectedMonth;

    // Return cached report instantly if available and forceRefresh is false
    if (!forceRefresh && targetReportCache[targetMonth]) {
      setReportResult(targetReportCache[targetMonth]);
      setStatusMessage(targetReportCache[targetMonth]?.message || '');
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('');

    try {
      const res = await api.post('/excel/target-report', { billing_month: targetMonth });
      targetReportCache[targetMonth] = res.data;
      setReportResult(res.data);
      if (res.data?.message) {
        setStatusMessage(res.data.message);
      }
    } catch (err) {
      console.error('Target report generation error:', err);
      setError(
        err.response?.data?.message ||
        `Failed to fetch target report for ${targetMonth}. Please try again.`
      );
      setReportResult(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCompareReport = async (compMonth, forceRefresh = false) => {
    if (!compMonth) {
      setPrevMonthReport(null);
      return;
    }

    if (!forceRefresh && targetReportCache[compMonth]) {
      setPrevMonthReport(targetReportCache[compMonth]);
      return;
    }

    setLoadingPrevMonth(true);
    try {
      const res = await api.post('/excel/target-report', { billing_month: compMonth });
      targetReportCache[compMonth] = res.data;
      setPrevMonthReport(res.data);
    } catch (err) {
      console.warn('Failed to load comparison target report:', err);
      setPrevMonthReport(null);
    } finally {
      setLoadingPrevMonth(false);
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      loadTargetReport(selectedMonth, false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (activeCompareMonth && activeCompareMonth !== selectedMonth) {
      loadCompareReport(activeCompareMonth, false);
    } else {
      setPrevMonthReport(null);
    }
  }, [activeCompareMonth, selectedMonth]);

  // Invalidate cache and force refresh when data mutation occurs across app
  useEffect(() => {
    if (refreshTrigger > 0) {
      Object.keys(targetReportCache).forEach((k) => delete targetReportCache[k]);
      if (selectedMonth) {
        loadTargetReport(selectedMonth, true);
      }
      if (activeCompareMonth && activeCompareMonth !== selectedMonth) {
        loadCompareReport(activeCompareMonth, true);
      }
    }
  }, [refreshTrigger]);

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
  };

  const fmtNum = (val) => {
    const num = Number(val);
    if (val === undefined || val === null || isNaN(num)) return '0';
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const calcSectionTotal = (list, key) => {
    if (!list || !Array.isArray(list)) return 0;
    return list.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
  };

  const rawAnalogList = useMemo(() => reportResult?.stats?.analog_stats || [], [reportResult]);
  const rawDigitalList = useMemo(() => reportResult?.stats?.digital_stats || [], [reportResult]);
  const hasData = reportResult?.has_data !== false && (rawAnalogList.length > 0 || rawDigitalList.length > 0);

  // Unique sorted collectors list
  const uniqueCollectors = useMemo(() => {
    const set = new Set();
    rawAnalogList.forEach((item) => {
      if (item.collector_name) set.add(item.collector_name);
    });
    rawDigitalList.forEach((item) => {
      if (item.collector_name) set.add(item.collector_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawAnalogList, rawDigitalList]);

  // Combined Collector-wise map (aggregating Analog and Digital for each collector)
  const collectorWiseMap = useMemo(() => {
    const map = {};
    const processItem = (item, typeName) => {
      const name = item.collector_name || 'Unassigned / Unmapped';
      if (!map[name]) {
        map[name] = {
          collector_name: name,
          count_of_id: 0,
          sum_of_rent: 0,
          sum_of_due: 0,
          sum_of_advnc: 0,
          sum_of_actual_bill: 0,
          sum_of_50: 0,
          sum_of_target: 0,
          analog: null,
          digital: null,
        };
      }
      const c = Number(item.count_of_id) || 0;
      const r = parseFloat(item.sum_of_rent) || 0;
      const d = parseFloat(item.sum_of_due) || 0;
      const a = parseFloat(item.sum_of_advnc) || 0;
      const act = parseFloat(item.sum_of_actual_bill) || 0;
      const f = parseFloat(item.sum_of_50) || 0;
      const t = parseFloat(item.sum_of_target) || 0;

      map[name].count_of_id += c;
      map[name].sum_of_rent += r;
      map[name].sum_of_due += d;
      map[name].sum_of_advnc += a;
      map[name].sum_of_actual_bill += act;
      map[name].sum_of_50 += f;
      map[name].sum_of_target += t;

      if (typeName === 'Analog') {
        map[name].analog = { ...item };
      } else {
        map[name].digital = { ...item };
      }
    };

    rawAnalogList.forEach((i) => processItem(i, 'Analog'));
    rawDigitalList.forEach((i) => processItem(i, 'Digital'));

    return map;
  }, [rawAnalogList, rawDigitalList]);

  // Helper filter check
  const matchesCollectorFilter = (collectorName) => {
    if (selectedCollector !== 'ALL' && collectorName !== selectedCollector) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (!collectorName.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  };

  // Filtered lists for Mode 1: Type & Collector (Default)
  const filteredAnalogList = useMemo(() => {
    if (selectedType === 'Digital') return [];
    return rawAnalogList.filter((item) => matchesCollectorFilter(item.collector_name));
  }, [rawAnalogList, selectedType, selectedCollector, searchQuery]);

  const filteredDigitalList = useMemo(() => {
    if (selectedType === 'Analog') return [];
    return rawDigitalList.filter((item) => matchesCollectorFilter(item.collector_name));
  }, [rawDigitalList, selectedType, selectedCollector, searchQuery]);

  // Filtered list for Mode 2: Collector Wise
  const filteredCollectorWiseList = useMemo(() => {
    return Object.values(collectorWiseMap)
      .filter((item) => matchesCollectorFilter(item.collector_name))
      .map((item) => {
        if (selectedType === 'Analog') {
          const an = item.analog;
          return {
            ...item,
            count_of_id: an ? Number(an.count_of_id) || 0 : 0,
            sum_of_rent: an ? parseFloat(an.sum_of_rent) || 0 : 0,
            sum_of_due: an ? parseFloat(an.sum_of_due) || 0 : 0,
            sum_of_advnc: an ? parseFloat(an.sum_of_advnc) || 0 : 0,
            sum_of_actual_bill: an ? parseFloat(an.sum_of_actual_bill) || 0 : 0,
            sum_of_50: an ? parseFloat(an.sum_of_50) || 0 : 0,
            sum_of_target: an ? parseFloat(an.sum_of_target) || 0 : 0,
          };
        }
        if (selectedType === 'Digital') {
          const dg = item.digital;
          return {
            ...item,
            count_of_id: dg ? Number(dg.count_of_id) || 0 : 0,
            sum_of_rent: dg ? parseFloat(dg.sum_of_rent) || 0 : 0,
            sum_of_due: dg ? parseFloat(dg.sum_of_due) || 0 : 0,
            sum_of_advnc: dg ? parseFloat(dg.sum_of_advnc) || 0 : 0,
            sum_of_actual_bill: dg ? parseFloat(dg.sum_of_actual_bill) || 0 : 0,
            sum_of_50: dg ? parseFloat(dg.sum_of_50) || 0 : 0,
            sum_of_target: dg ? parseFloat(dg.sum_of_target) || 0 : 0,
          };
        }
        return item;
      })
      .filter((item) => item.count_of_id > 0 || selectedCollector !== 'ALL')
      .sort((a, b) => a.collector_name.localeCompare(b.collector_name));
  }, [collectorWiseMap, selectedType, selectedCollector, searchQuery]);

  // Mode 3: Collector & Type Breakdown list
  const filteredCollectorTypeList = useMemo(() => {
    return Object.values(collectorWiseMap)
      .filter((item) => matchesCollectorFilter(item.collector_name))
      .sort((a, b) => a.collector_name.localeCompare(b.collector_name));
  }, [collectorWiseMap, selectedCollector, searchQuery]);

  // Calculations for Active Totals based on current filters
  const analogTotalCount = calcSectionTotal(filteredAnalogList, 'count_of_id');
  const analogTotalRent = calcSectionTotal(filteredAnalogList, 'sum_of_rent');
  const analogTotalDue = calcSectionTotal(filteredAnalogList, 'sum_of_due');
  const analogTotalAdv = calcSectionTotal(filteredAnalogList, 'sum_of_advnc');
  const analogTotalActual = calcSectionTotal(filteredAnalogList, 'sum_of_actual_bill');
  const analogTotalFifty = calcSectionTotal(filteredAnalogList, 'sum_of_50');
  const analogTotalTarget = calcSectionTotal(filteredAnalogList, 'sum_of_target');

  const digitalTotalCount = calcSectionTotal(filteredDigitalList, 'count_of_id');
  const digitalTotalRent = calcSectionTotal(filteredDigitalList, 'sum_of_rent');
  const digitalTotalDue = calcSectionTotal(filteredDigitalList, 'sum_of_due');
  const digitalTotalAdv = calcSectionTotal(filteredDigitalList, 'sum_of_advnc');
  const digitalTotalActual = calcSectionTotal(filteredDigitalList, 'sum_of_actual_bill');
  const digitalTotalFifty = calcSectionTotal(filteredDigitalList, 'sum_of_50');
  const digitalTotalTarget = calcSectionTotal(filteredDigitalList, 'sum_of_target');

  // Unified Grand Totals across all modes
  const grandCount = useMemo(() => {
    if (viewMode === 'collector_wise') {
      return calcSectionTotal(filteredCollectorWiseList, 'count_of_id');
    }
    return analogTotalCount + digitalTotalCount;
  }, [viewMode, filteredCollectorWiseList, analogTotalCount, digitalTotalCount]);

  const grandRent = useMemo(() => {
    if (viewMode === 'collector_wise') {
      return calcSectionTotal(filteredCollectorWiseList, 'sum_of_rent');
    }
    return analogTotalRent + digitalTotalRent;
  }, [viewMode, filteredCollectorWiseList, analogTotalRent, digitalTotalRent]);

  const grandDue = useMemo(() => {
    if (viewMode === 'collector_wise') {
      return calcSectionTotal(filteredCollectorWiseList, 'sum_of_due');
    }
    return analogTotalDue + digitalTotalDue;
  }, [viewMode, filteredCollectorWiseList, analogTotalDue, digitalTotalDue]);

  const grandAdv = useMemo(() => {
    if (viewMode === 'collector_wise') {
      return calcSectionTotal(filteredCollectorWiseList, 'sum_of_advnc');
    }
    return analogTotalAdv + digitalTotalAdv;
  }, [viewMode, filteredCollectorWiseList, analogTotalAdv, digitalTotalAdv]);

  const grandActual = useMemo(() => {
    if (viewMode === 'collector_wise') {
      return calcSectionTotal(filteredCollectorWiseList, 'sum_of_actual_bill');
    }
    return analogTotalActual + digitalTotalActual;
  }, [viewMode, filteredCollectorWiseList, analogTotalActual, digitalTotalActual]);

  const grandFifty = useMemo(() => {
    if (viewMode === 'collector_wise') {
      return calcSectionTotal(filteredCollectorWiseList, 'sum_of_50');
    }
    return analogTotalFifty + digitalTotalFifty;
  }, [viewMode, filteredCollectorWiseList, analogTotalFifty, digitalTotalFifty]);

  const grandTarget = useMemo(() => {
    if (viewMode === 'collector_wise') {
      return calcSectionTotal(filteredCollectorWiseList, 'sum_of_target');
    }
    return analogTotalTarget + digitalTotalTarget;
  }, [viewMode, filteredCollectorWiseList, analogTotalTarget, digitalTotalTarget]);

  // Previous / Comparison Month Target & Growth Calculations
  const prevAnalogList = useMemo(() => prevMonthReport?.stats?.analog_stats || [], [prevMonthReport]);
  const prevDigitalList = useMemo(() => prevMonthReport?.stats?.digital_stats || [], [prevMonthReport]);
  const prevHasData = prevMonthReport?.has_data !== false && (prevAnalogList.length > 0 || prevDigitalList.length > 0);

  const prevGrandTarget = useMemo(() => {
    return calcSectionTotal(prevAnalogList, 'sum_of_target') + calcSectionTotal(prevDigitalList, 'sum_of_target');
  }, [prevAnalogList, prevDigitalList]);

  const prevGrandRent = useMemo(() => {
    return calcSectionTotal(prevAnalogList, 'sum_of_rent') + calcSectionTotal(prevDigitalList, 'sum_of_rent');
  }, [prevAnalogList, prevDigitalList]);

  const prevGrandCount = useMemo(() => {
    return calcSectionTotal(prevAnalogList, 'count_of_id') + calcSectionTotal(prevDigitalList, 'count_of_id');
  }, [prevAnalogList, prevDigitalList]);

  const prevGrandFifty = useMemo(() => {
    return calcSectionTotal(prevAnalogList, 'sum_of_50') + calcSectionTotal(prevDigitalList, 'sum_of_50');
  }, [prevAnalogList, prevDigitalList]);

  // Differences vs Comparison Month
  const targetDiff = grandTarget - prevGrandTarget;
  const targetGrowthPercent = prevGrandTarget > 0 ? ((targetDiff / prevGrandTarget) * 100) : null;
  const rentDiff = grandRent - prevGrandRent;
  const rentGrowthPercent = prevGrandRent > 0 ? ((rentDiff / prevGrandRent) * 100) : null;
  const countDiff = grandCount - prevGrandCount;

  // Check if any custom filter is active
  const isFilterActive =
    viewMode !== 'type_collector' ||
    selectedCollector !== 'ALL' ||
    selectedType !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setViewMode('type_collector');
    setSelectedCollector('ALL');
    setSelectedType('ALL');
    setSearchQuery('');
  };

  // View Mode display labels
  const viewModeTitles = {
    type_collector: 'Type & Collector Wise (Default)',
    collector_wise: 'Collector Wise',
    collector_type: 'Collector & Type Wise',
    type_wise: 'Just Type Wise',
  };

  // Export current filtered view directly to Excel (.xlsx)
  const handleExportCurrentView = () => {
    try {
      const rows = [];
      const title = `Target Report - ${viewModeTitles[viewMode]} - ${selectedMonth}`;
      rows.push(['Chittagong Communications Ltd']);
      rows.push([title]);
      rows.push([]); // blank row

      if (isTargetOnly) {
        // TARGET ONLY EXPORT
        if (viewMode === 'type_collector') {
          rows.push(['Type', 'Collector', 'Target']);
          if (selectedType === 'ALL' || selectedType === 'Analog') {
            if (filteredAnalogList.length > 0) {
              rows.push(['Analog', '', '']);
              filteredAnalogList.forEach((item) => {
                rows.push(['', item.collector_name, item.sum_of_target]);
              });
              rows.push(['Analog Total', '', analogTotalTarget]);
            }
          }
          if (selectedType === 'ALL' || selectedType === 'Digital') {
            if (filteredDigitalList.length > 0) {
              rows.push(['Digital', '', '']);
              filteredDigitalList.forEach((item) => {
                rows.push(['', item.collector_name, item.sum_of_target]);
              });
              rows.push(['Digital Total', '', digitalTotalTarget]);
            }
          }
          rows.push(['Grand Total', '', grandTarget]);
        } else if (viewMode === 'collector_wise') {
          rows.push(['Collector', 'Target']);
          filteredCollectorWiseList.forEach((item) => {
            rows.push([item.collector_name, item.sum_of_target]);
          });
          rows.push(['Grand Total', grandTarget]);
        } else if (viewMode === 'collector_type') {
          rows.push(['Collector', 'Type', 'Target']);
          filteredCollectorTypeList.forEach((cItem) => {
            const hasAnalog = cItem.analog && (selectedType === 'ALL' || selectedType === 'Analog');
            const hasDigital = cItem.digital && (selectedType === 'ALL' || selectedType === 'Digital');
            if (hasAnalog) {
              rows.push([cItem.collector_name, 'Analog', cItem.analog.sum_of_target]);
            }
            if (hasDigital) {
              rows.push([hasAnalog ? '' : cItem.collector_name, 'Digital', cItem.digital.sum_of_target]);
            }
            if (hasAnalog && hasDigital) {
              rows.push([`${cItem.collector_name} Total`, 'Total', cItem.sum_of_target]);
            }
          });
          rows.push(['Grand Total', '', grandTarget]);
        } else if (viewMode === 'type_wise') {
          rows.push(['Type', 'Target']);
          if (selectedType === 'ALL' || selectedType === 'Analog') {
            rows.push(['Analog', analogTotalTarget]);
          }
          if (selectedType === 'ALL' || selectedType === 'Digital') {
            rows.push(['Digital', digitalTotalTarget]);
          }
          rows.push(['Grand Total', grandTarget]);
        }
      } else {
        // STANDARD COMPLETE 9-COLUMN EXPORT
        if (viewMode === 'type_collector') {
          rows.push(['Type', 'Collector', 'Customer', 'Rent', 'Due', 'Advnc', 'Actual Bill', '50%', 'Target']);
          if (filteredAnalogList.length > 0) {
            rows.push(['Analog', '', '', '', '', '', '', '', '']);
            filteredAnalogList.forEach((item) => {
              rows.push([
                '',
                item.collector_name,
                item.count_of_id,
                item.sum_of_rent,
                item.sum_of_due,
                item.sum_of_advnc,
                item.sum_of_actual_bill,
                item.sum_of_50,
                item.sum_of_target,
              ]);
            });
            rows.push([
              'Analog Total',
              '',
              analogTotalCount,
              analogTotalRent,
              analogTotalDue,
              analogTotalAdv,
              analogTotalActual,
              analogTotalFifty,
              analogTotalTarget,
            ]);
          }
          if (filteredDigitalList.length > 0) {
            rows.push(['Digital', '', '', '', '', '', '', '', '']);
            filteredDigitalList.forEach((item) => {
              rows.push([
                '',
                item.collector_name,
                item.count_of_id,
                item.sum_of_rent,
                item.sum_of_due,
                item.sum_of_advnc,
                item.sum_of_actual_bill,
                item.sum_of_50,
                item.sum_of_target,
              ]);
            });
            rows.push([
              'Digital Total',
              '',
              digitalTotalCount,
              digitalTotalRent,
              digitalTotalDue,
              digitalTotalAdv,
              digitalTotalActual,
              digitalTotalFifty,
              digitalTotalTarget,
            ]);
          }
        } else if (viewMode === 'collector_wise') {
          rows.push(['Collector', 'Customer', 'Rent', 'Due', 'Advnc', 'Actual Bill', '50%', 'Target']);
          filteredCollectorWiseList.forEach((item) => {
            rows.push([
              item.collector_name,
              item.count_of_id,
              item.sum_of_rent,
              item.sum_of_due,
              item.sum_of_advnc,
              item.sum_of_actual_bill,
              item.sum_of_50,
              item.sum_of_target,
            ]);
          });
        } else if (viewMode === 'collector_type') {
          rows.push(['Collector', 'Type', 'Customer', 'Rent', 'Due', 'Advnc', 'Actual Bill', '50%', 'Target']);
          filteredCollectorTypeList.forEach((cItem) => {
            const hasAnalog = cItem.analog && (selectedType === 'ALL' || selectedType === 'Analog');
            const hasDigital = cItem.digital && (selectedType === 'ALL' || selectedType === 'Digital');
            if (hasAnalog) {
              rows.push([
                cItem.collector_name,
                'Analog',
                cItem.analog.count_of_id,
                cItem.analog.sum_of_rent,
                cItem.analog.sum_of_due,
                cItem.analog.sum_of_advnc,
                cItem.analog.sum_of_actual_bill,
                cItem.analog.sum_of_50,
                cItem.analog.sum_of_target,
              ]);
            }
            if (hasDigital) {
              rows.push([
                hasAnalog ? '' : cItem.collector_name,
                'Digital',
                cItem.digital.count_of_id,
                cItem.digital.sum_of_rent,
                cItem.digital.sum_of_due,
                cItem.digital.sum_of_advnc,
                cItem.digital.sum_of_actual_bill,
                cItem.digital.sum_of_50,
                cItem.digital.sum_of_target,
              ]);
            }
            if (hasAnalog && hasDigital) {
              rows.push([
                `${cItem.collector_name} Total`,
                'Total',
                cItem.count_of_id,
                cItem.sum_of_rent,
                cItem.sum_of_due,
                cItem.sum_of_advnc,
                cItem.sum_of_actual_bill,
                cItem.sum_of_50,
                cItem.sum_of_target,
              ]);
            }
          });
        } else if (viewMode === 'type_wise') {
          rows.push(['Type', 'Customer', 'Rent', 'Due', 'Advnc', 'Actual Bill', '50%', 'Target']);
          if (selectedType === 'ALL' || selectedType === 'Analog') {
            rows.push([
              'Analog',
              analogTotalCount,
              analogTotalRent,
              analogTotalDue,
              analogTotalAdv,
              analogTotalActual,
              analogTotalFifty,
              analogTotalTarget,
            ]);
          }
          if (selectedType === 'ALL' || selectedType === 'Digital') {
            rows.push([
              'Digital',
              digitalTotalCount,
              digitalTotalRent,
              digitalTotalDue,
              digitalTotalAdv,
              digitalTotalActual,
              digitalTotalFifty,
              digitalTotalTarget,
            ]);
          }
        }

        // Append Grand Total Row
        if (viewMode === 'type_collector' || viewMode === 'collector_type') {
          rows.push([
            'Grand Total',
            '',
            grandCount,
            grandRent,
            grandDue,
            grandAdv,
            grandActual,
            grandFifty,
            grandTarget,
          ]);
        } else {
          rows.push([
            'Grand Total',
            grandCount,
            grandRent,
            grandDue,
            grandAdv,
            grandActual,
            grandFifty,
            grandTarget,
          ]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Target_View');
      const safeMonth = selectedMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Target_${viewMode}_${safeMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error('Failed to export view:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CSS Print Styles to ensure clean paper/PDF printing */}
      <style>{`
        @media print {
          aside, nav, header, footer, .no-print, .no-print * {
            display: none !important;
          }
          #printable-target-report,
          #printable-target-report * {
            visibility: visible !important;
          }
          #printable-target-report {
            display: block !important;
            position: static !important;
            width: 100% !important;
            color: #000000 !important;
            background: #ffffff !important;
            padding: 10px !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          #printable-target-report * {
            color: #000000 !important;
            background-color: transparent !important;
          }
          #printable-target-report .overflow-x-auto {
            overflow: visible !important;
            height: auto !important;
          }
          #printable-target-report table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #000000 !important;
          }
          #printable-target-report th, #printable-target-report td {
            display: table-cell !important;
            color: #000000 !important;
            border: 1px solid #666666 !important;
            padding: 4px 6px !important;
          }
          #printable-target-report th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          #printable-target-report tr.bg-slate-900,
          #printable-target-report tr.bg-slate-950,
          #printable-target-report tr.bg-slate-900\/90 {
            background-color: #f8fafc !important;
            color: #000000 !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      {/* Top Page Banner & Month Selector Bar */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Monthly Collector Target Report
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select target month and customize filter views (Collector wise, Collector & Type, or Type wise).
            </p>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2.5 bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl px-3.5 py-2 transition">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300">Target Month:</span>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="bg-slate-950 text-xs font-bold text-amber-300 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              {availableMonths.map((m, idx) => {
                const hasUploadedData = activeDataMonths.includes(m);
                return (
                  <option key={`month-${m}-${idx}`} value={m} className="bg-slate-950 text-white">
                    {m} {hasUploadedData ? '✓ (Uploaded Data)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={() => loadTargetReport(selectedMonth, true)}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl shadow transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            title="Force refresh data from server"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* CUSTOM FILTER OPTIONS & VIEW MODES BAR */}
      {/* ================================================================= */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 no-print">
        
        {/* 1. Main View Mode Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200">Target View Mode:</span>
            {viewMode === 'type_collector' && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Default
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('type_collector')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'type_collector'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Default: Grouped by Type (Analog & Digital) then Collector"
            >
              <span>Type & Collector</span>
              {viewMode === 'type_collector' && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            <button
              onClick={() => setViewMode('collector_wise')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'collector_wise'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Show each collector's combined total across Analog & Digital"
            >
              <span>Collector Wise</span>
              {viewMode === 'collector_wise' && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            <button
              onClick={() => setViewMode('collector_type')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'collector_type'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Grouped by Collector with their Analog and Digital breakdown"
            >
              <span>Collector & Type</span>
              {viewMode === 'collector_type' && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            <button
              onClick={() => setViewMode('type_wise')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'type_wise'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="High-level summary of Analog vs Digital totals"
            >
              <span>Just Type Wise</span>
              {viewMode === 'type_wise' && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>

          {/* Target Only Checkmark Toggle */}
          <label
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none border shrink-0 ${
              isTargetOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="Check this to hide Customer, Rent, Due, Advnc, Actual Bill, 50% and show ONLY Target across any view mode"
          >
            <input
              type="checkbox"
              checked={isTargetOnly}
              onChange={(e) => setIsTargetOnly(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700 cursor-pointer accent-amber-500"
            />
            <Target className={`w-3.5 h-3.5 ${isTargetOnly ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>Target Only</span>
          </label>
        </div>

        {/* 2. Secondary Custom Filters Bar (Collector, Type, Search & Reset) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Collector Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-1.5">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-semibold">Collector:</span>
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="bg-slate-950 text-xs font-bold text-white border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 transition cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">All Collectors ({uniqueCollectors.length})</option>
              {uniqueCollectors.map((cName) => {
                const count = collectorWiseMap[cName]?.count_of_id || 0;
                return (
                  <option key={`coll-${cName}`} value={cName}>
                    {cName} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Type Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-semibold">Customer Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-950 text-xs font-bold text-white border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="Analog">Analog Only</option>
              <option value="Digital">Digital Only</option>
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search collector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 border border-slate-800 hover:border-slate-700 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters */}
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer ml-auto"
              title="Reset all filters back to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

      </div>

      {/* KPI Quick Overview Cards */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Target</span>
              {prevHasData && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center space-x-0.5 ${
                  targetDiff > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : targetDiff < 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {targetDiff > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : targetDiff < 0 ? (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  ) : null}
                  <span>{targetDiff > 0 ? '+' : ''}{targetGrowthPercent !== null ? `${targetGrowthPercent.toFixed(1)}%` : '0%'}</span>
                </span>
              )}
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-amber-400 mt-1">৳ {fmtNum(grandTarget)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {prevHasData ? (
                targetDiff > 0 ? (
                  <span className="text-emerald-400 font-semibold">+৳{fmtNum(targetDiff)} vs {activeCompareMonth}</span>
                ) : targetDiff < 0 ? (
                  <span className="text-rose-400 font-semibold">-৳{fmtNum(Math.abs(targetDiff))} vs {activeCompareMonth}</span>
                ) : (
                  <span>৳0 vs {activeCompareMonth}</span>
                )
              ) : (
                'Actual Bill + 50% Dues'
              )}
            </p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customers</span>
            <p className="text-lg sm:text-xl font-extrabold text-white mt-1">{fmtNum(grandCount)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {prevHasData ? (
                countDiff >= 0 ? (
                  <span className="text-emerald-400 font-semibold">+{fmtNum(countDiff)} vs {activeCompareMonth}</span>
                ) : (
                  <span className="text-rose-400 font-semibold">{fmtNum(countDiff)} vs {activeCompareMonth}</span>
                )
              ) : (
                'Active subscribers'
              )}
            </p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Monthly Rent</span>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-1">৳ {fmtNum(grandRent)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {prevHasData ? (
                rentDiff >= 0 ? (
                  <span className="text-emerald-400 font-semibold">+৳{fmtNum(rentDiff)} vs {activeCompareMonth}</span>
                ) : (
                  <span className="text-rose-400 font-semibold">-৳{fmtNum(Math.abs(rentDiff))} vs {activeCompareMonth}</span>
                )
              ) : (
                'Current monthly bill'
              )}
            </p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">50% Dues Target</span>
            <p className="text-lg sm:text-xl font-extrabold text-indigo-400 mt-1">৳ {fmtNum(grandFifty)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">50% of outstanding dues</p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MONTHLY TARGET GROWTH HIGHLIGHT BANNER */}
      {/* ================================================================= */}
      {hasData && (
        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 no-print relative overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
            prevHasData && targetDiff > 0
              ? 'bg-emerald-500'
              : prevHasData && targetDiff < 0
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`} />

          {/* Header & Comparison Month Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl border ${
                prevHasData && targetDiff > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : prevHasData && targetDiff < 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {prevHasData && targetDiff > 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : prevHasData && targetDiff < 0 ? (
                  <TrendingDown className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-white flex flex-wrap items-center gap-1.5">
                  <span>মাসিক টার্গেট গ্রোথ অ্যানালাইসিস (Monthly Growth)</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700">
                    {selectedMonth} vs {activeCompareMonth || 'পূর্ববর্তী মাস'}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  পূর্ববর্তী মাসের তুলনায় চলতি মাসের টার্গেটের বৃদ্ধি বা হ্রাসের সম্পূর্ণ আর্থিক হিসাব
                </p>
              </div>
            </div>

            {/* Comparison Month Selector */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">তুলনা মাস:</span>
              <select
                value={activeCompareMonth}
                onChange={(e) => setCustomCompareMonth(e.target.value)}
                className="bg-slate-950 text-xs font-bold text-amber-300 border border-slate-700 rounded-lg px-2 py-0.5 focus:outline-none focus:border-amber-500 transition cursor-pointer"
              >
                {availableMonths.filter(m => m !== selectedMonth).map((m, idx) => {
                  const isPrevCal = m === getPreviousMonthString(selectedMonth);
                  const hasDataBadge = activeDataMonths.includes(m);
                  return (
                    <option key={`comp-m-${m}-${idx}`} value={m}>
                      {m} {isPrevCal ? '(Previous Month)' : ''} {hasDataBadge ? '✓' : ''}
                    </option>
                  );
                })}
              </select>
              {customCompareMonth && customCompareMonth !== getPreviousMonthString(selectedMonth) && (
                <button
                  onClick={() => setCustomCompareMonth('')}
                  className="text-[10px] text-slate-400 hover:text-amber-300 underline ml-1 cursor-pointer"
                  title="Reset to default previous month"
                >
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* Highlight Content */}
          {loadingPrevMonth ? (
            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              <span>তুলনামূলক মাসের ({activeCompareMonth}) ডাটা হিসেব করা হচ্ছে...</span>
            </div>
          ) : !prevHasData ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start sm:items-center space-x-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold">
                  পূর্ববর্তী মাস <span className="underline font-mono">{activeCompareMonth}</span>-এর কোনো আপলোড করা বিলিং ডাটা পাওয়া যায়নি।
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  সঠিক গ্রোথ হিসেব দেখতে {activeCompareMonth}-এর একটি এক্সেল ফাইল আপলোড করুন অথবা ড্রপডাউন থেকে ডাটা থাকা অন্য মাস বেছে নিন।
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Highlight Hero Card */}
              <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                targetDiff > 0
                  ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                  : targetDiff < 0
                  ? 'bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 shadow-lg shadow-rose-500/5'
                  : 'bg-gradient-to-r from-slate-800/40 via-slate-800/20 to-transparent border-slate-700/50'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border flex items-center space-x-1.5 shadow ${
                      targetDiff > 0
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30'
                        : targetDiff < 0
                        ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/30'
                        : 'bg-slate-700 text-slate-200 border-slate-600'
                    }`}>
                      {targetDiff > 0 ? (
                        <>
                          <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                          <span>গ্রোথ হয়েছে (Target Increased)</span>
                        </>
                      ) : targetDiff < 0 ? (
                        <>
                          <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                          <span>গ্রোথ হয়নি / কমেছে (Target Decreased)</span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-4 h-4 stroke-[3]" />
                          <span>কোনো পরিবর্তন হয়নি (No Change)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium pt-0.5">
                    {targetDiff > 0 ? (
                      <>
                        পূর্ববর্তী মাস <span className="font-bold text-white">({activeCompareMonth})</span>-এর তুলনায় চলতি মাস <span className="font-bold text-white">({selectedMonth})</span>-এ টার্গেট বৃদ্ধি পেয়েছে মোট:
                      </>
                    ) : targetDiff < 0 ? (
                      <>
                        পূর্ববর্তী মাস <span className="font-bold text-white">({activeCompareMonth})</span>-এর তুলনায় চলতি মাস <span className="font-bold text-white">({selectedMonth})</span>-এ টার্গেট হ্রাস পেয়েছে মোট:
                      </>
                    ) : (
                      <>
                        পূর্ববর্তী মাস <span className="font-bold text-white">({activeCompareMonth})</span> এবং চলতি মাস <span className="font-bold text-white">({selectedMonth})</span>-এর টার্গেট সম্পূর্ণ সমান।
                      </>
                    )}
                  </p>
                </div>

                {/* Large Highlighted Amount */}
                <div className="text-left sm:text-right shrink-0">
                  <div className="flex items-baseline sm:justify-end space-x-2">
                    <span className={`text-2xl sm:text-4xl font-black font-mono tracking-tight ${
                      targetDiff > 0
                        ? 'text-emerald-400 drop-shadow-[0_2px_12px_rgba(52,211,153,0.35)]'
                        : targetDiff < 0
                        ? 'text-rose-400 drop-shadow-[0_2px_12px_rgba(251,113,133,0.35)]'
                        : 'text-slate-300'
                    }`}>
                      {targetDiff > 0 ? '+' : targetDiff < 0 ? '-' : ''}৳ {fmtNum(Math.abs(targetDiff))}
                    </span>
                    {targetGrowthPercent !== null && (
                      <span className={`text-xs sm:text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                        targetDiff > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : targetDiff < 0
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {targetDiff > 0 ? '+' : ''}{targetGrowthPercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Current: ৳{fmtNum(grandTarget)} • Previous: ৳{fmtNum(prevGrandTarget)}
                  </p>
                </div>
              </div>

              {/* 3-Column Detailed Comparative Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Rent Growth */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">মাসিক রেন্ট পরিবর্তন</span>
                    <p className="text-slate-300 font-semibold mt-0.5">
                      Current: ৳{fmtNum(grandRent)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm ${
                      rentDiff > 0 ? 'text-emerald-400' : rentDiff < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {rentDiff > 0 ? '+' : rentDiff < 0 ? '-' : ''}৳{fmtNum(Math.abs(rentDiff))}
                    </span>
                    {rentGrowthPercent !== null && (
                      <p className="text-[10px] text-slate-500 font-medium">
                        {rentDiff > 0 ? '+' : ''}{rentGrowthPercent.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Subscriber Growth */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">কাস্টমার সংখ্যা পরিবর্তন</span>
                    <p className="text-slate-300 font-semibold mt-0.5">
                      Current: {fmtNum(grandCount)} জন
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm ${
                      countDiff > 0 ? 'text-emerald-400' : countDiff < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {countDiff > 0 ? '+' : ''}{fmtNum(countDiff)} জন
                    </span>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Prev: {fmtNum(prevGrandCount)} জন
                    </p>
                  </div>
                </div>

                {/* 50% Dues Target Comparison */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">৫০% বকেয়া টার্গেট পরিবর্তন</span>
                    <p className="text-slate-300 font-semibold mt-0.5">
                      Current: ৳{fmtNum(grandFifty)}
                    </p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const fiftyDiff = grandFifty - prevGrandFifty;
                      return (
                        <>
                          <span className={`font-mono font-bold text-sm ${
                            fiftyDiff > 0 ? 'text-amber-400' : fiftyDiff < 0 ? 'text-indigo-400' : 'text-slate-400'
                          }`}>
                            {fiftyDiff > 0 ? '+' : fiftyDiff < 0 ? '-' : ''}৳{fmtNum(Math.abs(fiftyDiff))}
                          </span>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Prev: ৳{fmtNum(prevGrandFifty)}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between space-x-3 animate-fade-in no-print ${
          hasData 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center space-x-3">
            {hasData ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-bold">{statusMessage}</p>
              {!hasData && (
                <p className="text-slate-400 text-[11px] mt-0.5">
                  To view target collections for <span className="text-amber-300 font-bold">{selectedMonth}</span>, please upload an Excel file for this month on the Dashboard.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 no-print">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && !reportResult && (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 space-y-3 no-print">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-sm font-bold text-white">Loading Target Report for {selectedMonth}...</p>
          <p className="text-xs text-slate-400">Fetching Collector totals, Actual Bills, and 50% dues targets</p>
        </div>
      )}

      {/* Target Report Presentation Box */}
      {reportResult && reportResult.stats && (
        <div id="printable-target-report" className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          
          {/* Action Bar (Print, Download Full Excel, Export Current View) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 no-print">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${hasData ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs font-bold text-slate-300">
                View: <span className="text-amber-400 font-extrabold">{viewModeTitles[viewMode]}</span>
                {selectedCollector !== 'ALL' && (
                  <span className="ml-1 text-slate-400">| Collector: <span className="text-white font-bold">{selectedCollector}</span></span>
                )}
                {selectedType !== 'ALL' && (
                  <span className="ml-1 text-slate-400">| Type: <span className="text-white font-bold">{selectedType}</span></span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Print Button */}
              <button
                onClick={() => window.print()}
                disabled={!hasData}
                className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl shadow transition flex items-center space-x-2 cursor-pointer"
                title="Print the active view report"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Report</span>
              </button>

              {/* Export Active View to Excel */}
              <button
                onClick={handleExportCurrentView}
                disabled={!hasData}
                className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl shadow transition flex items-center space-x-2 cursor-pointer"
                title="Export this filtered view table to an Excel spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export View (.xlsx)</span>
              </button>

              {/* Download Original Full Excel Workbook */}
              {reportResult.download_url ? (
                <a
                  href={reportResult.download_url}
                  download
                  className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-2"
                  title="Download complete standard monthly Excel report workbook"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Report</span>
                </a>
              ) : (
                <button
                  disabled
                  className="py-2.5 px-4 bg-slate-800 opacity-40 text-slate-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Report</span>
                </button>
              )}
            </div>
          </div>

          {/* Company Title & Selected Month Banner */}
          <div className="text-center space-y-1 py-2 border-b border-slate-800/60">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
              Chittagong Communications Ltd
            </h1>
            <p className="text-sm font-bold text-amber-400 tracking-wide">
              {reportResult.stats.month_label || `Target for the month of ${selectedMonth}`}
            </p>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Mode: <span className="text-slate-200 font-bold">{viewModeTitles[viewMode]}</span>
              {selectedCollector !== 'ALL' && ` • Collector: ${selectedCollector}`}
              {selectedType !== 'ALL' && ` • Type: ${selectedType}`}
            </p>
            {prevHasData && (
              <p className="text-[11px] font-bold font-mono tracking-wide mt-1">
                {targetDiff > 0 ? (
                  <span className="text-emerald-400">
                    [ Growth vs {activeCompareMonth}: +৳{fmtNum(targetDiff)} (+{targetGrowthPercent?.toFixed(2)}%) ]
                  </span>
                ) : targetDiff < 0 ? (
                  <span className="text-rose-400">
                    [ Reduction vs {activeCompareMonth}: -৳{fmtNum(Math.abs(targetDiff))} ({targetGrowthPercent?.toFixed(2)}%) ]
                  </span>
                ) : (
                  <span className="text-slate-400">
                    [ Target unchanged vs {activeCompareMonth} ]
                  </span>
                )}
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* VIEW MODE 1: TYPE & COLLECTOR WISE (DEFAULT VIEW) */}
          {/* ========================================================= */}
          {viewMode === 'type_collector' && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                    <th className="py-2.5 px-3 border-r border-slate-800">Type</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">Collector</th>
                    {!isTargetOnly && (
                      <>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Customer</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Rent</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Due</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Advnc</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Actual Bill</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">50%</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-200">
                  
                  {/* --- ANALOG GROUP --- */}
                  {(selectedType === 'ALL' || selectedType === 'Analog') && (
                    <>
                      {filteredAnalogList.length === 0 ? (
                        <tr>
                          <td className="py-3 px-3 border-r border-slate-800 text-center align-middle font-black text-indigo-300 bg-slate-900/40 text-xs sm:text-sm tracking-wide">
                            Analog
                          </td>
                          <td colSpan={isTargetOnly ? 2 : 8} className="py-3 px-3 text-slate-400 italic text-center">
                            No Analog records match the selected filter
                          </td>
                        </tr>
                      ) : (
                        filteredAnalogList.map((item, idx) => (
                          <tr key={`analog-${idx}`} className="hover:bg-slate-800/40 transition">
                            {idx === 0 && (
                              <td
                                rowSpan={filteredAnalogList.length}
                                className="py-2 px-3 border-r border-slate-800 text-center align-middle font-black text-indigo-300 bg-slate-900/40 text-xs sm:text-sm tracking-wider uppercase select-none"
                              >
                                Analog
                              </td>
                            )}
                            <td className="py-1.5 px-3 border-r border-slate-800 font-semibold text-white">{item.collector_name}</td>
                            {!isTargetOnly && (
                              <>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.count_of_id)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_rent)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_due)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_advnc)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_actual_bill)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_50)}</td>
                              </>
                            )}
                            <td className="py-1.5 px-3 text-right font-bold text-amber-300">{fmtNum(item.sum_of_target)}</td>
                          </tr>
                        ))
                      )}

                      {/* Analog Total Row */}
                      <tr className="bg-slate-900 font-bold border-y border-slate-700 text-white">
                        <td colSpan={2} className="py-2 px-3 border-r border-slate-800 font-bold text-indigo-200">Analog Total</td>
                        {!isTargetOnly && (
                          <>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalCount)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalRent)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalDue)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalAdv)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalActual)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalFifty)}</td>
                          </>
                        )}
                        <td className="py-2 px-3 text-right text-amber-400 font-extrabold">{fmtNum(analogTotalTarget)}</td>
                      </tr>
                    </>
                  )}

                  {/* --- DIGITAL GROUP --- */}
                  {(selectedType === 'ALL' || selectedType === 'Digital') && (
                    <>
                      {filteredDigitalList.length === 0 ? (
                        <tr>
                          <td className="py-3 px-3 border-r border-slate-800 text-center align-middle font-black text-emerald-400 bg-slate-900/40 text-xs sm:text-sm tracking-wide">
                            Digital
                          </td>
                          <td colSpan={isTargetOnly ? 2 : 8} className="py-3 px-3 text-slate-400 italic text-center">
                            No Digital records match the selected filter
                          </td>
                        </tr>
                      ) : (
                        filteredDigitalList.map((item, idx) => (
                          <tr key={`digital-${idx}`} className="hover:bg-slate-800/40 transition">
                            {idx === 0 && (
                              <td
                                rowSpan={filteredDigitalList.length}
                                className="py-2 px-3 border-r border-slate-800 text-center align-middle font-black text-emerald-400 bg-slate-900/40 text-xs sm:text-sm tracking-wider uppercase select-none"
                              >
                                Digital
                              </td>
                            )}
                            <td className="py-1.5 px-3 border-r border-slate-800 font-semibold text-white">{item.collector_name}</td>
                            {!isTargetOnly && (
                              <>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.count_of_id)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_rent)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_due)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_advnc)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_actual_bill)}</td>
                                <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_50)}</td>
                              </>
                            )}
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-300">{fmtNum(item.sum_of_target)}</td>
                          </tr>
                        ))
                      )}

                      {/* Digital Total Row */}
                      <tr className="bg-slate-900 font-bold border-y border-slate-700 text-white">
                        <td colSpan={2} className="py-2 px-3 border-r border-slate-800 font-bold text-emerald-300">Digital Total</td>
                        {!isTargetOnly && (
                          <>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalCount)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalRent)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalDue)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalAdv)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalActual)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalFifty)}</td>
                          </>
                        )}
                        <td className="py-2 px-3 text-right text-emerald-400 font-extrabold">{fmtNum(digitalTotalTarget)}</td>
                      </tr>
                    </>
                  )}

                  {/* --- GRAND TOTAL ROW --- */}
                  <tr className="bg-slate-950 font-extrabold border-t-2 border-b-4 border-slate-600 text-white text-xs">
                    <td colSpan={2} className="py-3 px-3 border-r border-slate-800 font-bold text-slate-100">Grand Total</td>
                    {!isTargetOnly && (
                      <>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandCount)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandRent)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandDue)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandAdv)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandActual)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandFifty)}</td>
                      </>
                    )}
                    <td className="py-3 px-3 text-right text-amber-400 text-sm font-black">{fmtNum(grandTarget)}</td>
                  </tr>

                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW MODE 2: COLLECTOR WISE (FLAT BY COLLECTOR) */}
          {/* ========================================================= */}
          {viewMode === 'collector_wise' && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                    <th className="py-2.5 px-3 border-r border-slate-800">Collector</th>
                    {!isTargetOnly && (
                      <>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Customer</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Rent</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Due</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Advnc</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Actual Bill</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">50%</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-200">
                  {filteredCollectorWiseList.length === 0 ? (
                    <tr>
                      <td colSpan={isTargetOnly ? 2 : 8} className="py-4 px-3 text-slate-400 italic text-center">
                        No Collector records match the selected filter
                      </td>
                    </tr>
                  ) : (
                    filteredCollectorWiseList.map((item, idx) => (
                      <tr key={`coll-row-${idx}`} className="hover:bg-slate-800/40 transition">
                        <td className="py-2 px-3 border-r border-slate-800 font-bold text-white flex items-center space-x-2">
                          <span>{item.collector_name}</span>
                          {item.analog && item.digital && selectedType === 'ALL' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-sans">
                              Analog + Digital
                            </span>
                          )}
                        </td>
                        {!isTargetOnly && (
                          <>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(item.count_of_id)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_rent)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_due)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_advnc)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_actual_bill)}</td>
                            <td className="py-2 px-3 border-r border-slate-800 text-right">{fmtNum(item.sum_of_50)}</td>
                          </>
                        )}
                        <td className="py-2 px-3 text-right font-extrabold text-amber-300">{fmtNum(item.sum_of_target)}</td>
                      </tr>
                    ))
                  )}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-950 font-extrabold border-t-2 border-b-4 border-slate-600 text-white text-xs">
                    <td className="py-3 px-3 border-r border-slate-800">Grand Total</td>
                    {!isTargetOnly && (
                      <>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandCount)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandRent)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandDue)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandAdv)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandActual)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandFifty)}</td>
                      </>
                    )}
                    <td className="py-3 px-3 text-right text-amber-400 text-sm font-black">{fmtNum(grandTarget)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW MODE 3: COLLECTOR & TYPE WISE (GROUPED BY COLLECTOR) */}
          {/* ========================================================= */}
          {viewMode === 'collector_type' && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                    <th className="py-2.5 px-3 border-r border-slate-800">Collector</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">Type</th>
                    {!isTargetOnly && (
                      <>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Customer</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Rent</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Due</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Advnc</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Actual Bill</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">50%</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-200">
                  {filteredCollectorTypeList.length === 0 ? (
                    <tr>
                      <td colSpan={isTargetOnly ? 3 : 9} className="py-4 px-3 text-slate-400 italic text-center">
                        No Collector records match the selected filter
                      </td>
                    </tr>
                  ) : (
                    filteredCollectorTypeList.map((cItem, cIdx) => {
                      const hasAnalog = cItem.analog && (selectedType === 'ALL' || selectedType === 'Analog');
                      const hasDigital = cItem.digital && (selectedType === 'ALL' || selectedType === 'Digital');
                      const showBoth = hasAnalog && hasDigital;

                      if (!hasAnalog && !hasDigital) return null;

                      return (
                        <React.Fragment key={`collector-group-${cIdx}`}>
                          {/* Collector Group Header */}
                          <tr className="bg-slate-900/80 font-bold text-amber-300">
                            <td colSpan={isTargetOnly ? 3 : 9} className="py-1.5 px-3 border-b border-slate-800">
                              👤 {cItem.collector_name}
                            </td>
                          </tr>

                          {/* Analog Row */}
                          {hasAnalog && (
                            <tr className="hover:bg-slate-800/30 transition text-slate-300">
                              <td className="py-1 px-3 border-r border-slate-800 pl-6 text-slate-400">└</td>
                              <td className="py-1 px-3 border-r border-slate-800 font-semibold text-indigo-300">Analog</td>
                              {!isTargetOnly && (
                                <>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.analog.count_of_id)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.analog.sum_of_rent)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.analog.sum_of_due)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.analog.sum_of_advnc)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.analog.sum_of_actual_bill)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.analog.sum_of_50)}</td>
                                </>
                              )}
                              <td className="py-1 px-3 text-right font-bold text-amber-300/90">{fmtNum(cItem.analog.sum_of_target)}</td>
                            </tr>
                          )}

                          {/* Digital Row */}
                          {hasDigital && (
                            <tr className="hover:bg-slate-800/30 transition text-slate-300">
                              <td className="py-1 px-3 border-r border-slate-800 pl-6 text-slate-400">└</td>
                              <td className="py-1 px-3 border-r border-slate-800 font-semibold text-emerald-300">Digital</td>
                              {!isTargetOnly && (
                                <>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.digital.count_of_id)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.digital.sum_of_rent)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.digital.sum_of_due)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.digital.sum_of_advnc)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.digital.sum_of_actual_bill)}</td>
                                  <td className="py-1 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.digital.sum_of_50)}</td>
                                </>
                              )}
                              <td className="py-1 px-3 text-right font-bold text-emerald-300/90">{fmtNum(cItem.digital.sum_of_target)}</td>
                            </tr>
                          )}

                          {/* Subtotal Row if collector has both */}
                          {showBoth && (
                            <tr className="bg-slate-900/50 font-bold border-b border-slate-700 text-white text-[11px]">
                              <td className="py-1.5 px-3 border-r border-slate-800 text-right text-slate-400 font-sans" colSpan={2}>
                                {cItem.collector_name} Total
                              </td>
                              {!isTargetOnly && (
                                <>
                                  <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.count_of_id)}</td>
                                  <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.sum_of_rent)}</td>
                                  <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.sum_of_due)}</td>
                                  <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.sum_of_advnc)}</td>
                                  <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.sum_of_actual_bill)}</td>
                                  <td className="py-1.5 px-3 border-r border-slate-800 text-right">{fmtNum(cItem.sum_of_50)}</td>
                                </>
                              )}
                              <td className="py-1.5 px-3 text-right font-extrabold text-amber-400">{fmtNum(cItem.sum_of_target)}</td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-950 font-extrabold border-t-2 border-b-4 border-slate-600 text-white text-xs">
                    <td className="py-3 px-3 border-r border-slate-800" colSpan={2}>Grand Total</td>
                    {!isTargetOnly && (
                      <>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandCount)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandRent)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandDue)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandAdv)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandActual)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandFifty)}</td>
                      </>
                    )}
                    <td className="py-3 px-3 text-right text-amber-400 text-sm font-black">{fmtNum(grandTarget)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW MODE 4: JUST TYPE WISE (SUMMARY BY TYPE) */}
          {/* ========================================================= */}
          {viewMode === 'type_wise' && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                    <th className="py-2.5 px-3 border-r border-slate-800">Customer Type</th>
                    {!isTargetOnly && (
                      <>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Customer</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Rent</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Due</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Advnc</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">Actual Bill</th>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-right">50%</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-200">
                  {/* Analog Summary Row */}
                  {(selectedType === 'ALL' || selectedType === 'Analog') && (
                    <tr className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 border-r border-slate-800 font-extrabold text-indigo-300 text-sm">
                        Analog
                      </td>
                      {!isTargetOnly && (
                        <>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalCount)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalRent)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalDue)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalAdv)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalActual)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(analogTotalFifty)}</td>
                        </>
                      )}
                      <td className="py-3 px-3 text-right font-extrabold text-amber-300 text-sm">{fmtNum(analogTotalTarget)}</td>
                    </tr>
                  )}

                  {/* Digital Summary Row */}
                  {(selectedType === 'ALL' || selectedType === 'Digital') && (
                    <tr className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 border-r border-slate-800 font-extrabold text-emerald-400 text-sm">
                        Digital
                      </td>
                      {!isTargetOnly && (
                        <>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalCount)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalRent)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalDue)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalAdv)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalActual)}</td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(digitalTotalFifty)}</td>
                        </>
                      )}
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-300 text-sm">{fmtNum(digitalTotalTarget)}</td>
                    </tr>
                  )}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-950 font-extrabold border-t-2 border-b-4 border-slate-600 text-white text-xs">
                    <td className="py-3 px-3 border-r border-slate-800">Grand Total</td>
                    {!isTargetOnly && (
                      <>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandCount)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandRent)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandDue)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandAdv)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandActual)}</td>
                        <td className="py-3 px-3 border-r border-slate-800 text-right">{fmtNum(grandFifty)}</td>
                      </>
                    )}
                    <td className="py-3 px-3 text-right text-amber-400 text-sm font-black">{fmtNum(grandTarget)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Signature Block */}
          <div className="pt-8 text-center space-y-1 text-xs text-slate-400">
            <p className="tracking-widest font-mono">_________________________</p>
            <p className="font-semibold text-slate-300">Prepared By</p>
          </div>

        </div>
      )}

    </div>
  );
}
