import { Router } from 'express';
import { generateWithClaude, generateWithClaudeUserOnly } from '../services/claude.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testcaseTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/testcase-format.json'),
  'utf-8'
);

router.post('/generate', async (req, res) => {
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

    const jsonStr = extractJson(result);
    const testCases = JSON.parse(jsonStr);
    res.json({ testCases });
  } catch (error) {
    console.error('Test case generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test cases' });
  }
});

function buildEvaluationPrompt(questionText, solutionCode, studentCode, testCases) {
  return `**META ROLE:**
You are an experienced IDE-coding instructor known for your insightful and constructive feedback, helping students improve their programming skills and understand how to write correct, efficient, and reliable code solutions.

**EVALUATION OBJECTIVE:**
I will provide you with a coding question and the student's code submission. You need to evaluate the student based on the given Evaluation Criteria and Feedback Guidelines below, assessing correctness, approach quality, edge case handling, and code reliability.

You MUST:
- Derive total_test_cases_count from len(test_cases)
- Produce exactly one evaluation per test case
- Ensure len(test_case_details) == len(test_cases)
- Never skip test cases due to dependencies
- Validate count and enums before responding

**TEST SUITE VARIABILITY ACKNOWLEDGMENT (MANDATORY):**

The set of test_cases provided to you may vary between executions.

You MUST:
- Treat the provided test_cases array as the single source of truth
- Evaluate ONLY the test cases present in the current input
- Reflect their exact count in total_test_cases_count
- Not assume missing test cases are failures or omissions
- Not expect stability across different runs

**CRITICAL EVALUATION PHILOSOPHY:**
- **Semantic equivalence over syntactic matching**: Judge whether the code achieves the required functionality, not whether it matches exact string patterns
- **Functional correctness first**: If the code works correctly and produces the right output, minor stylistic differences should not cause failure
- **Flexible pattern matching**: Accept multiple valid approaches to the same problem
- **Penalize only actual errors**: Only mark as INCORRECT if there's a real functional problem, missing requirement, or logical error

**MANDATORY: Your evaluation must be 100% consistent for identical code.**

For each test case, apply this EXACT logic:

**Import checks (must_import_any):**
- CORRECT = module name appears after "import" or "from" (any valid Python import syntax)
- Example: For ["os"] → Accept: import os, from os import environ, import os as x

**Function call checks (must_call_any):**
- CORRECT = function name followed by "(" exists in code
- Example: For ["load_dotenv"] → Accept: load_dotenv(), module.load_dotenv(), load_dotenv(path)

**Environment access (must_access_env):**
- CORRECT = ANY of: os.environ['X'], os.environ.get('X'), os.getenv('X')
- Quote style ('' vs "") is IRRELEVANT

**API key passing (must_pass_api_key):**
- CORRECT = Client/initialization receives: variable with key OR environ access OR string
- Parameter name does NOT matter (api_key=, key=, or positional)

**Function return (must_return):**
- CORRECT = return statement exists that returns non-None value
- Specific attribute access pattern does NOT matter

**Functional checks with depends_on:**
- If ANY dependency failed → INCORRECT (reason: "Prerequisite [name] failed")
- Do NOT evaluate if dependencies failed

**APPLY IDENTICAL LOGIC EVERY TIME. NO EXCEPTIONS.**

**REQUIRED DETAILS:**
question: \`${questionText}\`
reference solution: \`${solutionCode}\`
student submission: \`${studentCode}\`
test cases: \`${JSON.stringify(testCases, null, 2)}\`

**MANDATORY TEST CASE EVALUATION REQUIREMENT:**
- You MUST evaluate EVERY SINGLE test case provided in the input above
- Count the test cases in the input array - this is your required total_test_cases_count
- Your response MUST contain exactly the same number of test case evaluations
- NEVER skip, omit, merge, or conditionally exclude any test case
- If a test case has dependencies that failed, still evaluate it and mark as INCORRECT
- The test_case_details array length MUST exactly match the number of input test cases
- Before submitting your response, verify: len(test_case_details) == number of test cases in input

**GENERAL EVALUATION CRITERIA:**
- Consider the inputs: question, reference solution, and student submission provided in the prompt details.
- **Evaluate based on functional correctness, not exact code matching**
- Assess requirement match, correctness, edge case handling, stability, and I/O compliance.
- Count total test cases and determine how many the submission passes.
- Set passed_test_cases_count based on actual test case evaluation results.
- **IMPORTANT**: When checking for patterns like imports, function calls, or string content, look for semantic equivalence:
  - Accept both single quotes (') and double quotes (")
  - Accept variations in whitespace
  - Accept different but equivalent variable names
  - Accept different but functionally equivalent approaches

**SEMANTIC MATCHING INSTRUCTIONS:**
When evaluating static code checks:
1. For imports: Accept any valid Python import syntax that achieves the required import
2. For function calls: Look for the function name being called, don't require exact variable names
3. For string literals: Accept both quote styles and minor formatting differences
4. For variable names: Focus on functionality, not naming conventions (unless specified in requirements)
5. For method calls: Accept equivalent methods that achieve the same result

**QUESTION SPECIFIC EVALUATION CRITERIA:**
- If a student's code has syntax errors or runtime failures, mark all test cases as INCORRECT and provide feedback like: "Your code contains syntax errors that prevent execution. Review the error messages and fix issues like missing colons, incorrect indentation, or undefined variables."
- If a student's code is empty or missing, mark all test cases as INCORRECT and provide feedback like: "No valid submission was provided. Make sure to write code that addresses the problem requirements."
- If a student's code fails on edge cases (empty input, large numbers, boundary conditions), mark those specific test cases as INCORRECT and provide feedback like: "Your solution works for standard inputs but fails on edge cases. Consider handling empty inputs, zero values, or boundary conditions."
- If a student's code has logical errors producing incorrect outputs, mark affected test cases as INCORRECT and provide feedback like: "Your approach has a logic error in the calculation/condition. Review your algorithm step-by-step for the failing test case."
- If a student's code doesn't match expected I/O format, mark affected test cases as INCORRECT and provide feedback like: "Your output format doesn't match requirements. Check if you need to print specific formatting, return values, or handle multiple test cases."
- If a student's code uses inefficient approach but produces correct results, mark test cases as CORRECT and provide feedback like: "Your solution is correct but could be optimized. Consider using [specific technique] for better time/space complexity."
- If a student's code is partially correct (some test cases pass), evaluate each test case individually and provide feedback identifying which scenarios fail and why.
- If a student's code is fully correct and handles all cases, mark all test cases as CORRECT and provide encouraging feedback acknowledging their strong solution.

**CRITICAL EVALUATION RULES:**

1. **Functional Equivalence Priority**: If two code approaches produce the same correct result, both should pass
2. **No False Negatives for Style**: Don't fail code for using different quote types, variable names, or whitespace
3. **Verify Before Failing**: Before marking INCORRECT, confirm there's an actual functional problem, not just a stylistic difference
4. **Accept Multiple Valid Solutions**: There may be multiple correct ways to implement requirements
5. **Focus on Requirements**: Only fail if a stated requirement is not met functionally
6. Total number of test cases in final output should be same as total number of test cases defined in the prompt

**EVALUATION CHECKLIST:**
Before marking any test case as INCORRECT, verify:
- [ ] Is there an actual functional problem, or just a stylistic difference?
- [ ] Does the code achieve the required functionality through an alternative valid approach?
- [ ] Am I being too rigid about exact string matching when semantic equivalence exists?
- [ ] Would this code actually fail to solve the problem, or does it just look different?

Please check the code based on these criteria:
- **Correctness**: Does it produce correct outputs for all test cases?
- **Edge Case Handling**: Does it handle boundary conditions, empty inputs, extreme values?
- **Logic Quality**: Is the algorithmic approach sound?
- **Runtime Stability**: Does it avoid errors for valid inputs?
- **I/O Compliance**: Does output format match requirements?
- **Code Structure**: Is it readable and well-organized?
- **Efficiency**: Is the approach reasonably optimal?

**Award CORRECT when:**
- The code implements the required functionality correctly
- Minor stylistic differences exist but functionality is sound
- An alternative but valid approach is used
- The output/behavior matches requirements

**Award INCORRECT only when:**
- Required functionality is missing or broken
- There's a logical error affecting correctness
- Edge cases cause failures
- Output format is incorrect in a meaningful way
- Required imports/calls are genuinely absent

**FEEDBACK GUIDELINES:**
- For each test case, provide a clear 1-3 sentence description explaining whether it passed or failed.
- For CORRECT test cases, briefly state what requirement was met or what input scenario was handled properly.
- For INCORRECT test cases, explain the specific condition or input that causes failure and mention the logic gap, edge case issue, I/O mismatch, or runtime problem.
- **Be specific about functional issues, not stylistic preferences**
- Keep descriptions concise and focused on the technical reason for the result.
- Use plain text without markdown formatting in descriptions.

When giving feedback, focus on correctness and logic rather than minor style issues, as the goal is to teach effective problem-solving and coding skills.

**RESPONSE FORMAT:**
Please provide your response in this valid JSON format:
{
 "passed_test_cases_count": <integer>,
 "total_test_cases_count": <integer>,
 "test_case_details": [
   {
     "test_case_enum": "<string>",
     "test_case_id": "<string>",
     "display_text": "<string>",
     "evaluation_result": "<CORRECT or INCORRECT>",
     "description": "<string>"
   }
 ]
}

**CRITICAL JSON FIELD REQUIREMENTS:**
- test_case_enum: MUST exactly match the "test_case_enum" value from the corresponding input test case
- test_case_id: MUST exactly match the "id" value from the corresponding input test case
- These fields are used for database integrity constraints - any mismatch will cause system errors
- Do NOT modify, abbreviate, or recreate these identifiers - copy them exactly as provided
- Each test case evaluation must preserve the exact enum and id from its input test case

**UUID INTEGRITY — ZERO TOLERANCE RULE:**
The test_case_id field in every evaluation MUST be copied CHARACTER-BY-CHARACTER from the "id" field of the corresponding input test case.

**ABSOLUTE RULES - NO EXCEPTIONS:**
- NEVER skip a test case for any reason
- NEVER merge multiple test cases into one evaluation
- ALWAYS evaluate every single test case individually
- ALWAYS return the exact same number of evaluations as input test cases
- If dependencies fail, still evaluate the dependent test and mark it INCORRECT

Please ensure that your response is strictly in a valid RFC8259 compliant JSON format. Do not include any other fields or text outside the JSON. Don't add Notes at the end, only respond with valid json.`;
}

