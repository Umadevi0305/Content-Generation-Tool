import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Play, Trash2, Clock, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppState } from '../context/AppStateContext';

export default function ProjectSetup() {
  const navigate = useNavigate();
  const { projects, createProject, resumeProject, deleteProject } = useAppState();
  const [projectName, setProjectName] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState(3);

  const handleStart = () => {
    const name = projectName.trim();
    if (!name) {
      toast.error('Please enter a project name');
      return;
    }
    if (numberOfQuestions < 1 || numberOfQuestions > 20) {
      toast.error('Number of questions must be between 1 and 20');
      return;
    }
    createProject(name, numberOfQuestions);
    toast.success(`Project "${name}" created!`);
    navigate('/dashboard');
  };

  const handleResume = (id) => {
    resumeProject(id);
    navigate('/dashboard');
  };

  const handleDelete = (e, id, name) => {
    e.stopPropagation();
    if (confirm(`Delete project "${name}"? This cannot be undone.`)) {
      deleteProject(id);
      toast.success('Project deleted');
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProjectStats = (project) => {
    const total = project.questions.length;
    const withQuestion = project.questions.filter((q) => q.questionMd?.trim()).length;
    const withTestCases = project.questions.filter((q) => q.testCasesJson?.trim()).length;
    return { total, withQuestion, withTestCases };
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            NxtWave Content Tool
          </h1>
          <p className="text-gray-500 mt-2">CCBP Curriculum Builder</p>
        </div>

        {/* New Project Card */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <FolderPlus size={20} className="text-accent-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">New Project</h2>
              <p className="text-xs text-gray-500">Set up a new content generation session</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1.5">Project Name</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder='e.g. "GenAI Session 5 CQ"'
                className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-accent-blue transition-colors placeholder:text-gray-600"
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1.5">Number of Questions</label>
              <input
                type="number"
                min={1}
                max={20}
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-32 bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-accent-blue transition-colors"
              />
              <p className="text-xs text-gray-600 mt-1">Min: 1, Max: 20</p>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-semibold text-white transition-colors"
          >
            <Play size={16} />
            Start Project
          </button>
        </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-400">Recent Projects</h3>
            </div>
            <div className="space-y-2">
              {projects.map((project) => {
                const stats = getProjectStats(project);
                return (
                  <button
                    key={project.id}
                    onClick={() => handleResume(project.id)}
                    className="w-full bg-dark-800 border border-dark-600 hover:border-dark-500 rounded-lg p-4 text-left transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <FolderOpen size={18} className="text-gray-500 group-hover:text-accent-blue transition-colors shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate">
                            {project.name}
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {stats.total} question{stats.total !== 1 ? 's' : ''} &middot;
                            {' '}{stats.withQuestion} MD &middot; {stats.withTestCases} test cases &middot;
                            {' '}{formatDate(project.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, project.id, project.name)}
                        className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-dark-700 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
