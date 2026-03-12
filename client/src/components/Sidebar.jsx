import { NavLink } from 'react-router-dom';
import { FileText, TestTube, ShieldCheck, Braces, Archive } from 'lucide-react';

const navItems = [
  { to: '/question', icon: FileText, label: 'Question Generator' },
  { to: '/testcases', icon: TestTube, label: 'Test Case Generator' },
  { to: '/evaluator', icon: ShieldCheck, label: 'Test Case Evaluator' },
  { to: '/json', icon: Braces, label: 'JSON Generator' },
  { to: '/zip', icon: Archive, label: 'ZIP Generator' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
      <div className="p-5 border-b border-dark-600">
        <h1 className="text-lg font-bold text-white tracking-tight">
          NxtWave Content Tool
        </h1>
        <p className="text-xs text-gray-500 mt-1">CCBP Curriculum Builder</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
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
      <div className="p-4 border-t border-dark-600">
        <p className="text-xs text-gray-600">v1.0.0</p>
      </div>
    </aside>
  );
}
