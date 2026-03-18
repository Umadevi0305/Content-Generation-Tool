import { createContext, useContext, useState } from 'react';

const AppStateContext = createContext();

export function AppStateProvider({ children }) {
  // QuestionGenerator state
  const [questionState, setQuestionState] = useState({
    solutionCode: '',
    prefilledCode: '',
    customRules: '',
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

  // Response Processing state (JSON Generator sub-tab 3)
  const [responseProcessingState, setResponseProcessingState] = useState({
    responseFile: null,
    extractedQuestions: [],
    perQuestionTestCases: {},  // keyed by question_id → { pasted: string }
    updatedTestCases: {},      // keyed by question_id → final merged test cases
  });

  // SessionDisplayIdGenerator state
  const [sessionIdState, setSessionIdState] = useState({
    count: 1,
    prefix: 'GENAI',
    randomLength: 5,
    ids: [],
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
        responseProcessingState, setResponseProcessingState,
        sessionIdState, setSessionIdState,
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
