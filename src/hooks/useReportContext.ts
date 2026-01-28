import { useState, useEffect, useCallback } from 'react';

interface ReportContext {
  areaId: string | null;
  lineId: string | null;
  machineId: string | null;
  timestamp: number;
}

const CONTEXT_KEY = 'smt_report_context';
const CONTEXT_EXPIRY = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const HISTORY_KEY = 'smt_report_history';
const MAX_HISTORY = 10;

interface ReportHistoryItem {
  areaId: string;
  areaName: string;
  lineId: string;
  lineName: string;
  machineId: string;
  machineName: string;
  timestamp: number;
}

export function useReportContext() {
  const [savedContext, setSavedContext] = useState<ReportContext | null>(null);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);

  // Load saved context on mount
  useEffect(() => {
    const stored = localStorage.getItem(CONTEXT_KEY);
    if (stored) {
      try {
        const parsed: ReportContext = JSON.parse(stored);
        const now = Date.now();
        
        // Check if context is still valid (< 4 hours old)
        if (now - parsed.timestamp < CONTEXT_EXPIRY) {
          setSavedContext(parsed);
        } else {
          localStorage.removeItem(CONTEXT_KEY);
        }
      } catch (e) {
        localStorage.removeItem(CONTEXT_KEY);
      }
    }

    // Load history
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        localStorage.removeItem(HISTORY_KEY);
      }
    }
  }, []);

  // Save context when reporting
  const saveContext = useCallback((areaId: string, lineId: string, machineId: string) => {
    const context: ReportContext = {
      areaId,
      lineId,
      machineId,
      timestamp: Date.now(),
    };
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
    setSavedContext(context);
  }, []);

  // Save to history with names for display
  const saveToHistory = useCallback((item: Omit<ReportHistoryItem, 'timestamp'>) => {
    const newItem: ReportHistoryItem = {
      ...item,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Remove duplicates of same machine
      const filtered = prev.filter(h => h.machineId !== item.machineId);
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Get most common context from last 3 reports
  const getMostCommonContext = useCallback(() => {
    if (history.length === 0) return null;

    const recentThree = history.slice(0, 3);
    
    // Count occurrences of each machine
    const machineCounts = recentThree.reduce((acc, item) => {
      acc[item.machineId] = (acc[item.machineId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find the most common
    let maxCount = 0;
    let mostCommon: ReportHistoryItem | null = null;
    
    for (const item of recentThree) {
      if (machineCounts[item.machineId] > maxCount) {
        maxCount = machineCounts[item.machineId];
        mostCommon = item;
      }
    }

    return mostCommon;
  }, [history]);

  // Clear context
  const clearContext = useCallback(() => {
    localStorage.removeItem(CONTEXT_KEY);
    setSavedContext(null);
  }, []);

  return {
    savedContext,
    history,
    saveContext,
    saveToHistory,
    getMostCommonContext,
    clearContext,
  };
}
