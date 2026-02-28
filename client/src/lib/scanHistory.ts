import type { AIAnalysis } from '@/types';

export interface ScanHistoryItem {
  id: string;
  timestamp: number;
  image: string; // base64 data URL
  analysis: AIAnalysis;
}

const STORAGE_KEY = 'bagichalink_scan_history';
const MAX_ITEMS = 50;

export const saveScanToHistory = (image: string, analysis: AIAnalysis) => {
  try {
    const history = getScanHistory();
    const newItem: ScanHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      image,
      analysis,
    };
    
    // Keep only latest 50 scans
    const updated = [newItem, ...history].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving scan to history:', e);
  }
};

export const getScanHistory = (): ScanHistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading scan history:', e);
    return [];
  }
};

export const deleteScanFromHistory = (id: string) => {
  try {
    const history = getScanHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting scan:', e);
  }
};

export const clearScanHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing history:', e);
  }
};
