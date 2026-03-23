const API_BASE = '/api';

export async function generateQuestion({ solutionCode, prefilledCode, customRules }) {
  const res = await fetch(`${API_BASE}/question/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solutionCode, prefilledCode, customRules }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate question');
  }
  return res.json();
}

export async function generateTestCases({ solutionCode, prefilledCode, questionMarkdown, numberOfTestCases, customRules }) {
  const res = await fetch(`${API_BASE}/testcases/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solutionCode, prefilledCode, questionMarkdown, numberOfTestCases, customRules }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate test cases');
  }
  return res.json();
}

export async function generateJson(data) {
  const res = await fetch(`${API_BASE}/json/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate JSON');
  }
  return res.json();
}

export async function evaluateTestCases({ questionText, solutionCode, studentCode, testCases }) {
  const res = await fetch(`${API_BASE}/testcases/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionText, solutionCode, studentCode, testCases }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to evaluate test cases');
  }
  return res.json();
}

export async function autoEvaluateTestCases({ questionText, solutionCode, prefilledCode, testCases, numberOfVariants }) {
  const res = await fetch(`${API_BASE}/testcases/auto-evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionText, solutionCode, prefilledCode, testCases, numberOfVariants }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to auto-evaluate');
  }
  return res.json();
}

export async function generateZip(data) {
  const res = await fetch(`${API_BASE}/zip/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate ZIP');
  }
  return res.blob();
}
