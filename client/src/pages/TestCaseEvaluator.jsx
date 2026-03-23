import { useState } from 'react';
import { Loader2, ShieldCheck, Download, ChevronDown, ChevronRight, Play, Trash2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import CopyButton from '../components/CopyButton';
import QuestionSelector from '../components/QuestionSelector';
import { evaluateTestCases, autoEvaluateTestCases } from '../utils/api';
import { useAppState } from '../context/AppStateContext';

const MODE_TABS = [
  { key: 'manual', label: 'Manual Evaluate' },
  { key: 'auto', label: 'Auto-Evaluate' },
];

function PassRateBar({ passed, total }) {
  const ratio = total > 0 ? passed / total : 0;
  const color = ratio === 1 ? 'bg-green-500' : ratio === 0 ? 'bg-red-500' : 'bg-yellow-500';
  return (
    <div className="w-full bg-dark-600 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.max(ratio * 100, total > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

function StatusLabel({ passed, total }) {
  if (total === 0) return <span className="text-xs text-gray-500">N/A</span>;
  const ratio = passed / total;
  if (ratio === 1) return <span className="text-xs font-semibold text-green-400">All Pass</span>;
  if (ratio === 0) return <span className="text-xs font-semibold text-red-400">All Fail</span>;
  return <span className="text-xs font-semibold text-yellow-400">Partial</span>;
}

function VariantTypeBadge({ type, passRatio }) {
  const color =
    passRatio === 1
      ? 'bg-green-500/15 text-green-400 border-green-500/30'
      : passRatio === 0
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {type}
    </span>
  );
}

export default function TestCaseEvaluator() {
  const { activeProject, activeQuestion, updateQuestion } = useAppState();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('question');
  const [mode, setMode] = useState('manual');

  // Auto-evaluate state
  const [autoLoading, setAutoLoading] = useState(false);
  const [numberOfVariants, setNumberOfVariants] = useState(5);
  const [currentVariants, setCurrentVariants] = useState([]);
  const [expandedVariants, setExpandedVariants] = useState({});
  const [expandedHistoryRun, setExpandedHistoryRun] = useState(null);

  if (!activeProject || !activeQuestion) return null;

  const {
    questionMd: questionText,
    solutionCode,
    prefilledCode,
    studentCode,
    testCasesJson,
    evaluationResult,
    autoEvaluateHistory,
  } = activeQuestion;

  const set = (patch) => {
    const idx = activeProject.activeQuestionIndex;
    updateQuestion(idx, patch);
  };

  // --- Manual Evaluate ---
  const handleEvaluate = async () => {
    if (!studentCode.trim()) {
      toast.error('Student submission code is required');
      return;
    }
    if (!testCasesJson.trim()) {
      toast.error('Test cases JSON is required');
      return;
    }

    let parsedTestCases;
    try {
      const parsed = JSON.parse(testCasesJson);
      parsedTestCases = parsed.test_cases || parsed;
    } catch {
      toast.error('Invalid test cases JSON');
      return;
    }

    const capturedIdx = activeProject.activeQuestionIndex;
    setLoading(true);
    try {
      const result = await evaluateTestCases({
        questionText,
        solutionCode,
        studentCode,
        testCases: parsedTestCases,
      });
      updateQuestion(capturedIdx, { evaluationResult: result });
      toast.success('Evaluation complete!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getResultJson = () => JSON.stringify(evaluationResult, null, 2);

  const handleDownload = () => {
    const blob = new Blob([getResultJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evaluation-results.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const passed = evaluationResult?.passed_test_cases_count || 0;
  const total = evaluationResult?.total_test_cases_count || 0;
  const passRatio = total > 0 ? passed / total : 0;

  const getSummaryColor = () => {
    if (passRatio === 1) return 'bg-green-500';
    if (passRatio === 0) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  // --- Auto-Evaluate ---
  const getParsedTestCases = () => {
    if (!testCasesJson?.trim()) return null;
    try {
      const parsed = JSON.parse(testCasesJson);
      return parsed.test_cases || parsed;
    } catch {
      return null;
    }
  };

  const handleAutoEvaluate = async () => {
    const parsedTc = getParsedTestCases();
    if (!solutionCode?.trim()) {
      toast.error('Solution code is required');
      return;
    }
    if (!parsedTc || parsedTc.length === 0) {
      toast.error('Valid test cases are required');
      return;
    }

    const capturedIdx = activeProject.activeQuestionIndex;
    const capturedHistory = autoEvaluateHistory || [];
    setAutoLoading(true);
    setCurrentVariants([]);
    setExpandedVariants({});
    try {
      const result = await autoEvaluateTestCases({
        questionText,
        solutionCode,
        prefilledCode,
        testCases: parsedTc,
        numberOfVariants,
      });

      setCurrentVariants(result.variants);

      // Compute avg pass rate
      const avgPassRate =
        result.variants.length > 0
          ? Math.round(
              (result.variants.reduce(
                (sum, v) =>
                  sum +
                  (v.evaluation.total_test_cases_count > 0
                    ? (v.evaluation.passed_test_cases_count / v.evaluation.total_test_cases_count) * 100
                    : 0),
                0
              ) /
                result.variants.length)
            )
          : 0;

      // Save to history
      const historyEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        variantCount: result.variants.length,
        avgPassRate,
        variants: result.variants,
      };

      updateQuestion(capturedIdx, {
        autoEvaluateHistory: [historyEntry, ...capturedHistory],
      });

      toast.success(`Generated & evaluated ${result.variants.length} variants!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAutoLoading(false);
    }
  };

  const handleUseAsManualTest = (code) => {
    set({ studentCode: code });
    setMode('manual');
    setActiveTab('student');
    toast.success('Code loaded into Student Submission');
  };

  const handleClearHistory = () => {
    if (confirm('Clear all auto-evaluate history for this question?')) {
      set({ autoEvaluateHistory: [] });
      toast.success('History cleared');
    }
  };

  const toggleVariant = (idx) => {
    setExpandedVariants((s) => ({ ...s, [idx]: !s[idx] }));
  };

  const formatDate = (ts) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const inputTabs = [
    { key: 'question', label: 'Question Text' },
    { key: 'solution', label: 'Original Solution Code' },
    { key: 'student', label: 'Student Submission' },
  ];

  // --- Render Manual Tab ---
  const renderManual = () => (
    <>
      {/* Top section — 3 input areas (tabbed) */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg">
        <div className="flex items-center justify-between border-b border-dark-600">
          <div className="flex">
            {inputTabs.map((tab) => (
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
          <span className="mr-3 text-xs text-gray-600">Auto-loaded from project</span>
        </div>
        <div className="p-4">
          {activeTab === 'question' && (
            <CodeEditor
              value={questionText}
              onChange={(v) => set({ questionMd: v })}
              placeholder="Paste question markdown here..."
              height="h-48"
            />
          )}
          {activeTab === 'solution' && (
            <CodeEditor
              value={solutionCode}
              onChange={(v) => set({ solutionCode: v })}
              placeholder="Paste original solution code here..."
              height="h-48"
            />
          )}
          {activeTab === 'student' && (
            <CodeEditor
              value={studentCode}
              onChange={(v) => set({ studentCode: v })}
              placeholder="Paste student submission code here..."
              height="h-48"
            />
          )}
        </div>
      </div>

      {/* Middle section — Test Cases Input */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Test Cases JSON</label>
          <span className="text-xs text-gray-600">Auto-loaded from project</span>
        </div>
        <CodeEditor
          value={testCasesJson}
          onChange={(v) => set({ testCasesJson: v })}
          placeholder="Paste test cases JSON here..."
          height="h-40"
        />
        <div className="flex justify-end">
          <button
            onClick={handleEvaluate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? 'Evaluating...' : 'Evaluate'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-accent-blue" />
        </div>
      )}

      {evaluationResult && !loading && (
        <div className="space-y-3">
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                Passed: {passed} / {total} test cases
              </h3>
              <div className="flex gap-2">
                <CopyButton text={getResultJson()} label="Copy Results JSON" />
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  <Download size={14} />
                  Download Results
                </button>
              </div>
            </div>
            <div className="w-full bg-dark-600 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${getSummaryColor()}`}
                style={{ width: `${Math.max(passRatio * 100, total > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>

          {evaluationResult.test_case_details?.map((tc, idx) => {
            const isCorrect = tc.evaluation_result === 'CORRECT';
            return (
              <div
                key={tc.test_case_id || idx}
                className={`bg-dark-800 border rounded-lg p-4 ${
                  isCorrect ? 'border-green-500/50' : 'border-red-500/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-accent-blue">{tc.test_case_enum}</span>
                    {tc.display_text && (
                      <h4 className="text-sm font-semibold text-gray-200 mt-0.5">{tc.display_text}</h4>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isCorrect
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {tc.evaluation_result}
                  </span>
                </div>
                {tc.description && (
                  <p className="mt-2 text-sm text-gray-400">{tc.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  // --- Render variant detail cards ---
  const renderVariantCards = (variants, keyPrefix = '') => (
    <div className="space-y-2">
      {variants.map((v, idx) => {
        const vPassed = v.evaluation?.passed_test_cases_count || 0;
        const vTotal = v.evaluation?.total_test_cases_count || 0;
        const vRatio = vTotal > 0 ? vPassed / vTotal : 0;
        const isExpanded = expandedVariants[`${keyPrefix}${idx}`];

        return (
          <div key={idx} className="bg-dark-800 border border-dark-600 rounded-lg">
            <button
              onClick={() => toggleVariant(`${keyPrefix}${idx}`)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-400" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400" />
                )}
                <span className="text-sm font-semibold text-gray-200">V{v.variantNumber}</span>
                <VariantTypeBadge type={v.variantType} passRatio={vRatio} />
                <span className="text-xs text-gray-500 truncate max-w-xs">{v.description}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{vPassed}/{vTotal}</span>
                <StatusLabel passed={vPassed} total={vTotal} />
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-dark-600 pt-3">
                <p className="text-sm text-gray-400">{v.description}</p>

                {/* Student code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500">Student Code</label>
                    <button
                      onClick={() => handleUseAsManualTest(v.studentCode)}
                      className="flex items-center gap-1 px-2 py-1 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      <ArrowRight size={10} />
                      Use as Manual Test
                    </button>
                  </div>
                  <pre className="bg-dark-900 border border-dark-600 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-auto max-h-48 whitespace-pre">
                    {v.studentCode}
                  </pre>
                </div>

                {/* Pass rate bar */}
                <PassRateBar passed={vPassed} total={vTotal} />

                {/* Test case results */}
                {v.evaluation?.test_case_details?.map((tc, tcIdx) => {
                  const isCorrect = tc.evaluation_result === 'CORRECT';
                  return (
                    <div
                      key={tc.test_case_id || tcIdx}
                      className={`border rounded-lg p-3 ${
                        isCorrect ? 'border-green-500/50' : 'border-red-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-mono text-accent-blue">{tc.test_case_enum}</span>
                          {tc.display_text && (
                            <p className="text-xs font-medium text-gray-300 mt-0.5">{tc.display_text}</p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isCorrect
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {tc.evaluation_result}
                        </span>
                      </div>
                      {tc.description && (
                        <p className="mt-1.5 text-xs text-gray-500">{tc.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // --- Render Auto-Evaluate Tab ---
  const renderAutoEvaluate = () => (
    <>
      {/* Inputs preview */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-300">Inputs (from project)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Question MD:</span>
            <span className={`text-xs font-medium ${questionText?.trim() ? 'text-green-400' : 'text-gray-600'}`}>
              {questionText?.trim() ? `${questionText.length} chars` : 'Empty'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Solution Code:</span>
            <span className={`text-xs font-medium ${solutionCode?.trim() ? 'text-green-400' : 'text-gray-600'}`}>
              {solutionCode?.trim() ? `${solutionCode.length} chars` : 'Empty'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Prefilled Code:</span>
            <span className={`text-xs font-medium ${prefilledCode?.trim() ? 'text-green-400' : 'text-gray-600'}`}>
              {prefilledCode?.trim() ? `${prefilledCode.length} chars` : 'Empty'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Test Cases:</span>
            <span className={`text-xs font-medium ${getParsedTestCases() ? 'text-green-400' : 'text-gray-600'}`}>
              {getParsedTestCases() ? `${getParsedTestCases().length} test cases` : 'Empty / Invalid'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Number of Variants</label>
            <input
              type="number"
              min={1}
              max={10}
              value={numberOfVariants}
              onChange={(e) => setNumberOfVariants(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
              className="w-24 bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
            />
          </div>
          <div className="pt-5">
            <button
              onClick={handleAutoEvaluate}
              disabled={autoLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
            >
              {autoLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {autoLoading ? 'Generating & Evaluating...' : 'Generate & Evaluate'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {autoLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 size={32} className="animate-spin text-accent-blue" />
          <p className="text-sm text-gray-500">Generating {numberOfVariants} student variants and evaluating each...</p>
        </div>
      )}

      {/* Current run results */}
      {currentVariants.length > 0 && !autoLoading && (
        <div className="space-y-4">
          {/* Summary Table */}
          <div className="bg-dark-800 border border-dark-600 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Variant</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Description</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">Passed</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">Total</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentVariants.map((v) => {
                  const vP = v.evaluation?.passed_test_cases_count || 0;
                  const vT = v.evaluation?.total_test_cases_count || 0;
                  return (
                    <tr key={v.variantNumber} className="border-b border-dark-600/50 last:border-0">
                      <td className="px-4 py-2.5 text-gray-300 font-semibold">V{v.variantNumber}</td>
                      <td className="px-4 py-2.5">
                        <VariantTypeBadge type={v.variantType} passRatio={vT > 0 ? vP / vT : 0} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-xs">{v.description}</td>
                      <td className="px-4 py-2.5 text-center text-gray-300">{vP}</td>
                      <td className="px-4 py-2.5 text-center text-gray-300">{vT}</td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusLabel passed={vP} total={vT} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detail Cards */}
          <h3 className="text-sm font-semibold text-gray-300">Variant Details</h3>
          {renderVariantCards(currentVariants, 'current-')}
        </div>
      )}

      {/* History */}
      {autoEvaluateHistory && autoEvaluateHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Evaluation History</h3>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Clear History
            </button>
          </div>

          {autoEvaluateHistory.map((run) => {
            const isExpanded = expandedHistoryRun === run.id;
            return (
              <div key={run.id} className="bg-dark-800 border border-dark-600 rounded-lg">
                <button
                  onClick={() => setExpandedHistoryRun(isExpanded ? null : run.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                    <span className="text-sm text-gray-300">{formatDate(run.timestamp)}</span>
                    <span className="text-xs text-gray-500">
                      {run.variantCount} variant{run.variantCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Avg pass rate: {run.avgPassRate}%
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-dark-600 pt-3">
                    {renderVariantCards(run.variants, `hist-${run.id}-`)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">Test Case Evaluator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Evaluate test cases against student submissions</p>
      </div>

      {/* Question Selector */}
      <QuestionSelector />

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === tab.key
                ? 'bg-accent-blue text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {mode === 'manual' && renderManual()}
      {mode === 'auto' && renderAutoEvaluate()}
    </div>
  );
}
