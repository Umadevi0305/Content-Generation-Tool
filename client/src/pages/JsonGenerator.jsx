import { useState, useRef } from 'react';
import { Download, Braces, ChevronDown, ChevronRight, Import, ExternalLink, Copy, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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

const SUB_TABS = [
  { key: 'generate', label: 'JSON Generation' },
  { key: 'load', label: 'Load to Platform' },
  { key: 'response', label: 'Response Processing' },
];

export default function JsonGenerator() {
  const { jsonState, setJsonState, questionState, testCaseState, responseProcessingState, setResponseProcessingState } = useAppState();
  const { numberOfQuestions, questions, generatedJson } = jsonState;
  const [activeSubTab, setActiveSubTab] = useState('generate');
  const [expandedSections, setExpandedSections] = useState({ 0: true });
  const [numInput, setNumInput] = useState(numberOfQuestions);

  // Sub-tab 1 state
  const [resourceId, setResourceId] = useState('');
  const [zipTitle, setZipTitle] = useState('');

  // Sub-tab 3 state
  const fileInputRef = useRef(null);

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

  const handleDownloadZip = async () => {
    if (!resourceId.trim()) {
      toast.error('Resource ID is required');
      return;
    }
    if (!zipTitle.trim()) {
      toast.error('ZIP Title is required');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('IDE_BASED_CODING');
    folder.file(`${resourceId.trim()}.json`, generatedJson);

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${zipTitle.trim()}.zip`);
    toast.success('Downloaded ZIP!');
  };

  // --- Sub-tab 3: Response Processing ---

  const buildUpdatedTestCasesForQuestion = (sourceTcs, responseTestCases) => {
    if (!sourceTcs || !Array.isArray(sourceTcs) || sourceTcs.length === 0) return [];
    const responseIdMap = {};
    for (const rtc of responseTestCases) {
      if (rtc.test_case_enum) {
        responseIdMap[rtc.test_case_enum] = rtc.id;
      }
    }
    return sourceTcs
      .filter((tc) => tc.test_case_enum !== 'FINAL_VERDICT')
      .map((tc) => {
        const newId = responseIdMap[tc.test_case_enum] || tc.id;
        const { weight, ...rest } = tc;
        return { ...rest, id: newId, weight };
      });
  };

  const parseTestCasesInput = (text) => {
    if (!text || !text.trim()) return null;
    try {
      const parsed = JSON.parse(text);
      const arr = parsed.test_cases || parsed;
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  };

  const handlePerQuestionTestCaseChange = (questionId, value) => {
    setResponseProcessingState((prev) => {
      const perQ = { ...prev.perQuestionTestCases, [questionId]: { pasted: value } };
      const sourceTcs = parseTestCasesInput(value);
      const eq = prev.extractedQuestions.find((q) => q.question_id === questionId);
      const updatedTcs = { ...prev.updatedTestCases };
      if (sourceTcs && eq) {
        updatedTcs[questionId] = buildUpdatedTestCasesForQuestion(sourceTcs, eq.test_cases);
      } else {
        delete updatedTcs[questionId];
      }
      return { ...prev, perQuestionTestCases: perQ, updatedTestCases: updatedTcs };
    });
  };

  const handleImportTestCasesForQuestion = (questionId) => {
    if (!testCaseState.testCases) {
      toast.error('No data available from Test Case Generator');
      return;
    }
    const text = JSON.stringify(testCaseState.testCases, null, 2);
    handlePerQuestionTestCaseChange(questionId, text);
    toast.success('Imported test cases from Page 2');
  };

  const handleResponseUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zip = await JSZip.loadAsync(file);

      let ideFile = null;
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.endsWith('ide_based_coding_questions.json')) {
          ideFile = zipEntry;
        }
      });

      if (!ideFile) {
        toast.error('ide_based_coding_questions.json not found in ZIP');
        return;
      }

      const content = await ideFile.async('string');
      const parsed = JSON.parse(content);
      let questionsArr;
      if (Array.isArray(parsed)) {
        questionsArr = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        const arrayVal = Object.values(parsed).find((v) => Array.isArray(v));
        questionsArr = arrayVal || [parsed];
      } else {
        questionsArr = [parsed];
      }

      const extractedQuestions = questionsArr.map((q) => ({
        question_id: q.question?.question_id || q.question_id || q.id || '',
        short_text: q.question?.short_text || q.short_text || q.question_key || '',
        ide_session_id: q.ide_session_id || '',
        solution_ide_session_id: q.solutions?.[0]?.ide_session_id || '',
        test_cases: q.test_cases || [],
      }));

      setResponseProcessingState((prev) => ({
        ...prev,
        responseFile: file.name,
        extractedQuestions,
        perQuestionTestCases: {},
        updatedTestCases: {},
      }));

      toast.success(`Extracted ${extractedQuestions.length} question(s) from response`);
    } catch (err) {
      toast.error('Failed to parse response ZIP: ' + err.message);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSingleTestCase = (tc) => {
    const obj = { ...tc };
    delete obj.final_verdict_rule;
    const lines = ['  {{'];
    const keys = Object.keys(obj);
    keys.forEach((key, i) => {
      const val = obj[key];
      const valStr = JSON.stringify(val);
      const comma = i < keys.length - 1 ? ',' : '';
      lines.push(`    "${key}": ${valStr}${comma}`);
    });
    lines.push('  }}');
    return lines.join('\n');
  };

  const buildTestCasesBlock = (testCases) => {
    const items = testCases.map((tc, i) => {
      const formatted = formatSingleTestCase(tc);
      if (i < testCases.length - 1) {
        return formatted.replace(/\}\}$/, '}},');
      }
      return formatted;
    });
    return `test cases: \`\n[\n${items.join('\n')}\n]\n\n\``;
  };

  const handleCopyAll = () => {
    const { extractedQuestions, updatedTestCases } = responseProcessingState;
    const parts = extractedQuestions
      .filter((eq) => updatedTestCases[eq.question_id]?.length > 0)
      .map((eq, i) => {
        const tcs = updatedTestCases[eq.question_id];
        return `Question ${i + 1} — ${eq.short_text}\n\n${buildTestCasesBlock(tcs)}`;
      });

    if (parts.length === 0) {
      toast.error('No updated test cases to copy');
      return;
    }

    navigator.clipboard.writeText(parts.join('\n\n---\n\n'));
    toast.success('Copied all!');
  };

  // --- Render ---

  const renderSubTabGenerate = () => (
    <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
      {/* Left: Inputs */}
      <div className="space-y-4 overflow-auto">
        {/* Number of Questions */}
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

        {/* Per-Question Accordion Sections */}
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

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-dark-600 pt-3">
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

        {/* Download section */}
        {generatedJson && (
          <div className="p-3 border-t border-dark-600 space-y-3">
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
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors w-full justify-center"
            >
              <Download size={14} />
              Download ZIP
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSubTabLoad = () => {
    const contentLoadingJson = JSON.stringify(
      { load_data_type: 'QUESTION_SET', input_dir_path_url: '' },
      null,
      2
    );

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Step 1 */}
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Step 1: Upload JSON</h3>
          <p className="text-xs text-gray-500 mb-4">Upload the generated JSON ZIP file on this page</p>
          <a
            href="https://nkb-backend-ccbp-beta.earlywave.in/admin/nkb_load_data/uploadfile/add/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <ExternalLink size={14} />
            Open Upload Page
          </a>
        </div>

        {/* Step 2 */}
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Step 2: Content Loading</h3>
          <p className="text-xs text-gray-500 mb-4">Open the content loading page and paste this JSON</p>
          <a
            href="https://nkb-backend-ccbp-beta.earlywave.in/admin/nkb_load_data/contentloading/add/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors mb-4"
          >
            <ExternalLink size={14} />
            Open Content Loading Page
          </a>
          <div className="bg-dark-900 border border-dark-600 rounded-lg p-4 relative">
            <pre className="font-mono text-sm text-gray-300 whitespace-pre">{contentLoadingJson}</pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={contentLoadingJson} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSubTabResponse = () => {
    const { extractedQuestions, perQuestionTestCases, updatedTestCases } = responseProcessingState;

    return (
      <div className="space-y-4 overflow-auto">
        {/* Upload Section */}
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Upload response.zip</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors">
              <Upload size={14} />
              Choose ZIP file
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleResponseUpload}
              className="hidden"
            />
            {responseProcessingState.responseFile && (
              <span className="text-sm text-gray-400">{responseProcessingState.responseFile}</span>
            )}
          </label>
        </div>

        {/* Per-question blocks */}
        {extractedQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Extracted Questions ({extractedQuestions.length})
              </h3>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <Copy size={14} />
                Copy All
              </button>
            </div>

            {extractedQuestions.map((eq, i) => {
              const pastedValue = perQuestionTestCases[eq.question_id]?.pasted || '';
              const tcs = updatedTestCases[eq.question_id];

              return (
                <div key={eq.question_id} className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-white">
                    Question {i + 1} — {eq.short_text}
                  </h4>

                  {/* Block 1: Question ID */}
                  <div className="bg-dark-900 border border-dark-600 rounded-lg p-3 relative">
                    <p className="text-xs font-medium text-gray-400 mb-1">Question ID</p>
                    <pre className="font-mono text-sm text-gray-300">{eq.question_id}</pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={eq.question_id} />
                    </div>
                  </div>

                  {/* Block 2: IDE Session IDs */}
                  <div className="bg-dark-900 border border-dark-600 rounded-lg p-3 relative">
                    <p className="text-xs font-medium text-gray-400 mb-1">IDE Session IDs</p>
                    <pre className="font-mono text-sm text-gray-300 whitespace-pre">{`${eq.ide_session_id}\n${eq.solution_ide_session_id}`}</pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={`${eq.ide_session_id}\n${eq.solution_ide_session_id}`} />
                    </div>
                  </div>

                  {/* Block 3: Paste Test Cases (per question) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400">Paste test cases for Question {i + 1}</label>
                      <button
                        onClick={() => handleImportTestCasesForQuestion(eq.question_id)}
                        className="flex items-center gap-1 px-2 py-1 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded text-xs text-gray-300 transition-colors"
                      >
                        <Import size={10} />
                        Import from Test Case Generator
                      </button>
                    </div>
                    <CodeEditor
                      value={pastedValue}
                      onChange={(v) => handlePerQuestionTestCaseChange(eq.question_id, v)}
                      placeholder="Paste test cases JSON here..."
                      height="h-32"
                    />
                  </div>

                  {/* Block 4: Updated Test Cases (auto-generated output) */}
                  {tcs && tcs.length > 0 && (
                    <div className="bg-dark-900 border border-dark-600 rounded-lg p-3 relative">
                      <p className="text-xs font-medium text-gray-400 mb-1">Updated Test Cases</p>
                      <pre className="font-mono text-xs text-gray-300 whitespace-pre overflow-auto max-h-64">
                        {buildTestCasesBlock(tcs)}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <CopyButton text={buildTestCasesBlock(tcs)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">JSON Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Assemble the final question JSON config</p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSubTab === tab.key
                ? 'bg-accent-blue text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 min-h-0">
        {activeSubTab === 'generate' && renderSubTabGenerate()}
        {activeSubTab === 'load' && renderSubTabLoad()}
        {activeSubTab === 'response' && renderSubTabResponse()}
      </div>
    </div>
  );
}
