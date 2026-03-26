import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, Sparkles, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Play, ArrowLeft, ArrowRight, RotateCcw, Download, ExternalLink,
  Upload, X, FileIcon, Pencil, Trash2, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import CodeEditor from '../components/CodeEditor';
import MarkdownPreview from '../components/MarkdownPreview';
import CopyButton from '../components/CopyButton';
import { useAppState } from '../context/AppStateContext';
import { generateQuestion, generateTestCases, autoEvaluateTestCases } from '../utils/api';

const PHASE_LABELS = [
  'Setup',
  'Question MD Generation',
  'Test Case Generation',
  'Auto-Evaluation',
  'JSON Generation',
  'ZIP Generation',
];

// ─── Per-question tab bar ───
function QuestionTabs({ questions, activeIndex, onSelect, statusFn }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {questions.map((_, idx) => {
        const status = statusFn ? statusFn(idx) : null;
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              idx === activeIndex
                ? 'bg-accent-blue text-white'
                : 'bg-dark-700 text-gray-400 hover:text-gray-200 hover:bg-dark-600'
            }`}
          >
            Q{idx + 1}
            {status === 'accepted' && <CheckCircle2 size={12} className="text-green-400" />}
            {status === 'reviewing' && <Loader2 size={12} className="text-yellow-400" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step Indicator (left sidebar in wizard) ───
function StepIndicator({ currentPhase, phaseStatus }) {
  return (
    <div className="w-56 shrink-0 bg-dark-800 border-r border-dark-600 p-4 space-y-1">
      {PHASE_LABELS.map((label, idx) => {
        const status = phaseStatus[idx];
        const isCurrent = idx === currentPhase;
        return (
          <div
            key={idx}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isCurrent
                ? 'bg-accent-blue/10 text-accent-blue font-semibold'
                : status === 'completed'
                ? 'text-green-400'
                : 'text-gray-500'
            }`}
          >
            {status === 'completed' ? (
              <CheckCircle2 size={16} />
            ) : isCurrent ? (
              <Play size={16} />
            ) : (
              <Circle size={16} />
            )}
            <span className="truncate">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PHASE 0: SETUP
// ═══════════════════════════════════════════════════════════
function Phase0Setup({ project, updateQuestion, updatePipeline, setPipelinePhase }) {
  const { questions, pipeline } = project;
  const [activeIdx, setActiveIdx] = useState(0);

  const q = questions[activeIdx];

  const allReady = questions.every((q) => q.solutionCode?.trim() && q.prefilledCode?.trim());

  const handleStart = () => {
    updatePipeline((p) => ({
      ...p,
      currentPhase: 1,
      phaseStatus: ['completed', 'in_progress', ...p.phaseStatus.slice(2)],
    }));
  };

  return (
    <div className="space-y-4">
      <QuestionTabs
        questions={questions}
        activeIndex={activeIdx}
        onSelect={setActiveIdx}
        statusFn={(idx) =>
          questions[idx].solutionCode?.trim() && questions[idx].prefilledCode?.trim()
            ? 'accepted'
            : null
        }
      />

      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white">Question {activeIdx + 1} — Inputs</h3>

        <CodeEditor
          value={q.solutionCode}
          onChange={(v) => updateQuestion(activeIdx, { solutionCode: v })}
          placeholder="Paste solution code here... (REQUIRED)"
          label="Solution Code"
          height="h-48"
        />
        <CodeEditor
          value={q.prefilledCode}
          onChange={(v) => updateQuestion(activeIdx, { prefilledCode: v })}
          placeholder="Paste prefilled/starter code here... (REQUIRED)"
          label="Prefilled Code"
          height="h-40"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">.env Content</label>
            <textarea
              value={q.prefillEnv}
              onChange={(e) => updateQuestion(activeIdx, { prefillEnv: e.target.value, solutionEnv: e.target.value })}
              placeholder='e.g. GEMINI_API_KEY="your_key"'
              rows={3}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">requirements.txt (optional)</label>
            <textarea
              value={q.prefillReq}
              onChange={(e) => updateQuestion(activeIdx, { prefillReq: e.target.value, solutionReq: e.target.value })}
              placeholder="e.g. google-generativeai"
              rows={3}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleStart}
          disabled={!allReady}
          className="flex items-center gap-2 px-6 py-3 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors"
        >
          <Play size={16} />
          Start Pipeline
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PHASE 1: QUESTION MD GENERATION
// ═══════════════════════════════════════════════════════════
function Phase1QuestionMd({ project, updateQuestion, updatePipeline }) {
  const { questions, pipeline } = project;
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState({});
  const [viewMode, setViewMode] = useState('preview');
  const autoGenTriggered = useRef({});

  const q = questions[activeIdx];
  const perQ = pipeline.perQuestion[activeIdx];

  const allAccepted = pipeline.perQuestion.every((pq) => pq.questionMdAccepted);

  const handleGenerate = useCallback(async (idx) => {
    const question = questions[idx];
    if (!question.solutionCode?.trim()) {
      toast.error(`Question ${idx + 1}: Solution code is required`);
      return;
    }
    setLoading((s) => ({ ...s, [idx]: true }));
    try {
      const data = await generateQuestion({
        solutionCode: question.solutionCode,
        prefilledCode: question.prefilledCode,
        customRules: question.questionCustomRules,
      });
      updateQuestion(idx, { questionMd: data.markdown });
      toast.success(`Question ${idx + 1} MD generated!`);
    } catch (err) {
      toast.error(`Q${idx + 1}: ${err.message}`);
    } finally {
      setLoading((s) => ({ ...s, [idx]: false }));
    }
  }, [questions, updateQuestion]);

  // Auto-generate for active question when it has no content yet
  useEffect(() => {
    const q = questions[activeIdx];
    const pq = pipeline.perQuestion[activeIdx];
    if (!q.questionMd?.trim() && !loading[activeIdx] && !pq?.questionMdAccepted && !autoGenTriggered.current[activeIdx]) {
      autoGenTriggered.current[activeIdx] = true;
      handleGenerate(activeIdx);
    }
  }, [activeIdx, questions, pipeline.perQuestion, loading, handleGenerate]);

  const handleAccept = (idx) => {
    updatePipeline((p) => {
      const perQuestion = [...p.perQuestion];
      perQuestion[idx] = { ...perQuestion[idx], questionMdAccepted: true };
      return { ...p, perQuestion };
    });
    toast.success(`Question ${idx + 1} MD accepted`);

    // Auto-advance to next unaccepted question
    const nextIdx = questions.findIndex((_, i) => i > idx && !pipeline.perQuestion[i]?.questionMdAccepted);
    if (nextIdx !== -1) {
      setActiveIdx(nextIdx);
    }
  };

  // Auto-proceed to next phase when all accepted
  useEffect(() => {
    if (allAccepted) {
      const timer = setTimeout(() => {
        updatePipeline((p) => ({
          ...p,
          currentPhase: 2,
          phaseStatus: p.phaseStatus.map((s, i) => (i === 1 ? 'completed' : i === 2 ? 'in_progress' : s)),
        }));
        toast.success('All questions accepted! Moving to Phase 2...');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [allAccepted, updatePipeline]);

  const getStatus = (idx) => {
    if (pipeline.perQuestion[idx]?.questionMdAccepted) return 'accepted';
    if (questions[idx].questionMd?.trim()) return 'reviewing';
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <QuestionTabs questions={questions} activeIndex={activeIdx} onSelect={setActiveIdx} statusFn={getStatus} />
        <div className="flex items-center gap-2">
          {allAccepted && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium animate-pulse">
              <Loader2 size={12} className="animate-spin" /> Proceeding to Phase 2...
            </span>
          )}
        </div>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Question {activeIdx + 1} — Markdown</h3>
          <div className="flex items-center gap-2">
            {perQ?.questionMdAccepted && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                <CheckCircle2 size={14} /> Accepted
              </span>
            )}
            <button
              onClick={() => {
                autoGenTriggered.current[activeIdx] = true;
                handleGenerate(activeIdx);
              }}
              disabled={loading[activeIdx]}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
            >
              {loading[activeIdx] ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              {q.questionMd?.trim() ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        </div>

        {loading[activeIdx] && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 size={32} className="animate-spin text-accent-blue" />
            <p className="text-xs text-gray-500">Agent is generating Question {activeIdx + 1} markdown...</p>
          </div>
        )}

        {q.questionMd?.trim() && !loading[activeIdx] && (
          <>
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'preview' ? 'bg-accent-blue/20 text-accent-blue' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'edit' ? 'bg-accent-blue/20 text-accent-blue' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Edit
              </button>
            </div>

            <div className="bg-dark-900 border border-dark-600 rounded-lg p-4 max-h-96 overflow-auto">
              {viewMode === 'preview' ? (
                <MarkdownPreview content={q.questionMd} />
              ) : (
                <textarea
                  value={q.questionMd}
                  onChange={(e) => updateQuestion(activeIdx, { questionMd: e.target.value })}
                  className="w-full h-64 bg-transparent font-mono text-sm text-gray-300 resize-none outline-none"
                />
              )}
            </div>

            {!perQ?.questionMdAccepted && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleAccept(activeIdx)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <CheckCircle2 size={14} />
                  Accept & Continue
                </button>
              </div>
            )}
          </>
        )}

        {!q.questionMd?.trim() && !loading[activeIdx] && (
          <p className="text-gray-600 text-sm py-8 text-center">
            Agent will auto-generate question markdown. Click Regenerate if needed.
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PHASE 2: TEST CASE GENERATION
// ═══════════════════════════════════════════════════════════
function Phase2TestCases({ project, updateQuestion, updatePipeline }) {
  const { questions, pipeline } = project;
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState({});
  const autoGenTriggered = useRef({});

  const q = questions[activeIdx];
  const perQ = pipeline.perQuestion[activeIdx];
  const allAccepted = pipeline.perQuestion.every((pq) => pq.testCasesAccepted);

  let testCases = null;
  if (q.testCasesJson?.trim()) {
    try { testCases = JSON.parse(q.testCasesJson); } catch {}
  }

  const handleGenerate = useCallback(async (idx) => {
    const question = questions[idx];
    setLoading((s) => ({ ...s, [idx]: true }));
    try {
      const data = await generateTestCases({
        solutionCode: question.solutionCode,
        prefilledCode: question.prefilledCode,
        questionMarkdown: question.questionMd,
        numberOfTestCases: question.numberOfTestCases || 8,
        customRules: question.testCaseCustomRules,
      });
      updateQuestion(idx, { testCasesJson: JSON.stringify(data.testCases, null, 2) });
      toast.success(`Q${idx + 1} test cases generated!`);
    } catch (err) {
      toast.error(`Q${idx + 1}: ${err.message}`);
    } finally {
      setLoading((s) => ({ ...s, [idx]: false }));
    }
  }, [questions, updateQuestion]);

  // Auto-generate for active question when it has no content yet
  useEffect(() => {
    const q = questions[activeIdx];
    const pq = pipeline.perQuestion[activeIdx];
    if (!q.testCasesJson?.trim() && !loading[activeIdx] && !pq?.testCasesAccepted && !autoGenTriggered.current[activeIdx]) {
      autoGenTriggered.current[activeIdx] = true;
      handleGenerate(activeIdx);
    }
  }, [activeIdx, questions, pipeline.perQuestion, loading, handleGenerate]);

  const handleAccept = (idx) => {
    updatePipeline((p) => {
      const perQuestion = [...p.perQuestion];
      perQuestion[idx] = { ...perQuestion[idx], testCasesAccepted: true };
      return { ...p, perQuestion };
    });
    toast.success(`Q${idx + 1} test cases accepted`);

    // Auto-advance to next unaccepted question
    const nextIdx = questions.findIndex((_, i) => i > idx && !pipeline.perQuestion[i]?.testCasesAccepted);
    if (nextIdx !== -1) {
      setActiveIdx(nextIdx);
    }
  };

  // Auto-proceed to next phase when all accepted
  useEffect(() => {
    if (allAccepted) {
      const timer = setTimeout(() => {
        updatePipeline((p) => ({
          ...p,
          currentPhase: 3,
          phaseStatus: p.phaseStatus.map((s, i) => (i === 2 ? 'completed' : i === 3 ? 'in_progress' : s)),
        }));
        toast.success('All test cases accepted! Moving to Phase 3...');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [allAccepted, updatePipeline]);

  const handleDeleteTestCase = (tcId) => {
    if (!testCases) return;
    const updated = { ...testCases, test_cases: testCases.test_cases.filter((tc) => tc.id !== tcId) };
    updateQuestion(activeIdx, { testCasesJson: JSON.stringify(updated, null, 2) });
  };

  const getStatus = (idx) => {
    if (pipeline.perQuestion[idx]?.testCasesAccepted) return 'accepted';
    if (questions[idx].testCasesJson?.trim()) return 'reviewing';
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <QuestionTabs questions={questions} activeIndex={activeIdx} onSelect={setActiveIdx} statusFn={getStatus} />
        <div className="flex items-center gap-2">
          {allAccepted && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium animate-pulse">
              <Loader2 size={12} className="animate-spin" /> Proceeding to Phase 3...
            </span>
          )}
        </div>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Question {activeIdx + 1} — Test Cases</h3>
          <div className="flex items-center gap-2">
            {perQ?.testCasesAccepted && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                <CheckCircle2 size={14} /> Accepted
              </span>
            )}
            <button
              onClick={() => {
                autoGenTriggered.current[activeIdx] = true;
                handleGenerate(activeIdx);
              }}
              disabled={loading[activeIdx]}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
            >
              {loading[activeIdx] ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              {testCases ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        </div>

        {loading[activeIdx] && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 size={32} className="animate-spin text-accent-blue" />
            <p className="text-xs text-gray-500">Agent is generating test cases for Question {activeIdx + 1}...</p>
          </div>
        )}

        {testCases && !loading[activeIdx] && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{testCases.test_cases?.length || 0} test cases</span>
              <CopyButton text={q.testCasesJson} label="Copy JSON" />
            </div>

            <div className="space-y-2 max-h-96 overflow-auto">
              {testCases.test_cases?.map((tc) => (
                <div key={tc.id} className="bg-dark-900 border border-dark-600 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200">{tc.name}</h4>
                      <span className="text-xs font-mono text-accent-blue">{tc.test_case_enum}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteTestCase(tc.id)}
                      className="p-1 hover:bg-dark-700 rounded text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-500">
                    <span>Fail if: {tc.fail_if}</span> &middot; <span>Weight: {tc.weight}</span>
                  </div>
                </div>
              ))}
            </div>

            {!perQ?.testCasesAccepted && (
              <div className="flex justify-end">
                <button
                  onClick={() => handleAccept(activeIdx)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <CheckCircle2 size={14} />
                  Accept & Continue
                </button>
              </div>
            )}
          </>
        )}

        {!testCases && !loading[activeIdx] && (
          <p className="text-gray-600 text-sm py-8 text-center">
            Agent will auto-generate test cases. Click Regenerate if needed.
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PHASE 3: AUTO-EVALUATION
// ═══════════════════════════════════════════════════════════
function Phase3Evaluation({ project, updateQuestion, updatePipeline }) {
  const { questions, pipeline } = project;
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({}); // idx -> variants[]
  const [expandedV, setExpandedV] = useState({});
  const autoGenTriggered = useRef({});

  const perQ = pipeline.perQuestion[activeIdx];
  const allAccepted = pipeline.perQuestion.every((pq) => pq.evaluationAccepted);

  const handleEvaluate = useCallback(async (idx) => {
    const q = questions[idx];
    let parsedTc;
    try {
      const parsed = JSON.parse(q.testCasesJson);
      parsedTc = parsed.test_cases || parsed;
    } catch {
      toast.error(`Q${idx + 1}: Invalid test cases JSON`);
      return;
    }

    setLoading((s) => ({ ...s, [idx]: true }));
    try {
      const result = await autoEvaluateTestCases({
        questionText: q.questionMd,
        solutionCode: q.solutionCode,
        prefilledCode: q.prefilledCode,
        testCases: parsedTc,
        numberOfVariants: 5,
      });
      setResults((s) => ({ ...s, [idx]: result.variants }));
      toast.success(`Q${idx + 1}: ${result.variants.length} variants evaluated!`);
    } catch (err) {
      toast.error(`Q${idx + 1}: ${err.message}`);
    } finally {
      setLoading((s) => ({ ...s, [idx]: false }));
    }
  }, [questions]);

  // Auto-evaluate for active question when it has no results yet
  useEffect(() => {
    const pq = pipeline.perQuestion[activeIdx];
    if (!results[activeIdx]?.length && !loading[activeIdx] && !pq?.evaluationAccepted && !autoGenTriggered.current[activeIdx]) {
      autoGenTriggered.current[activeIdx] = true;
      handleEvaluate(activeIdx);
    }
  }, [activeIdx, results, pipeline.perQuestion, loading, handleEvaluate]);

  const handleAccept = (idx) => {
    updatePipeline((p) => {
      const perQuestion = [...p.perQuestion];
      perQuestion[idx] = { ...perQuestion[idx], evaluationAccepted: true };
      return { ...p, perQuestion };
    });
    toast.success(`Q${idx + 1} evaluation accepted`);

    // Auto-advance to next unaccepted question
    const nextIdx = questions.findIndex((_, i) => i > idx && !pipeline.perQuestion[i]?.evaluationAccepted);
    if (nextIdx !== -1) {
      setActiveIdx(nextIdx);
    }
  };

  // Auto-proceed to next phase when all accepted
  useEffect(() => {
    if (allAccepted) {
      const timer = setTimeout(() => {
        updatePipeline((p) => ({
          ...p,
          currentPhase: 4,
          phaseStatus: p.phaseStatus.map((s, i) => (i === 3 ? 'completed' : i === 4 ? 'in_progress' : s)),
        }));
        toast.success('All evaluations accepted! Moving to Phase 4...');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [allAccepted, updatePipeline]);

  const handleBackToPhase2 = () => {
    updatePipeline((p) => ({
      ...p,
      currentPhase: 2,
      phaseStatus: p.phaseStatus.map((s, i) => (i === 2 ? 'in_progress' : i === 3 ? 'not_started' : s)),
      perQuestion: p.perQuestion.map((pq) => ({ ...pq, testCasesAccepted: false, evaluationAccepted: false })),
    }));
  };

  const getStatus = (idx) => {
    if (pipeline.perQuestion[idx]?.evaluationAccepted) return 'accepted';
    if (results[idx]?.length > 0) return 'reviewing';
    return null;
  };

  const variants = results[activeIdx] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <QuestionTabs questions={questions} activeIndex={activeIdx} onSelect={setActiveIdx} statusFn={getStatus} />
        <div className="flex items-center gap-2">
          {allAccepted && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium animate-pulse">
              <Loader2 size={12} className="animate-spin" /> Proceeding to Phase 4...
            </span>
          )}
          <button
            onClick={handleBackToPhase2}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
          >
            <ArrowLeft size={12} />
            Back to Phase 2
          </button>
        </div>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Question {activeIdx + 1} — Auto-Evaluation</h3>
          <div className="flex items-center gap-2">
            {perQ?.evaluationAccepted && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                <CheckCircle2 size={14} /> Accepted
              </span>
            )}
            <button
              onClick={() => {
                autoGenTriggered.current[activeIdx] = true;
                handleEvaluate(activeIdx);
              }}
              disabled={loading[activeIdx]}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
            >
              {loading[activeIdx] ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {variants.length > 0 ? 'Re-Evaluate' : 'Evaluate'}
            </button>
          </div>
        </div>

        {loading[activeIdx] && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 size={32} className="animate-spin text-accent-blue" />
            <p className="text-xs text-gray-500">Agent is evaluating Question {activeIdx + 1} with student variants...</p>
          </div>
        )}

        {variants.length > 0 && !loading[activeIdx] && (
          <>
            {/* Summary table */}
            <div className="overflow-hidden rounded-lg border border-dark-600">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-dark-900">
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">V#</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Type</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Description</th>
                    <th className="text-center px-3 py-2 text-gray-500 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const p = v.evaluation?.passed_test_cases_count || 0;
                    const t = v.evaluation?.total_test_cases_count || 0;
                    const ratio = t > 0 ? p / t : 0;
                    const color = ratio === 1 ? 'text-green-400' : ratio === 0 ? 'text-red-400' : 'text-yellow-400';
                    return (
                      <tr key={v.variantNumber} className="border-t border-dark-600/50">
                        <td className="px-3 py-2 text-gray-300 font-semibold">V{v.variantNumber}</td>
                        <td className="px-3 py-2 text-gray-400">{v.variantType}</td>
                        <td className="px-3 py-2 text-gray-500 truncate max-w-xs">{v.description}</td>
                        <td className={`px-3 py-2 text-center font-semibold ${color}`}>{p}/{t}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expandable cards */}
            <div className="space-y-2 max-h-96 overflow-auto">
              {variants.map((v, idx) => {
                const isExp = expandedV[`${activeIdx}-${idx}`];
                return (
                  <div key={idx} className="bg-dark-900 border border-dark-600 rounded-lg">
                    <button
                      onClick={() => setExpandedV((s) => ({ ...s, [`${activeIdx}-${idx}`]: !isExp }))}
                      className="w-full flex items-center justify-between px-3 py-2 text-left"
                    >
                      <span className="text-xs font-semibold text-gray-300">
                        V{v.variantNumber} — {v.variantType}
                      </span>
                      {isExp ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                    </button>
                    {isExp && (
                      <div className="px-3 pb-3 space-y-2 border-t border-dark-600 pt-2">
                        <p className="text-xs text-gray-500">{v.description}</p>
                        <pre className="bg-dark-800 border border-dark-600 rounded p-2 text-xs text-gray-300 font-mono overflow-auto max-h-40 whitespace-pre">
                          {v.studentCode}
                        </pre>
                        {v.evaluation?.test_case_details?.map((tc, tcIdx) => (
                          <div
                            key={tcIdx}
                            className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                              tc.evaluation_result === 'CORRECT' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            <span className="font-mono">{tc.test_case_enum}</span>
                            <span className="font-semibold">{tc.evaluation_result}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!perQ?.evaluationAccepted && (
              <div className="flex justify-end">
                <button
                  onClick={() => handleAccept(activeIdx)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <CheckCircle2 size={14} />
                  Accept & Continue
                </button>
              </div>
            )}
          </>
        )}

        {variants.length === 0 && !loading[activeIdx] && (
          <p className="text-gray-600 text-sm py-8 text-center">
            Agent will auto-evaluate with student variants. Click Re-Evaluate if needed.
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PHASE 4: JSON GENERATION
// ═══════════════════════════════════════════════════════════
function Phase4Json({ project, updatePipeline }) {
  const { questions, pipeline } = project;
  const jsonMeta = pipeline.jsonMeta || [];

  const updateMeta = (idx, patch) => {
    updatePipeline((p) => {
      const meta = [...(p.jsonMeta || [])];
      meta[idx] = { ...(meta[idx] || {}), ...patch };
      return { ...p, jsonMeta: meta };
    });
  };

  const handleGenerate = () => {
    const output = questions.map((q, idx) => {
      const meta = jsonMeta[idx] || {};
      let testCases = [];
      if (q.testCasesJson?.trim()) {
        try {
          const parsed = JSON.parse(q.testCasesJson);
          const arr = parsed.test_cases || parsed;
          testCases = (Array.isArray(arr) ? arr : []).map((tc) => ({
            id: crypto.randomUUID(),
            display_text: tc.name || tc.display_text,
            weightage: parseInt(tc.weight) || 5,
            metadata: null,
            test_case_enum: tc.test_case_enum,
          }));
        } catch {}
      }

      // Try to extract title from MD heading
      const headingMatch = q.questionMd?.match(/^#+\s+(.+)/m);
      const autoTitle = headingMatch ? headingMatch[1].trim() : `Question ${idx + 1}`;
      const title = meta.title?.trim() || autoTitle;
      const score = Number(testCases.reduce((sum, tc) => sum + (tc.weightage || 5), 0));

      return {
        question_type: 'IDE_BASED_CODING',
        question: {
          question_id: crypto.randomUUID(),
          content: q.questionMd,
          short_text: title,
          multimedia: [],
          language: meta.language || 'ENGLISH',
          content_type: 'MARKDOWN',
          difficulty: meta.toughness || 'EASY',
          default_tag_names: [],
          concept_tag_names: [],
          metadata: null,
        },
        question_asked_by_companies_info: [],
        ide_session_id: crypto.randomUUID(),
        test_cases: testCases,
        score,
        solutions: [
          {
            order: 1,
            title: { content: meta.solutionTitle || 'Solution', content_type: 'MARKDOWN' },
            description: { content: meta.solutionDescription || `An approach to build the ${title}`, content_type: 'MARKDOWN' },
            ide_session_id: crypto.randomUUID(),
          },
        ],
        hints: [],
      };
    });

    updatePipeline({ generatedJson: JSON.stringify(output, null, 2) });
    toast.success(`Generated JSON with ${output.length} questions!`);
  };

  const handleAccept = () => {
    updatePipeline((p) => ({
      ...p,
      currentPhase: 5,
      phaseStatus: p.phaseStatus.map((s, i) => (i === 4 ? 'completed' : i === 5 ? 'in_progress' : s)),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Per-question metadata */}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const meta = jsonMeta[idx] || {};
          return (
            <div key={idx} className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Question {idx + 1}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Title / Short Text</label>
                  <input
                    value={meta.title || ''}
                    onChange={(e) => updateMeta(idx, { title: e.target.value })}
                    placeholder="Auto-extracted from MD heading"
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Question Key</label>
                  <input
                    value={meta.questionKey || ''}
                    onChange={(e) => updateMeta(idx, { questionKey: e.target.value })}
                    placeholder="Defaults to title"
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Toughness</label>
                  <select
                    value={meta.toughness || 'EASY'}
                    onChange={(e) => updateMeta(idx, { toughness: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Language</label>
                  <select
                    value={meta.language || 'ENGLISH'}
                    onChange={(e) => updateMeta(idx, { language: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="ENGLISH">ENGLISH</option>
                    <option value="HINDI">HINDI</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Solution Title</label>
                  <input
                    value={meta.solutionTitle || ''}
                    onChange={(e) => updateMeta(idx, { solutionTitle: e.target.value })}
                    placeholder="Solution"
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Solution Description</label>
                  <input
                    value={meta.solutionDescription || ''}
                    onChange={(e) => updateMeta(idx, { solutionDescription: e.target.value })}
                    placeholder="Brief description"
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Sparkles size={16} />
          Generate JSON
        </button>
      </div>

      {pipeline.generatedJson && (
        <div className="bg-dark-800 border border-dark-600 rounded-lg">
          <div className="flex items-center justify-between p-3 border-b border-dark-600">
            <span className="text-sm font-medium text-gray-300">Generated JSON</span>
            <CopyButton text={pipeline.generatedJson} />
          </div>
          <div className="p-4 max-h-64 overflow-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre">{pipeline.generatedJson}</pre>
          </div>
          <div className="p-3 border-t border-dark-600 flex justify-end">
            <button
              onClick={handleAccept}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <CheckCircle2 size={14} />
              Accept & Proceed to ZIP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PHASE 5: ZIP GENERATION
// ═══════════════════════════════════════════════════════════
function Phase5Zip({ project, updatePipeline }) {
  const { questions, pipeline } = project;
  const [resourceId, setResourceId] = useState('');
  const [zipTitle, setZipTitle] = useState('');

  const handleDownloadPrefilled = async (idx) => {
    const q = questions[idx];
    const zip = new JSZip();
    zip.file('app.py', q.prefilledCode || '');
    zip.file('.env', q.prefillEnv || '');
    if (q.prefillReq?.trim()) zip.file('requirements.txt', q.prefillReq);

    // Auto-generate .gitignore from .env
    const gitignore = q.prefillGitignore?.trim() || '';
    if (gitignore) zip.file('.gitignore', gitignore);

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${q.prefillName || 'PrefillCode'}.zip`);
    toast.success(`Prefilled ZIP for Q${idx + 1} downloaded!`);
  };

  const handleDownloadSolution = async (idx) => {
    const q = questions[idx];
    const zip = new JSZip();
    zip.file('app.py', q.solutionCode || '');
    zip.file('.env', q.solutionEnv || q.prefillEnv || '');
    if (q.solutionReq?.trim() || q.prefillReq?.trim()) zip.file('requirements.txt', q.solutionReq || q.prefillReq);

    const gitignore = q.solutionGitignore?.trim() || '';
    if (gitignore) zip.file('.gitignore', gitignore);

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'Solution.zip');
    toast.success(`Solution ZIP for Q${idx + 1} downloaded!`);
  };

  const handleDownloadJsonZip = async () => {
    if (!resourceId.trim()) { toast.error('Resource ID required'); return; }
    if (!zipTitle.trim()) { toast.error('ZIP Title required'); return; }
    if (!pipeline.generatedJson) { toast.error('No JSON generated'); return; }

    const zip = new JSZip();
    zip.file('ide_based_coding_questions.json', pipeline.generatedJson);

    // Build question_sets_questions.json
    const parsed = JSON.parse(pipeline.generatedJson);
    const questionSetsQuestions = parsed.map((q, idx) => ({
      question_set_id: resourceId.trim(),
      question_id: q.question.question_id,
      order: idx + 2,
    }));
    zip.file('question_sets_questions.json', JSON.stringify(questionSetsQuestions, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${zipTitle.trim()}.zip`);
    toast.success('JSON ZIP downloaded!');
  };

  const handleComplete = () => {
    updatePipeline((p) => ({
      ...p,
      phaseStatus: p.phaseStatus.map((s, i) => (i === 5 ? 'completed' : s)),
    }));
    toast.success('Pipeline complete!');
  };

  return (
    <div className="space-y-4">
      {/* Per-question ZIPs */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-dark-800 border border-dark-600 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Question {idx + 1} — Code ZIPs</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleDownloadPrefilled(idx)}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
              >
                <Download size={14} />
                Prefilled ZIP
              </button>
              <button
                onClick={() => handleDownloadSolution(idx)}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
              >
                <Download size={14} />
                Solution ZIP
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* JSON ZIP */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Question JSON ZIP</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Resource ID</label>
            <input
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              placeholder="Enter UUID for JSON filename"
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">ZIP Title</label>
            <input
              value={zipTitle}
              onChange={(e) => setZipTitle(e.target.value)}
              placeholder="Enter name for ZIP file"
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
            />
          </div>
        </div>
        <button
          onClick={handleDownloadJsonZip}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Download size={14} />
          Download JSON ZIP
        </button>
      </div>

      {/* External links */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Upload to Platform</h3>
        <div className="flex gap-3">
          <a
            href="https://nkb-backend-ccbp-beta.earlywave.in/admin/nkb_load_data/uploadfile/add/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <ExternalLink size={14} />
            Open Upload Page
          </a>
          <a
            href="https://nkb-backend-ccbp-beta.earlywave.in/admin/nkb_load_data/contentloading/add/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm font-medium text-gray-300 transition-colors"
          >
            <ExternalLink size={14} />
            Open Content Loading Page
          </a>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleComplete}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold text-white transition-colors"
        >
          <CheckCircle2 size={16} />
          Pipeline Complete
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN PIPELINE COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AgentPipeline() {
  const { activeProject, updateQuestion, updatePipeline, setPipelineMode, setPipelinePhase } = useAppState();

  if (!activeProject) return null;

  const { pipeline } = activeProject;
  const currentPhase = pipeline.currentPhase;

  const handleSkipToManual = () => {
    setPipelineMode('manual');
    toast.success('Switched to Manual Mode — all data preserved');
  };

  const handleBack = () => {
    if (currentPhase > 0) {
      setPipelinePhase(currentPhase - 1);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-dark-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-dark-800 border-b border-dark-600">
        <div>
          <span className="text-sm font-semibold text-white">
            Phase {currentPhase} of 5 — {PHASE_LABELS[currentPhase]}
          </span>
          <span className="text-xs text-gray-500 ml-3">{activeProject.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {currentPhase > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          )}
          <button
            onClick={handleSkipToManual}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-gray-300 transition-colors"
          >
            Skip to Manual
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-dark-700 h-1">
        <div
          className="h-1 bg-accent-blue transition-all"
          style={{ width: `${((currentPhase + 1) / 6) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <StepIndicator currentPhase={currentPhase} phaseStatus={pipeline.phaseStatus} />
        <div className="flex-1 overflow-auto p-6">
          {currentPhase === 0 && (
            <Phase0Setup
              project={activeProject}
              updateQuestion={updateQuestion}
              updatePipeline={updatePipeline}
              setPipelinePhase={setPipelinePhase}
            />
          )}
          {currentPhase === 1 && (
            <Phase1QuestionMd
              project={activeProject}
              updateQuestion={updateQuestion}
              updatePipeline={updatePipeline}
            />
          )}
          {currentPhase === 2 && (
            <Phase2TestCases
              project={activeProject}
              updateQuestion={updateQuestion}
              updatePipeline={updatePipeline}
            />
          )}
          {currentPhase === 3 && (
            <Phase3Evaluation
              project={activeProject}
              updateQuestion={updateQuestion}
              updatePipeline={updatePipeline}
            />
          )}
          {currentPhase === 4 && (
            <Phase4Json
              project={activeProject}
              updatePipeline={updatePipeline}
            />
          )}
          {currentPhase === 5 && (
            <Phase5Zip
              project={activeProject}
              updatePipeline={updatePipeline}
            />
          )}
        </div>
      </div>
    </div>
  );
}
