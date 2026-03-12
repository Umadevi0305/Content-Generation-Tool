import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import QuestionGenerator from './pages/QuestionGenerator';
import TestCaseGenerator from './pages/TestCaseGenerator';
import JsonGenerator from './pages/JsonGenerator';
import TestCaseEvaluator from './pages/TestCaseEvaluator';
import ZipGenerator from './pages/ZipGenerator';
import { AppStateProvider } from './context/AppStateContext';

export default function App() {
  return (
    <AppStateProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/question" replace />} />
          <Route path="/question" element={<QuestionGenerator />} />
          <Route path="/testcases" element={<TestCaseGenerator />} />
          <Route path="/evaluator" element={<TestCaseEvaluator />} />
          <Route path="/json" element={<JsonGenerator />} />
          <Route path="/zip" element={<ZipGenerator />} />
        </Routes>
      </Layout>
    </AppStateProvider>
  );
}
