import { useAppState } from '../context/AppStateContext';

export default function QuestionSelector() {
  const { activeProject, setActiveQuestionIndex } = useAppState();

  if (!activeProject) return null;

  const { questions, activeQuestionIndex } = activeProject;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 mr-1">Question:</span>
      {questions.map((_, idx) => (
        <button
          key={idx}
          onClick={() => setActiveQuestionIndex(idx)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            idx === activeQuestionIndex
              ? 'bg-accent-blue text-white'
              : 'bg-dark-700 text-gray-400 hover:text-gray-200 hover:bg-dark-600'
          }`}
        >
          Q{idx + 1}
        </button>
      ))}
    </div>
  );
}
