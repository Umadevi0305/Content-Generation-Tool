import { generateWithClaude, generateWithClaudeUserOnly } from '../lib/claude.js';
import { cors } from '../lib/cors.js';

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

**Function call checks (must_call_any):**
- CORRECT = function name followed by "(" exists in code

**Environment access (must_access_env):**
- CORRECT = ANY of: os.environ['X'], os.environ.get('X'), os.getenv('X')
- Quote style is IRRELEVANT

**API key passing (must_pass_api_key):**
- CORRECT = Client/initialization receives: variable with key OR environ access OR string
- Parameter name does NOT matter

**Function return (must_return):**
- CORRECT = return statement exists that returns non-None value

**Functional checks with depends_on:**
- If ANY dependency failed → INCORRECT (reason: "Prerequisite [name] failed")

**APPLY IDENTICAL LOGIC EVERY TIME. NO EXCEPTIONS.**

**REQUIRED DETAILS:**
question: \`${questionText}\`
reference solution: \`${solutionCode}\`
student submission: \`${studentCode}\`
test cases: \`${JSON.stringify(testCases, null, 2)}\`

**MANDATORY TEST CASE EVALUATION REQUIREMENT:**
- You MUST evaluate EVERY SINGLE test case provided in the input above
- Your response MUST contain exactly the same number of test case evaluations
- NEVER skip, omit, merge, or conditionally exclude any test case

**GENERAL EVALUATION CRITERIA:**
- Evaluate based on functional correctness, not exact code matching
- Accept both single quotes and double quotes
- Accept variations in whitespace and variable names
- Accept different but functionally equivalent approaches

**Award CORRECT when:**
- The code implements the required functionality correctly
- Minor stylistic differences exist but functionality is sound

**Award INCORRECT only when:**
- Required functionality is missing or broken
- There's a logical error affecting correctness
- Required imports/calls are genuinely absent

**RESPONSE FORMAT:**
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

**ABSOLUTE RULES - NO EXCEPTIONS:**
- NEVER skip a test case for any reason
- ALWAYS return the exact same number of evaluations as input test cases

Please ensure that your response is strictly in a valid RFC8259 compliant JSON format. Do not include any other fields or text outside the JSON.`;
}

function parseEvaluationResult(rawText) {
  let jsonStr = rawText.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
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

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    let variantJson = variantResult.trim();
    if (variantJson.startsWith('```')) {
      variantJson = variantJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

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
}
