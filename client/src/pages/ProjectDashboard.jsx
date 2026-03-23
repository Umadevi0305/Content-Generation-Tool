import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Plus, FolderOpen, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppState } from '../context/AppStateContext';

function StatusBadge({ done, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {done ? (
        <CheckCircle2 size={14} className="text-green-400" />
      ) : (
        <XCircle size={14} className="text-gray-600" />
      )}
      <span className={`text-xs ${done ? 'text-green-400' : 'text-gray-600'}`}>{label}</span>
    </div>
  );
}

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const { activeProject, addQuestion, setActiveQuestionIndex } = useAppState();

  if (!activeProject) return null;

  const { name, questions } = activeProject;

  const handleGoToQuestion = (idx, page) => {
    setActiveQuestionIndex(idx);
    navigate(page);
  };

  const handleAddQuestion = () => {
    addQuestion();
    toast.success(`Question ${questions.length + 1} added!`);
  };

  const completedCount = (field) => questions.filter((q) => q[field]?.trim()).length;

  return (
    <div className="h-full flex flex-col gap-5 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
            <FolderOpen size={20} className="text-accent-blue" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-sm text-gray-500">
              {questions.length} question{questions.length !== 1 ? 's' : ''} &middot;
              {' '}{completedCount('questionMd')} MD &middot;
              {' '}{completedCount('testCasesJson')} test cases &middot;
              {' '}{completedCount('solutionCode')} solutions &middot;
              {' '}{completedCount('prefilledCode')} prefilled
            </p>
          </div>
        </div>
        <button
          onClick={handleAddQuestion}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Plus size={16} />
          Add Question
        </button>
      </div>

      {/* Question Cards */}
      <div className="grid grid-cols-1 gap-3">
        {questions.map((q, idx) => {
          const hasQuestion = !!q.questionMd?.trim();
          const hasTestCases = !!q.testCasesJson?.trim();
          const hasPrefilled = !!q.prefilledCode?.trim();
          const hasSolution = !!q.solutionCode?.trim();
          const total = [hasQuestion, hasTestCases, hasPrefilled, hasSolution].filter(Boolean).length;

          return (
            <div
              key={idx}
              className="bg-dark-800 border border-dark-600 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                  total === 4
                    ? 'bg-green-500/10 text-green-400'
                    : total > 0
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-dark-700 text-gray-500'
                }`}>
                  Q{idx + 1}
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge done={hasQuestion} label="Question MD" />
                  <StatusBadge done={hasTestCases} label="Test Cases" />
                  <StatusBadge done={hasPrefilled} label="Prefilled" />
                  <StatusBadge done={hasSolution} label="Solution" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGoToQuestion(idx, '/question')}
                  className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                >
                  Question
                </button>
                <button
                  onClick={() => handleGoToQuestion(idx, '/testcases')}
                  className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                >
                  Test Cases
                </button>
                <button
                  onClick={() => handleGoToQuestion(idx, '/zip')}
                  className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                >
                  ZIP
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
