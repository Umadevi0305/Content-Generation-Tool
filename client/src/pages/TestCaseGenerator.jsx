import { useState } from 'react';
import { Loader2, Sparkles, Trash2, Copy, Check, Download, Pencil, X, Save, Import } from 'lucide-react';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import CopyButton from '../components/CopyButton';
import { generateTestCases } from '../utils/api';
import { useAppState } from '../context/AppStateContext';

export default function TestCaseGenerator() {
  const { testCaseState, setTestCaseState, questionState } = useAppState();
  const { solutionCode, prefilledCode, questionMarkdown, numberOfTestCases, customRules, testCases, activeTab } = testCaseState;
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const update = (patch) => setTestCaseState((s) => ({ ...s, ...patch }));
  const setSolutionCode = (v) => update({ solutionCode: v });
  const setPrefilledCode = (v) => update({ prefilledCode: v });
  const setQuestionMarkdown = (v) => update({ questionMarkdown: v });
  const setNumberOfTestCases = (v) => update({ numberOfTestCases: v });
  const setCustomRules = (v) => update({ customRules: v });
  const setTestCases = (v) => update({ testCases: v });
  const setActiveTab = (v) => update({ activeTab: v });

  const handleImportFromQuestionGenerator = () => {
    const imported = [];
    if (questionState.solutionCode?.trim()) {
      setSolutionCode(questionState.solutionCode);
      imported.push('Solution Code');
    }
    if (questionState.prefilledCode?.trim()) {
      setPrefilledCode(questionState.prefilledCode);
      imported.push('Prefilled Code');
    }
    if (questionState.markdown?.trim()) {
      setQuestionMarkdown(questionState.markdown);
      imported.push('Question Markdown');
    }
    if (imported.length > 0) {
      toast.success(`Imported: ${imported.join(', ')}`);
    } else {
      toast.error('Nothing to import — Question Generator fields are empty');
    }
  };

  const handleGenerate = async () => {
    if (!solutionCode.trim()) {
      toast.error('Solution code is required');
      return;
    }
    setLoading(true);
    try {
      const data = await generateTestCases({
        solutionCode,
        prefilledCode,
        questionMarkdown,
        numberOfTestCases,
        customRules,
      });
      setTestCases(data.testCases);
      toast.success('Test cases generated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    if (!testCases) return;
    const updated = {
      ...testCases,
      test_cases: testCases.test_cases.filter((tc) => tc.id !== id),
    };
    setTestCases(updated);
    toast.success('Test case deleted');
  };

  const startEdit = (tc) => {
    setEditingId(tc.id);
    setEditForm({ ...tc, must_contain: JSON.stringify(tc.must_contain || tc.must_call || [], null, 2) });
  };

  const saveEdit = () => {
    let parsedContain;
    try {
      parsedContain = JSON.parse(editForm.must_contain);
    } catch {
      toast.error('Invalid JSON in must_contain');
      return;
    }

    const updated = {
      ...testCases,
      test_cases: testCases.test_cases.map((tc) => {
        if (tc.id !== editingId) return tc;
        const { must_contain, ...rest } = editForm;
        const field = tc.must_call ? 'must_call' : 'must_contain';
        return { ...rest, [field]: parsedContain };
      }),
    };
    setTestCases(updated);
    setEditingId(null);
    toast.success('Test case updated');
  };

  const getFullJson = () => JSON.stringify(testCases, null, 2);

  const handleDownload = () => {
    const blob = new Blob([getFullJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-cases.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const tabs = [
    { key: 'solution', label: 'Solution Code' },
    { key: 'prefilled', label: 'Prefilled Code' },
    { key: 'question', label: 'Question Markdown' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">Test Case Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate static code check test cases</p>
      </div>

      {/* Input tabs */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg">
        <div className="flex items-center justify-between border-b border-dark-600">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-accent-blue border-b-2 border-accent-blue'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleImportFromQuestionGenerator}
            className="flex items-center gap-1.5 mr-3 px-3 py-1.5 border border-dark-500 hover:border-gray-400 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-colors"
          >
            <Import size={13} />
            Import from Question Generator
          </button>
        </div>
        <div className="p-4">
          {activeTab === 'solution' && (
            <CodeEditor
              value={solutionCode}
              onChange={setSolutionCode}
              placeholder="Paste your solution code here..."
              height="h-48"
            />
          )}
          {activeTab === 'prefilled' && (
            <CodeEditor
              value={prefilledCode}
              onChange={setPrefilledCode}
              placeholder="Paste prefilled code here (optional)..."
              height="h-48"
            />
          )}
          {activeTab === 'question' && (
            <CodeEditor
              value={questionMarkdown}
              onChange={setQuestionMarkdown}
              placeholder="Paste question markdown here (optional)..."
              height="h-48"
            />
          )}
        </div>
      </div>

      {/* Config */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
        <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Number of Test Cases</label>
            <input
              type="number"
              min={1}
              max={20}
              value={numberOfTestCases}
              onChange={(e) => setNumberOfTestCases(parseInt(e.target.value) || 8)}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Custom Rules</label>
            <textarea
              value={customRules}
              onChange={(e) => setCustomRules(e.target.value)}
              placeholder={'e.g. "Do NOT generate a test case for print statement"\n"Must check for specific import X"'}
              rows={3}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating...' : 'Generate Test Cases'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-accent-blue" />
        </div>
      )}

      {/* Results */}
      {testCases && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">
              {testCases.test_cases?.length || 0} Test Cases
            </h3>
            <div className="flex gap-2">
              <CopyButton text={getFullJson()} label="Copy All" />
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
              >
                <Download size={14} />
                Download JSON
              </button>
            </div>
          </div>

          {testCases.test_cases?.map((tc) => (
            <div key={tc.id} className="bg-dark-800 border border-dark-600 rounded-lg p-4">
              {editingId === tc.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Name</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Enum</label>
                      <input
                        value={editForm.test_case_enum}
                        onChange={(e) => setEditForm({ ...editForm, test_case_enum: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Fail If</label>
                    <input
                      value={editForm.fail_if}
                      onChange={(e) => setEditForm({ ...editForm, fail_if: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Condition</label>
                    <input
                      value={editForm.condition}
                      onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Must Contain (JSON array)</label>
                    <textarea
                      value={editForm.must_contain}
                      onChange={(e) => setEditForm({ ...editForm, must_contain: e.target.value })}
                      rows={3}
                      className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200 font-mono resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Flexibility Note</label>
                    <input
                      value={editForm.flexibility_note}
                      onChange={(e) => setEditForm({ ...editForm, flexibility_note: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Type</label>
                      <input
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Weight</label>
                      <input
                        type="number"
                        value={editForm.weight}
                        onChange={(e) => setEditForm({ ...editForm, weight: parseInt(e.target.value) || 5 })}
                        className="w-full bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-sm text-gray-200"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded text-sm text-gray-300"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-blue hover:bg-blue-600 rounded text-sm text-white"
                    >
                      <Save size={14} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-200">{tc.name}</h4>
                      <span className="text-xs font-mono text-accent-blue">{tc.test_case_enum}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(tc)} className="p-1.5 hover:bg-dark-700 rounded text-gray-400 hover:text-gray-200">
                        <Pencil size={14} />
                      </button>
                      <CopyButton text={JSON.stringify(tc, null, 2)} label="" />
                      <button onClick={() => handleDelete(tc.id)} className="p-1.5 hover:bg-dark-700 rounded text-gray-400 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div><span className="text-gray-500">Fail if:</span> {tc.fail_if}</div>
                    <div><span className="text-gray-500">Condition:</span> {tc.condition}</div>
                    <div>
                      <span className="text-gray-500">Must contain:</span>{' '}
                      <code className="text-gray-300">{JSON.stringify(tc.must_contain || tc.must_call)}</code>
                    </div>
                    <div><span className="text-gray-500">Weight:</span> {tc.weight}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
