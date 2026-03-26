import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectSetup from './pages/ProjectSetup';
import ProjectDashboard from './pages/ProjectDashboard';
import QuestionGenerator from './pages/QuestionGenerator';
import TestCaseGenerator from './pages/TestCaseGenerator';
import JsonGenerator from './pages/JsonGenerator';
import TestCaseEvaluator from './pages/TestCaseEvaluator';
import ZipGenerator from './pages/ZipGenerator';
import SheetGenerator from './pages/SheetGenerator';
import AgentPipeline from './pages/AgentPipeline';
import { AppStateProvider, useAppState } from './context/AppStateContext';

function AppRoutes() {
  const { activeProject } = useAppState();

  // If no active project, only allow the setup page
  if (!activeProject) {
    return (
      <Routes>
        <Route path="/" element={<ProjectSetup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Pipeline mode — show full-screen wizard
  if (activeProject.pipeline?.mode === 'pipeline') {
    return <AgentPipeline />;
  }

  // Manual mode — show layout with sidebar
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProjectDashboard />} />
        <Route path="/question" element={<QuestionGenerator />} />
        <Route path="/testcases" element={<TestCaseGenerator />} />
        <Route path="/evaluator" element={<TestCaseEvaluator />} />
        <Route path="/json" element={<JsonGenerator />} />
        <Route path="/zip" element={<ZipGenerator />} />
        <Route path="/sheet" element={<SheetGenerator />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  );
}
