import { useState } from 'react';
import { Download, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import MarkdownPreview from '../components/MarkdownPreview';
import CopyButton from '../components/CopyButton';
import QuestionSelector from '../components/QuestionSelector';
import { generateQuestion } from '../utils/api';
import { useAppState } from '../context/AppStateContext';

export default function QuestionGenerator() {
  const { activeProject, activeQuestion, updateQuestion } = useAppState();
  const [loading, setLoading] = useState(false);

  if (!activeProject || !activeQuestion) return null;

  const { solutionCode, prefilledCode, questionCustomRules: customRules, questionMd: markdown, questionViewMode: viewMode } = activeQuestion;

  // Capture the question index at call time so the result is written to the
  // correct question even if the user switches tabs while generation is in-flight.
  const set = (patch) => {
    const idx = activeProject.activeQuestionIndex;
    updateQuestion(idx, patch);
  };

  const handleGenerate = async () => {
    if (!solutionCode.trim()) {
      toast.error('Please paste your solution code');
      return;
    }
    // Capture index AND data at the moment the user clicks Generate
    const capturedIdx = activeProject.activeQuestionIndex;
    const capturedSolutionCode = solutionCode;
    const capturedPrefilledCode = prefilledCode;
    const capturedCustomRules = customRules;

    setLoading(true);
    try {
      const data = await generateQuestion({
        solutionCode: capturedSolutionCode,
        prefilledCode: capturedPrefilledCode,
        customRules: capturedCustomRules,
      });
      // Write result to the specific question that was active when Generate was clicked
      updateQuestion(capturedIdx, { questionMd: data.markdown });
      toast.success('Question generated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const idx = activeProject.activeQuestionIndex + 1;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question_${idx}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Question Generator</h2>
          <p className="text-sm text-gray-500 mt-0.5">Generate question markdown from solution code</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Generating...' : 'Generate Question'}
        </button>
      </div>

      {/* Question Selector */}
      <QuestionSelector />

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Left: Inputs */}
        <div className="flex flex-col min-h-0 gap-3 overflow-auto">
          <CodeEditor
            value={solutionCode}
            onChange={(v) => set({ solutionCode: v })}
            placeholder="Paste your Python/JS solution code here..."
            label="Solution Code"
            height="h-64"
          />
          <CodeEditor
            value={prefilledCode}
            onChange={(v) => set({ prefilledCode: v })}
            placeholder="Paste prefilled/starter code here (optional)..."
            label="Prefilled Code"
            height="h-48"
          />
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Custom Rules</label>
            <textarea
              value={customRules}
              onChange={(e) => set({ questionCustomRules: e.target.value })}
              placeholder="Add any custom rules for question generation (optional)..."
              rows={4}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Right: Generated Output */}
        <div className="flex flex-col min-h-0 bg-dark-800 border border-dark-600 rounded-lg">
          <div className="flex items-center justify-between p-3 border-b border-dark-600">
            <div className="flex gap-1">
              <button
                onClick={() => set({ questionViewMode: 'preview' })}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'preview' ? 'bg-accent-blue/20 text-accent-blue' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => set({ questionViewMode: 'edit' })}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'edit' ? 'bg-accent-blue/20 text-accent-blue' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Edit
              </button>
            </div>
            {markdown && (
              <div className="flex gap-2">
                <CopyButton text={markdown} />
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  <Download size={14} />
                  Download .md
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {!markdown && !loading && (
              <p className="text-gray-600 text-sm">Generated question will appear here...</p>
            )}
            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={32} className="animate-spin text-accent-blue" />
              </div>
            )}
            {markdown && viewMode === 'preview' && <MarkdownPreview content={markdown} />}
            {markdown && viewMode === 'edit' && (
              <textarea
                value={markdown}
                onChange={(e) => set({ questionMd: e.target.value })}
                className="w-full h-full bg-transparent font-mono text-sm text-gray-300 resize-none outline-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
