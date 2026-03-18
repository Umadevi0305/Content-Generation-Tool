import { useState } from 'react';
import { Hash, RefreshCw, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppState } from '../context/AppStateContext';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRandomPart(length) {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => CHARS[v % CHARS.length]).join('');
}

function generateIds(count, prefix, randomLength) {
  const ids = new Set();
  while (ids.size < count) {
    ids.add(prefix + generateRandomPart(randomLength));
  }
  return [...ids];
}

export default function SessionDisplayIdGenerator() {
  const { sessionIdState, setSessionIdState } = useAppState();
  const { count, prefix, randomLength, ids } = sessionIdState;

  const update = (patch) => setSessionIdState((s) => ({ ...s, ...patch }));

  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleGenerate = () => {
    if (count < 1 || count > 50) {
      toast.error('Number of IDs must be between 1 and 50');
      return;
    }
    if (!prefix) {
      toast.error('Prefix is required');
      return;
    }
    if (randomLength < 1) {
      toast.error('Random length must be at least 1');
      return;
    }
    update({ ids: generateIds(count, prefix, randomLength) });
    toast.success(`Generated ${count} ID${count > 1 ? 's' : ''}`);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(ids.join('\n'));
      toast.success('All IDs copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const copySingle = async (id, index) => {
    try {
      await navigator.clipboard.writeText(id);
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
        <h2 className="text-xl font-bold text-white">Session Display ID Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate unique session display IDs with a custom prefix</p>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Number of IDs</label>
            <input
              type="number"
              value={count}
              onChange={(e) => update({ count: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
              min={1}
              max={50}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Prefix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => update({ prefix: e.target.value.toUpperCase() })}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:border-accent-blue transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Random Characters Length</label>
            <input
              type="number"
              value={randomLength}
              onChange={(e) => update({ randomLength: Math.max(1, Number(e.target.value) || 1) })}
              min={1}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Hash size={16} />
            Generate
          </button>
          {ids.length > 0 && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 border border-dark-500 hover:border-gray-400 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {ids.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Generated IDs ({ids.length})</h3>
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
            >
              <Copy size={14} />
              Copy All
            </button>
          </div>
          <div className="space-y-1">
            {ids.map((id, i) => (
              <button
                key={i}
                onClick={() => copySingle(id, i)}
                className="w-full flex items-center justify-between px-3 py-2 bg-dark-900 hover:bg-dark-700 rounded-lg text-sm font-mono text-gray-200 transition-colors group"
              >
                <span>{id}</span>
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
