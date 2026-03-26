import { NavLink, useNavigate } from 'react-router-dom';
import { FileText, TestTube, ShieldCheck, Braces, Archive, FileSpreadsheet, LayoutDashboard, LogOut, Zap } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/question', icon: FileText, label: 'Question Generator' },
  { to: '/testcases', icon: TestTube, label: 'Test Case Generator' },
  { to: '/evaluator', icon: ShieldCheck, label: 'Test Case Evaluator' },
  { to: '/json', icon: Braces, label: 'JSON Generator' },
  { to: '/zip', icon: Archive, label: 'ZIP Generator' },
  { to: '/sheet', icon: FileSpreadsheet, label: 'Sheet Generator' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { activeProject, closeProject, setPipelineMode } = useAppState();

  const handleClose = () => {
    closeProject();
    navigate('/');
  };

  const handleSwitchToPipeline = () => {
    setPipelineMode('pipeline');
  };

  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
      <div className="p-5 border-b border-dark-600">
        <h1 className="text-lg font-bold text-white tracking-tight">
          NxtWave Content Tool
        </h1>
        <p className="text-xs text-gray-500 mt-1">CCBP Curriculum Builder</p>
      </div>

      {/* Project Info */}
      {activeProject && (
        <div className="px-4 py-3 border-b border-dark-600">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Project</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">{activeProject.name}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {activeProject.numberOfQuestions} question{activeProject.numberOfQuestions !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Mode Toggle */}
      {activeProject && (
        <div className="px-3 py-3 border-b border-dark-600">
          <button
            onClick={handleSwitchToPipeline}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
          >
            <Zap size={18} />
            Agent Pipeline Mode
          </button>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-dark-600">
        <button
          onClick={handleClose}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-700 transition-colors"
        >
          <LogOut size={18} />
          Close Project
        </button>
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-gray-600">v1.0.0</p>
      </div>
    </aside>
  );
}
