import fs from 'fs';
import path from 'path';
import { generateWithClaude } from '../lib/claude.js';
import { cors } from '../lib/cors.js';

const testcaseTemplate = fs.readFileSync(
  path.join(process.cwd(), 'server/templates/testcase-format.json'),
  'utf-8'
);

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { solutionCode, prefilledCode, questionMarkdown, numberOfTestCases, customRules } = req.body;

    if (!solutionCode || !solutionCode.trim()) {
      return res.status(400).json({ error: 'Solution code is required' });
    }

    const numTests = numberOfTestCases || 8;

    const systemPrompt = `You are an expert test case generator for NxtWave's CCBP coding curriculum. You generate static code check test cases that verify student submissions match the expected solution structure.

REFERENCE TEST CASE FORMAT (use this EXACT JSON structure and tone):
${testcaseTemplate}

RULES:
- Generate exactly ${numTests} test cases
- Each test case gets a fresh UUID v4 as "id"
- "test_case_enum" should be SCREAMING_SNAKE_CASE derived from the check name
- "type" is always "static_code_check"
- "must_contain" array should list exact code patterns to look for — support BOTH single-quote and double-quote variants where applicable
- Some test cases may use "must_call" instead of "must_contain" for function call checks
- "weight" defaults to 5
- Always include the "final_verdict_rule" at the end
- Match the tone and detail level of fail_if, condition, and flexibility_note from the reference
- Focus on: imports, API key retrieval, function calls, model initialization, and output patterns
- Output ONLY valid JSON, no extra commentary or markdown code fences`;

    let userPrompt = `Generate test cases that verify the student's code matches the solution's structure.

SOLUTION CODE:
\`\`\`
${solutionCode}
\`\`\``;

    if (prefilledCode && prefilledCode.trim()) {
      userPrompt += `\n\nPREFILLED CODE (code the student starts with):
\`\`\`
${prefilledCode}
\`\`\``;
    }

    if (questionMarkdown && questionMarkdown.trim()) {
      userPrompt += `\n\nQUESTION MARKDOWN:
${questionMarkdown}`;
    }

    if (customRules && customRules.trim()) {
      userPrompt += `\n\nCUSTOM RULES (must follow these):
${customRules}`;
    }

    const result = await generateWithClaude(systemPrompt, userPrompt);

    let jsonStr = result.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const testCases = JSON.parse(jsonStr);
    res.json({ testCases });
  } catch (error) {
    console.error('Test case generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test cases' });
  }
}
