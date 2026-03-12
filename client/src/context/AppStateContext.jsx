import { createContext, useContext, useState } from 'react';

const AppStateContext = createContext();

export function AppStateProvider({ children }) {
  // QuestionGenerator state
  const [questionState, setQuestionState] = useState({
    solutionCode: '',
    markdown: '',
    viewMode: 'preview',
  });

  // TestCaseGenerator state
  const [testCaseState, setTestCaseState] = useState({
    solutionCode: '',
    prefilledCode: '',
    questionMarkdown: '',
    numberOfTestCases: 8,
    customRules: '',
    testCases: null,
    activeTab: 'solution',
  });

  // JsonGenerator state (multi-question)
  const [jsonState, setJsonState] = useState({
    numberOfQuestions: 1,
    questions: [
      {
        questionMarkdown: '',
        testCasesJson: '',
        title: '',
        questionKey: '',
        toughness: 'EASY',
        language: 'ENGLISH',
        solutionTitle: '',
        solutionDescription: '',
      },
    ],
    generatedJson: '',
  });

  // TestCaseEvaluator state
  const [evaluatorState, setEvaluatorState] = useState({
    questionText: '',
    solutionCode: '',
    studentCode: '',
    testCasesJson: '',
    evaluationResult: null,
  });

  // ZipGenerator state
  const [zipState, setZipState] = useState({
    prefillName: 'PrefillCode',
    prefillCode: '',
    prefillEnv: '',
    prefillReq: '',
    solutionCode: '',
    solutionEnv: '',
    solutionReq: '',
  });

  return (
    <AppStateContext.Provider
      value={{
        questionState, setQuestionState,
        testCaseState, setTestCaseState,
        jsonState, setJsonState,
        evaluatorState, setEvaluatorState,
        zipState, setZipState,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}
