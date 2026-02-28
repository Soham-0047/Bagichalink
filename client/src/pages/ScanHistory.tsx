import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getScanHistory, deleteScanFromHistory, clearScanHistory } from '@/lib/scanHistory';
import HealthBadge from '@/components/HealthBadge';
import type { ScanHistoryItem } from '@/lib/scanHistory';

const ScanHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const items = getScanHistory();
    setHistory(items);
    setLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    deleteScanFromHistory(id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all scan history? This cannot be undone.')) {
      clearScanHistory();
      setHistory([]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 pt-4 px-4 relative z-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center gap-2 text-sm font-body hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scan
        </button>
        <h1 className="font-display text-2xl">Scan History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="ml-auto text-xs font-tag text-danger hover:text-danger/80"
          >
            Clear All
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center py-16 space-y-3">
          <div className="text-5xl">📸</div>
          <p className="text-sm text-muted-foreground font-body">No scans yet</p>
          <p className="text-xs text-muted-foreground font-tag">Scan a plant to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item) => {
            const analysis = item.analysis;
            return (
              <div
                key={item.id}
                className="rounded-card bg-background card-shadow overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-square relative overflow-hidden bg-card">
                  <img
                    src={item.image}
                    alt={analysis.commonName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 p-1.5 bg-background/90 rounded-lg hover:bg-danger hover:text-danger-foreground transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <h3 className="font-display text-sm">
                      {analysis.emoji} {analysis.commonName || 'Unknown'}
                    </h3>
                    <p className="text-xs text-muted-foreground font-tag">
                      {analysis.species}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <HealthBadge status={analysis.healthStatus || 'unknown'} size="sm" />
                    <span className="text-xs text-muted-foreground font-tag">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                    {analysis.diagnosis}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScanHistory;
