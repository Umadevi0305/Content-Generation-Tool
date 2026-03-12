import { useState } from 'react';
import { Loader2, ShieldCheck, Download, Import } from 'lucide-react';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import CopyButton from '../components/CopyButton';
import { evaluateTestCases } from '../utils/api';
import { useAppState } from '../context/AppStateContext';

export default function TestCaseEvaluator() {
  const { evaluatorState, setEvaluatorState, questionState, testCaseState } = useAppState();
  const { questionText, solutionCode, studentCode, testCasesJson, evaluationResult } = evaluatorState;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('question');

  const update = (patch) => setEvaluatorState((s) => ({ ...s, ...patch }));

  const handleImportQuestion = () => {
    if (!questionState.markdown) {
      toast.error('No question markdown available. Generate one first.');
      return;
    }
    update({ questionText: questionState.markdown });
    toast.success('Imported question markdown');
  };

  const handleImportSolution = () => {
    if (!questionState.solutionCode) {
      toast.error('No solution code available in Question Generator.');
      return;
    }
    update({ solutionCode: questionState.solutionCode });
    toast.success('Imported solution code');
  };

  const handleImportTestCases = () => {
    if (!testCaseState.testCases) {
      toast.error('No test cases available. Generate them first.');
      return;
    }
    update({ testCasesJson: JSON.stringify(testCaseState.testCases, null, 2) });
    toast.success('Imported test cases');
  };

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

    setLoading(true);
    try {
      const result = await evaluateTestCases({
        questionText,
        solutionCode,
        studentCode,
        testCases: parsedTestCases,
      });
      update({ evaluationResult: result });
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

  const tabs = [
    { key: 'question', label: 'Question Text' },
    { key: 'solution', label: 'Reference Solution' },
    { key: 'student', label: 'Student Submission' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">Test Case Evaluator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Evaluate test cases against student submissions</p>
      </div>

      {/* Top section — 3 input areas (tabbed) */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg">
        <div className="flex border-b border-dark-600">
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
        <div className="p-4">
          {activeTab === 'question' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={handleImportQuestion}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
                >
                  <Import size={12} />
                  Import from Question Generator
                </button>
              </div>
              <CodeEditor
                value={questionText}
                onChange={(v) => update({ questionText: v })}
                placeholder="Paste question markdown here..."
                height="h-48"
              />
            </div>
          )}
          {activeTab === 'solution' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={handleImportSolution}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
                >
                  <Import size={12} />
                  Import from Question Generator
                </button>
              </div>
              <CodeEditor
                value={solutionCode}
                onChange={(v) => update({ solutionCode: v })}
                placeholder="Paste reference solution code here..."
                height="h-48"
              />
            </div>
          )}
          {activeTab === 'student' && (
            <CodeEditor
              value={studentCode}
              onChange={(v) => update({ studentCode: v })}
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
          <button
            onClick={handleImportTestCases}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
          >
            <Import size={12} />
            Import from Test Case Generator
          </button>
        </div>
        <CodeEditor
          value={testCasesJson}
          onChange={(v) => update({ testCasesJson: v })}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-accent-blue" />
        </div>
      )}

      {/* Bottom section — Evaluation Results */}
      {evaluationResult && !loading && (
        <div className="space-y-3">
          {/* Summary bar */}
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

          {/* Result cards */}
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
    </div>
  );
}
