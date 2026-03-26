import { useState } from 'react';
import { Fingerprint, RefreshCw, Copy, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleGenerate = async () => {
    if (count < 1 || count > 50) {
      toast.error('Count must be between 1 and 50');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/uuid/generate?count=${count}`);
      if (!res.ok) throw new Error('Failed to fetch UUIDs');
      const data = await res.json();
      setUuids(data.uuids);
      toast.success(`Generated ${data.uuids.length} UUID${data.uuids.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(uuids.join('\n'));
      toast.success('All UUIDs copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const copySingle = async (uuid, index) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopiedIndex(index);
      toast.success('Copied!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">UUID Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate UUIDs (v4) from{' '}
          <a
            href="https://www.uuidgenerator.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            uuidgenerator.net
          </a>
        </p>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-4">
        <div className="max-w-xs">
          <label className="text-xs font-medium text-gray-400 block mb-1">Number of UUIDs</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            min={1}
            max={50}
            className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
            Generate
          </button>
          {uuids.length > 0 && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 border border-dark-500 hover:border-gray-400 disabled:opacity-50 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {uuids.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Generated UUIDs ({uuids.length})</h3>
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
            >
              <Copy size={14} />
              Copy All
            </button>
          </div>
          <div className="space-y-1">
            {uuids.map((uuid, i) => (
              <button
                key={i}
                onClick={() => copySingle(uuid, i)}
                className="w-full flex items-center justify-between px-3 py-2 bg-dark-900 hover:bg-dark-700 rounded-lg text-sm font-mono text-gray-200 transition-colors group"
              >
                <span>{uuid}</span>
                {copiedIndex === i ? (
                  <Check size={14} className="text-accent-green" />
                ) : (
                  <Copy size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
