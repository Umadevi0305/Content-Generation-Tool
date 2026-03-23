import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppStateContext = createContext();

const STORAGE_KEY = 'nxtwave_projects';
const ACTIVE_PROJECT_KEY = 'nxtwave_active_project';

function createPipelinePerQuestion(count) {
  return Array.from({ length: count }, () => ({
    questionMdAccepted: false,
    testCasesAccepted: false,
    evaluationAccepted: false,
  }));
}

function createPipelineState(numberOfQuestions) {
  return {
    mode: 'manual',           // 'manual' | 'pipeline'
    currentPhase: 0,          // 0-4
    phaseStatus: ['not_started', 'not_started', 'not_started', 'not_started', 'not_started'],
    perQuestion: createPipelinePerQuestion(numberOfQuestions),
    // Phase 4 editable metadata per question
    jsonMeta: Array.from({ length: numberOfQuestions }, () => ({
      title: '',
      questionKey: '',
      toughness: 'EASY',
      language: 'ENGLISH',
      solutionTitle: '',
      solutionDescription: '',
    })),
    generatedJson: '',
  };
}

function createEmptyQuestion() {
  return {
    questionMd: '',
    solutionCode: '',
    prefilledCode: '',
    testCasesJson: '',
    evaluationResult: null,
    // Per-question custom rules (used by question generator & test case generator)
    questionCustomRules: '',
    testCaseCustomRules: '',
    // Per-question view mode for question generator
    questionViewMode: 'preview',
    // Per-question number of test cases setting
    numberOfTestCases: 8,
    // Per-question evaluator student code
    studentCode: '',
    // Per-question zip state
    prefillName: 'PrefillCode',
    prefillEnv: '',
    prefillReq: '',
    solutionEnv: '',
    solutionReq: '',
    // Gitignore content for ZIP sections
    prefillGitignore: '',
    solutionGitignore: '',
    // Auto-evaluate history
    autoEvaluateHistory: [],
  };
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // storage full — silently fail
  }
}

function loadActiveProjectId() {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY) || null;
  } catch {
    return null;
  }
}

function saveActiveProjectId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch {
    // ignore
  }
}

export function AppStateProvider({ children }) {
  // ---- Project state ----
  const [projects, setProjects] = useState(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState(() => loadActiveProjectId());

  // Persist projects to localStorage on change
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  const rawActiveProject = projects.find((p) => p.id === activeProjectId) || null;
  // Ensure pipeline state exists (backward compat for older projects)
  const activeProject = rawActiveProject
    ? {
        ...rawActiveProject,
        pipeline: rawActiveProject.pipeline || createPipelineState(rawActiveProject.numberOfQuestions),
      }
    : null;

  const updateActiveProject = useCallback(
    (updater) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== activeProjectId) return p;
          const updated = typeof updater === 'function' ? updater(p) : { ...p, ...updater };
          return { ...updated, updatedAt: Date.now() };
        })
      );
    },
    [activeProjectId]
  );

  // Create a new project
  const createProject = useCallback((name, numberOfQuestions) => {
    const id = crypto.randomUUID();
    const project = {
      id,
      name,
      numberOfQuestions,
      activeQuestionIndex: 0,
      questions: Array.from({ length: numberOfQuestions }, () => createEmptyQuestion()),
      pipeline: createPipelineState(numberOfQuestions),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [project, ...prev]);
    setActiveProjectId(id);
    return id;
  }, []);

  // Resume an existing project
  const resumeProject = useCallback((id) => {
    setActiveProjectId(id);
  }, []);

  // Close project (go back to landing)
  const closeProject = useCallback(() => {
    setActiveProjectId(null);
  }, []);

  // Delete a project
  const deleteProject = useCallback(
    (id) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
    },
    [activeProjectId]
  );

  // Set active question index
  const setActiveQuestionIndex = useCallback(
    (index) => {
      updateActiveProject((p) => ({ ...p, activeQuestionIndex: index }));
    },
    [updateActiveProject]
  );

  // Update a specific question's data
  const updateQuestion = useCallback(
    (index, patch) => {
      updateActiveProject((p) => {
        const questions = [...p.questions];
        questions[index] = { ...questions[index], ...patch };
        return { ...p, questions };
      });
    },
    [updateActiveProject]
  );

  // Update the currently active question
  const updateActiveQuestion = useCallback(
    (patch) => {
      updateActiveProject((p) => {
        const questions = [...p.questions];
        const idx = p.activeQuestionIndex;
        questions[idx] = { ...questions[idx], ...patch };
        return { ...p, questions };
      });
    },
    [updateActiveProject]
  );

  // Add a question to the project
  const addQuestion = useCallback(() => {
    updateActiveProject((p) => ({
      ...p,
      numberOfQuestions: p.numberOfQuestions + 1,
      questions: [...p.questions, createEmptyQuestion()],
    }));
  }, [updateActiveProject]);

  // Pipeline helpers
  const setPipelineMode = useCallback(
    (mode) => {
      updateActiveProject((p) => {
        const pipeline = p.pipeline || createPipelineState(p.numberOfQuestions);
        return { ...p, pipeline: { ...pipeline, mode } };
      });
    },
    [updateActiveProject]
  );

  const setPipelinePhase = useCallback(
    (phase) => {
      updateActiveProject((p) => {
        const pipeline = p.pipeline || createPipelineState(p.numberOfQuestions);
        return { ...p, pipeline: { ...pipeline, currentPhase: phase } };
      });
    },
    [updateActiveProject]
  );

  const updatePipeline = useCallback(
    (patch) => {
      updateActiveProject((p) => {
        const pipeline = p.pipeline || createPipelineState(p.numberOfQuestions);
        const updated = typeof patch === 'function' ? patch(pipeline) : { ...pipeline, ...patch };
        return { ...p, pipeline: updated };
      });
    },
    [updateActiveProject]
  );

  // Get the active question data
  const activeQuestion = activeProject
    ? activeProject.questions[activeProject.activeQuestionIndex] || null
    : null;

  // ---- Legacy page-level state (kept for pages that need local UI state) ----

  // JsonGenerator state (multi-question assembly — separate from project questions)
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

  // Response Processing state (JSON Generator sub-tab 3)
  const [responseProcessingState, setResponseProcessingState] = useState({
    responseFile: null,
    extractedQuestions: [],
    perQuestionTestCases: {},
    updatedTestCases: {},
  });

  // SessionDisplayIdGenerator state
  const [sessionIdState, setSessionIdState] = useState({
    count: 1,
    prefix: 'GENAI',
    randomLength: 5,
    ids: [],
  });

  return (
    <AppStateContext.Provider
      value={{
        // Project system
        projects,
        activeProject,
        activeProjectId,
        activeQuestion,
        createProject,
        resumeProject,
        closeProject,
        deleteProject,
        updateActiveProject,
        setActiveQuestionIndex,
        updateQuestion,
        updateActiveQuestion,
        addQuestion,
        // Pipeline
        setPipelineMode,
        setPipelinePhase,
        updatePipeline,
        // Legacy state (JSON Generator, Session IDs)
        jsonState, setJsonState,
        responseProcessingState, setResponseProcessingState,
        sessionIdState, setSessionIdState,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}
