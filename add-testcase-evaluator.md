Add a new page called "Test Case Evaluator" between the Test Case Generator and JSON Generator tabs. Update the sidebar navigation order to:

1. Question Generator (icon: FileText)
2. Test Case Generator (icon: TestTube)
3. Test Case Evaluator (icon: ShieldCheck)
4. JSON Generator (icon: Braces)
5. ZIP Generator (icon: Archive)

Also add this page's state to the Zustand store so it persists across tab switches like all other pages.

---

## Page 3: Test Case Evaluator

### Purpose
After generating test cases, the user wants to validate/evaluate whether those test cases correctly pass or fail against a given student submission. This page sends the test cases along with question text, solution code, and student code to the Claude API using a specific evaluation prompt — and shows the results.

### UI Layout

**Top section — 3 input areas (side by side or tabbed):**

1. **Question Text (Markdown)** — textarea
   - Add an "Import from Question Generator" button that pulls the generated question markdown from Page 1's store
2. **Reference Solution Code** — code editor textarea
   - Add an "Import from Question Generator" button that pulls the solution code from Page 1's store
3. **Student Submission Code** — code editor textarea
   - This is where the user pastes the student's code to test against. No import button — always manually entered.

**Middle section — Test Cases Input:**

4. **Test Cases JSON** — large textarea (JSON editor)
   - Add an "Import from Test Case Generator" button that pulls the generated test cases JSON from Page 2's store
   - The test cases JSON format is the full format with id, name, test_case_enum, type, fail_if, condition, must_contain, flexibility_note, weight etc.

5. **Evaluate** button — triggers the API call

**Bottom section — Evaluation Results:**

- Show a summary bar at top: "Passed: X / Y test cases" with a green/red progress indicator
- Display each test case result as a card:
  - Left side: test_case_enum name + display_text
  - Right side: CORRECT (green badge) or INCORRECT (red badge)
  - Below: the description/feedback text explaining why it passed or failed
- Each result card should be clearly color-coded (green border for CORRECT, red border for INCORRECT)
- Add a **Copy Results JSON** button that copies the full evaluation response JSON
- Add a **Download Results** button

### Backend API Endpoint

```
POST /api/testcases/evaluate
  Body: {
    questionText: string,
    solutionCode: string,
    studentCode: string,
    testCases: array (full test case objects)
  }
  Returns: {
    passed_test_cases_count: number,
    total_test_cases_count: number,
    test_case_details: array
  }
```

### Claude API Prompt (CRITICAL — use this EXACT prompt template)

On the backend, when calling the Claude API for evaluation, use this EXACT prompt structure. The only dynamic parts are the 4 placeholders marked with `{...}`. Everything else must be sent verbatim:

```
const evaluationPrompt = `**META ROLE:**
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
```

**IMPORTANT**: The 4 dynamic variables injected into the prompt are:
- `${questionText}` — the question markdown from the input
- `${solutionCode}` — the reference solution code from the input
- `${studentCode}` — the student submission code from the input
- `${JSON.stringify(testCases, null, 2)}` — the test cases array serialized as formatted JSON

The rest of the prompt must remain EXACTLY as written above — do not modify, summarize, or rephrase any part of it. This is a production evaluation prompt that has been carefully tuned.

### Zustand Store Addition

Add these fields to the global store for the Test Case Evaluator page:

```js
// In the store slice for testCaseEvaluator
testCaseEvaluator: {
  questionText: '',
  solutionCode: '',
  studentCode: '',
  testCasesJson: '',
  evaluationResult: null,  // { passed_test_cases_count, total_test_cases_count, test_case_details }
  isEvaluating: false,
}
```

### Backend Implementation Notes

1. Parse the Claude API response as JSON. The response will be a raw JSON string — parse it with `JSON.parse()` and return it directly to the frontend.
2. If Claude returns markdown-wrapped JSON (```json ... ```), strip the backticks before parsing.
3. Use `claude-sonnet-4-20250514` model with `max_tokens: 4096` since evaluation responses can be long with many test cases.
4. Set the Claude API call with the evaluation prompt as a single user message (not system + user split). The entire prompt above goes as the user message content.

### Frontend Result Display Details

- **Summary bar**: Show "Passed: X / Y" with:
  - All passed → full green bar
  - Some failed → yellow/orange bar with ratio
  - All failed → red bar
- **Result cards**: Render one card per item in `test_case_details`:
  - Header: `test_case_enum` in monospace font + `display_text` as label
  - Badge: "CORRECT" (green) or "INCORRECT" (red)
  - Body: `description` text
  - Border color: green-500 for CORRECT, red-500 for INCORRECT
- Cards should be scrollable if there are many
- Show a loading skeleton/spinner while evaluation is running
