import { useState } from 'react';
import { Download, Braces, ChevronDown, ChevronRight, Import } from 'lucide-react';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import CopyButton from '../components/CopyButton';
import { useAppState } from '../context/AppStateContext';

const emptyQuestion = () => ({
  questionMarkdown: '',
  testCasesJson: '',
  title: '',
  questionKey: '',
  toughness: 'EASY',
  language: 'ENGLISH',
  solutionTitle: '',
  solutionDescription: '',
});

export default function JsonGenerator() {
  const { jsonState, setJsonState, questionState, testCaseState } = useAppState();
  const { numberOfQuestions, questions, generatedJson } = jsonState;
  const [expandedSections, setExpandedSections] = useState({ 0: true });
  const [numInput, setNumInput] = useState(numberOfQuestions);

  const update = (patch) => setJsonState((s) => ({ ...s, ...patch }));

  const updateQuestion = (index, patch) => {
    setJsonState((s) => {
      const updated = [...s.questions];
      updated[index] = { ...updated[index], ...patch };
      return { ...s, questions: updated };
    });
  };

  const handleSetCount = () => {
    const newCount = Math.max(1, Math.min(20, numInput));
    if (newCount < questions.length) {
      const removing = questions.length - newCount;
      if (!confirm(`This will remove ${removing} question${removing > 1 ? 's' : ''} from the end. Continue?`)) {
        setNumInput(numberOfQuestions);
        return;
      }
    }

    setJsonState((s) => {
      const current = [...s.questions];
      if (newCount > current.length) {
        for (let i = current.length; i < newCount; i++) {
          current.push(emptyQuestion());
        }
      } else {
        current.length = newCount;
      }
      return { ...s, numberOfQuestions: newCount, questions: current };
    });
  };

  const toggleSection = (idx) => {
    setExpandedSections((s) => ({ ...s, [idx]: !s[idx] }));
  };

  const handleImportMarkdown = (idx) => {
    if (!questionState.markdown) {
      toast.error('No data available from Question Generator');
      return;
    }
    updateQuestion(idx, { questionMarkdown: questionState.markdown });
    toast.success('Imported question markdown');
  };

  const handleImportTestCases = (idx) => {
    if (!testCaseState.testCases) {
      toast.error('No data available from Test Case Generator');
      return;
    }
    updateQuestion(idx, { testCasesJson: JSON.stringify(testCaseState.testCases, null, 2) });
    toast.success('Imported test cases');
  };

  const getTestCaseCount = (tcJson) => {
    if (!tcJson.trim()) return 0;
    try {
      const parsed = JSON.parse(tcJson);
      const arr = parsed.test_cases || parsed;
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };

  const isQuestionComplete = (q) => {
    return q.questionMarkdown.trim() && q.title.trim();
  };

  const handleGenerate = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionMarkdown.trim()) {
        toast.error(`Question ${i + 1} is missing question markdown`);
        return;
      }
      if (!q.title.trim()) {
        toast.error(`Question ${i + 1} is missing a title`);
        return;
      }
    }

    const output = questions.map((q) => {
      let testCases = [];
      if (q.testCasesJson.trim()) {
        try {
          const parsed = JSON.parse(q.testCasesJson);
          const arr = parsed.test_cases || parsed;
          testCases = (Array.isArray(arr) ? arr : []).map((tc) => ({
            display_text: tc.name || tc.display_text,
            weightage: parseFloat(tc.weight) || 5.0,
            test_case_enum: tc.test_case_enum,
          }));
        } catch {
          // skip invalid JSON
        }
      }

      return {
        question_id: crypto.randomUUID(),
        ide_session_id: crypto.randomUUID(),
        short_text: q.title,
        question_key: q.questionKey || q.title,
        question_text: q.questionMarkdown,
        content_type: 'MARKDOWN',
        toughness: q.toughness || 'EASY',
        language: q.language || 'ENGLISH',
        question_type: 'IDE_BASED_CODING',
        question_asked_by_companies_info: [],
        question_format: 'CODING_PRACTICE',
        test_cases: testCases,
        multimedia: [],
        solutions: [
          {
            order: 1,
            title: {
              content: q.solutionTitle || 'Solution',
              content_type: 'MARKDOWN',
            },
            description: {
              content: q.solutionDescription || `An approach to build the ${q.title}`,
              content_type: 'MARKDOWN',
            },
            ide_session_id: crypto.randomUUID(),
          },
        ],
        hints: [],
      };
    });

    update({ generatedJson: JSON.stringify(output, null, 2) });
    toast.success(`Generated JSON with ${output.length} question${output.length > 1 ? 's' : ''}!`);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">JSON Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Assemble the final question JSON config (multiple questions)</p>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Inputs */}
        <div className="space-y-4 overflow-auto">
          {/* Step 1: Number of Questions */}
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-300 whitespace-nowrap">How many questions?</label>
              <input
                type="number"
                min={1}
                max={20}
                value={numInput}
                onChange={(e) => setNumInput(parseInt(e.target.value) || 1)}
                className="w-20 bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
              />
              <button
                onClick={handleSetCount}
                className="px-4 py-2 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Set
              </button>
            </div>
          </div>

          {/* Step 2: Per-Question Accordion Sections */}
          {questions.map((q, idx) => {
            const isExpanded = expandedSections[idx];
            const tcCount = getTestCaseCount(q.testCasesJson);
            const complete = isQuestionComplete(q);

            return (
              <div
                key={idx}
                className={`bg-dark-800 border rounded-lg transition-colors ${
                  complete ? 'border-green-500/40' : 'border-dark-600'
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleSection(idx)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400" />
                    )}
                    <span className="text-sm font-semibold text-white">
                      Question {idx + 1}
                    </span>
                    {q.title && (
                      <span className="text-sm text-gray-400">— {q.title}</span>
                    )}
                  </div>
                  {tcCount > 0 && (
                    <span className="text-xs bg-dark-700 text-gray-400 px-2 py-0.5 rounded-full">
                      {tcCount} test case{tcCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-dark-600 pt-3">
                    {/* Question Markdown */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400">Question Markdown</label>
                        <button
                          onClick={() => handleImportMarkdown(idx)}
                          className="flex items-center gap-1 px-2 py-1 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded text-xs text-gray-300 transition-colors"
                        >
                          <Import size={10} />
                          Import from Question Generator
                        </button>
                      </div>
                      <CodeEditor
                        value={q.questionMarkdown}
                        onChange={(v) => updateQuestion(idx, { questionMarkdown: v })}
                        placeholder="Paste question markdown here..."
                        height="h-32"
                      />
                    </div>

                    {/* Test Cases JSON */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400">Test Cases JSON</label>
                        <button
                          onClick={() => handleImportTestCases(idx)}
                          className="flex items-center gap-1 px-2 py-1 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded text-xs text-gray-300 transition-colors"
                        >
                          <Import size={10} />
                          Import from Test Case Generator
                        </button>
                      </div>
                      <CodeEditor
                        value={q.testCasesJson}
                        onChange={(v) => updateQuestion(idx, { testCasesJson: v })}
                        placeholder="Paste test cases JSON here..."
                        height="h-32"
                      />
                    </div>

                    {/* Config fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Title / Short Text</label>
                        <input
                          value={q.title}
                          onChange={(e) => updateQuestion(idx, { title: e.target.value })}
                          placeholder="e.g. AI Chat Bot"
                          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Question Key</label>
                        <input
                          value={q.questionKey}
                          onChange={(e) => updateQuestion(idx, { questionKey: e.target.value })}
                          placeholder="Defaults to title"
                          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Toughness</label>
                        <select
                          value={q.toughness}
                          onChange={(e) => updateQuestion(idx, { toughness: e.target.value })}
                          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                        >
                          <option value="EASY">EASY</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HARD">HARD</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Language</label>
                        <select
                          value={q.language}
                          onChange={(e) => updateQuestion(idx, { language: e.target.value })}
                          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                        >
                          <option value="ENGLISH">ENGLISH</option>
                          <option value="HINDI">HINDI</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Solution Title</label>
                        <input
                          value={q.solutionTitle}
                          onChange={(e) => updateQuestion(idx, { solutionTitle: e.target.value })}
                          placeholder="e.g. Solution Approach"
                          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Solution Description</label>
                        <input
                          value={q.solutionDescription}
                          onChange={(e) => updateQuestion(idx, { solutionDescription: e.target.value })}
                          placeholder="Brief description"
                          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <Braces size={16} />
              Generate JSON
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col min-h-0 bg-dark-800 border border-dark-600 rounded-lg">
          <div className="flex items-center justify-between p-3 border-b border-dark-600">
            <span className="text-sm font-medium text-gray-300">Output JSON</span>
            {generatedJson && (
              <div className="flex gap-2">
                <CopyButton text={generatedJson} />
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  <Download size={14} />
                  Download JSON
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {generatedJson ? (
              <textarea
                value={generatedJson}
                onChange={(e) => update({ generatedJson: e.target.value })}
                className="w-full h-full bg-transparent font-mono text-sm text-gray-300 resize-none outline-none"
              />
            ) : (
              <p className="text-gray-600 text-sm">Generated JSON will appear here...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