function extractJson(raw) {
  let str = raw.trim();

  // Strip markdown code fences
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\n?/, '').replace(/\n?```[\s\S]*$/, '');
  }

  // Strip any trailing text after the top-level JSON object
  const firstBrace = str.indexOf('{');
  if (firstBrace === -1) return str;
  str = str.slice(firstBrace);

  // Attempt 1: try direct parse
  try {
    JSON.parse(str);
    return str;
  } catch {
    // Continue to repair
  }

  // Attempt 2: find the last } and trim trailing junk
  const lastBrace = str.lastIndexOf('}');
  if (lastBrace !== -1) {
    const trimmed = str.slice(0, lastBrace + 1);
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Continue to repair
    }
  }

  // Attempt 3: repair raw control chars inside JSON strings char-by-char
  const chars = str;
  const out = [];
  let inString = false, escape = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (escape) {
      escape = false;
      out.push(ch);
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      out.push(ch);
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      out.push(ch);
      continue;
    }

    if (inString) {
      if (ch === '\n') { out.push('\\', 'n'); continue; }
      if (ch === '\r') { out.push('\\', 'r'); continue; }
      if (ch === '\t') { out.push('\\', 't'); continue; }
      out.push(ch);
      continue;
    }

    out.push(ch);
  }

  let repaired = out.join('');
  // Trim to last }
  const lastB = repaired.lastIndexOf('}');
  if (lastB !== -1) repaired = repaired.slice(0, lastB + 1);

  // If still broken (e.g. truncated response), try closing open structures
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // Attempt 4: the response was likely truncated by token limit.
    // Try to close any open arrays/objects.
    let fixed = repaired;
    // Close any unterminated string
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    // Count open brackets/braces
    let openBraces = 0, openBrackets = 0;
    let inStr = false, esc = false;
    for (const c of fixed) {
      if (esc) { esc = false; continue; }
      if (c === '\\' && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') openBraces++;
      else if (c === '}') openBraces--;
      else if (c === '[') openBrackets++;
      else if (c === ']') openBrackets--;
    }
    fixed += ']'.repeat(Math.max(0, openBrackets));
    fixed += '}'.repeat(Math.max(0, openBraces));

    try {
      JSON.parse(fixed);
      return fixed;
    } catch {
      // Return the best effort — caller will get the parse error
      return repaired;
    }
  }
}

function parseEvaluationResult(rawText) {
  const jsonStr = extractJson(rawText);
  const evaluationResult = JSON.parse(jsonStr);
  if (Array.isArray(evaluationResult.test_case_details)) {
    const details = evaluationResult.test_case_details;
    evaluationResult.total_test_cases_count = details.length;
    evaluationResult.passed_test_cases_count = details.filter(
      (tc) => tc.evaluation_result === 'CORRECT'
    ).length;
  }
  return evaluationResult;
}

router.post('/evaluate', async (req, res) => {
  try {
    const { questionText, solutionCode, studentCode, testCases } = req.body;

    if (!studentCode || !studentCode.trim()) {
      return res.status(400).json({ error: 'Student code is required' });
    }
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: 'Test cases are required' });
    }

    const evaluationPrompt = buildEvaluationPrompt(questionText, solutionCode, studentCode, testCases);
    const result = await generateWithClaudeUserOnly(evaluationPrompt);

    const evaluationResult = parseEvaluationResult(result);
    res.json(evaluationResult);
  } catch (error) {
    console.error('Test case evaluation error:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate test cases' });
  }
});

router.post('/auto-evaluate', async (req, res) => {
  try {
    const { questionText, solutionCode, prefilledCode, testCases, numberOfVariants } = req.body;

    if (!solutionCode || !solutionCode.trim()) {
      return res.status(400).json({ error: 'Solution code is required' });
    }
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: 'Test cases are required' });
    }

    const numVariants = Math.min(Math.max(numberOfVariants || 5, 1), 10);

    // Call 1 — Generate student variants
    const variantPrompt = `You are simulating different students attempting this coding question.

Question: ${questionText || '(not provided)'}
Original Solution: \`\`\`
${solutionCode}
\`\`\`
Prefilled Code (base code given to students): \`\`\`
${prefilledCode || '(none)'}
\`\`\`

Generate ${numVariants} different student submission variants. Each variant should be a complete Python file that a student might submit.

Rules:
- Use the prefilled code as the base — students start from this
- Each variant should simulate a different level of completion or different mistakes
- Include a mix: some correct, some partially correct, some with errors
- Pick from these variant types, ensuring diversity:
  * Complete Correct — Student writes everything correctly but with different variable names, formatting, or style
  * Partial Completion — Student completes most steps but misses 1-2 things
  * Wrong Approach — Student uses a different but incorrect approach
  * Prefilled Only — Student submits the prefilled code as-is without completing anything
  * Almost There — Student does everything right except one critical detail
  * Syntax Error — Student has a typo or syntax issue
  * Extra Code — Student adds unnecessary code that doesn't break functionality
- For each variant provide: variant_type, description (1 line explaining what this student did differently), and the full code

Respond ONLY in valid JSON (no markdown fences):
{
  "variants": [
    {
      "variant_type": "Partial Completion",
      "description": "Student completed most steps but forgot to import InMemorySaver",
      "code": "...full python code..."
    }
  ]
}`;

    const variantResult = await generateWithClaude(
      'You are an expert coding instructor who can simulate realistic student submissions at various skill levels. Always respond with valid JSON only.',
      variantPrompt
    );

    const variantJson = extractJson(variantResult);
    const { variants: rawVariants } = JSON.parse(variantJson);

    if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
      return res.status(500).json({ error: 'Failed to generate student variants' });
    }

    // Call 2 — Evaluate each variant in parallel
    const evaluationPromises = rawVariants.map(async (variant, idx) => {
      try {
        const prompt = buildEvaluationPrompt(questionText, solutionCode, variant.code, testCases);
        const evalResult = await generateWithClaudeUserOnly(prompt);
        const evaluation = parseEvaluationResult(evalResult);

        return {
          variantNumber: idx + 1,
          variantType: variant.variant_type,
          description: variant.description,
          studentCode: variant.code,
          evaluation,
        };
      } catch (evalErr) {
        return {
          variantNumber: idx + 1,
          variantType: variant.variant_type,
          description: variant.description,
          studentCode: variant.code,
          evaluation: {
            passed_test_cases_count: 0,
            total_test_cases_count: testCases.length,
            test_case_details: [],
            error: evalErr.message,
          },
        };
      }
    });

    const variants = await Promise.all(evaluationPromises);

    res.json({ variants });
  } catch (error) {
    console.error('Auto-evaluate error:', error);
    res.status(500).json({ error: error.message || 'Failed to auto-evaluate' });
  }
});

export default router;
