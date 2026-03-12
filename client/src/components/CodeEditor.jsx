export default function CodeEditor({ value, onChange, placeholder, label, height = 'h-96' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={`${height} w-full bg-dark-900 border border-dark-600 rounded-lg p-4 font-mono text-sm text-gray-200 resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600`}
      />
    </div>
  );
}
