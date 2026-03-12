import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
    >
      {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}
