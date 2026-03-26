import { useState } from 'react';
import { FileSpreadsheet, Download, Loader2, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { useAppState } from '../context/AppStateContext';

// session_display_id values must be pasted from:
// https://www.gigacalculator.com/randomizers/random-alphanumeric-generator.php
// They are NOT auto-generated in code.

// Raw prompt constants — character-for-character match with reference.
// ONLY the test cases array between "test cases: `" and closing "`" is dynamic.
const PROMPT_BEFORE_TESTCASES = `**META ROLE:**
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
question: \`{question_text}\`
reference solution: \`{actual_answer}\`
student submission: \`{user_answer}\`
test cases: `;

const PROMPT_AFTER_TESTCASES = `
**MANDATORY TEST CASE EVALUATION REQUIREMENT:**
- You MUST evaluate EVERY SINGLE test case provided in the input above
- Count the test cases in the input array - this is your required total_test_cases_count
- Your response MUST contain exactly the same number of test case evaluations
- NEVER skip, omit, merge, or conditionally exclude any test case
- If a test case has dependencies that failed, still evaluate it and mark as INCORRECT
- The test_case_details array length MUST exactly match the number of input test cases
- Before submitting your response, verify: len(test_case_details) == number of test cases in input

**GENERAL EVALUATION CRITERIA:**
- Consider the inputs: \`question\`, \`reference solution\`, and \`student submission\` provided in the prompt details.
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
- \`\`\`If a student's code has syntax errors or runtime failures, mark all test cases as INCORRECT and provide feedback like: "Your code contains syntax errors that prevent execution. Review the error messages and fix issues like missing colons, incorrect indentation, or undefined variables."\`\`\`
- \`\`\`If a student's code is empty or missing, mark all test cases as INCORRECT and provide feedback like: "No valid submission was provided. Make sure to write code that addresses the problem requirements."\`\`\`
- \`\`\`If a student's code fails on edge cases (empty input, large numbers, boundary conditions), mark those specific test cases as INCORRECT and provide feedback like: "Your solution works for standard inputs but fails on edge cases. Consider handling empty inputs, zero values, or boundary conditions."\`\`\`
- \`\`\`If a student's code has logical errors producing incorrect outputs, mark affected test cases as INCORRECT and provide feedback like: "Your approach has a logic error in the calculation/condition. Review your algorithm step-by-step for the failing test case."\`\`\`
- \`\`\`If a student's code doesn't match expected I/O format, mark affected test cases as INCORRECT and provide feedback like: "Your output format doesn't match requirements. Check if you need to print specific formatting, return values, or handle multiple test cases."\`\`\`
- \`\`\`If a student's code uses inefficient approach but produces correct results, mark test cases as CORRECT and provide feedback like: "Your solution is correct but could be optimized. Consider using [specific technique] for better time/space complexity."\`\`\`
- \`\`\`If a student's code is partially correct (some test cases pass), evaluate each test case individually and provide feedback identifying which scenarios fail and why.\`\`\`
- \`\`\`If a student's code is fully correct and handles all cases, mark all test cases as CORRECT and provide encouraging feedback acknowledging their strong solution.\`\`\`

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

**EXAMPLES:**
Example evaluation for a partially correct solution:
{{
  "passed_test_cases_count": 1,
  "total_test_cases_count": 2,
  "test_case_details": [
    {{
      "test_case_enum": "QUESTION_TEST_CASE_1",
      "test_case_id": "QUESTION_TEST_CASE_1",
      "display_text": "AI Test Case 1",
      "evaluation_result": "CORRECT",
      "description": "Meets the requirement for standard input; output matches expected behavior."
    }},
    {{
      "test_case_enum": "QUESTION_TEST_CASE_2",
      "test_case_id": "QUESTION_TEST_CASE_2",
      "display_text": "AI Test Case 2",
      "evaluation_result": "INCORRECT",
      "description": "Fails on edge case (e.g., empty/large input) due to incorrect conditional handling."
    }}
  ]
}}

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
{{
 "passed_test_cases_count": <integer>,
 "total_test_cases_count": <integer>,
 "test_case_details": [
   {{
     "test_case_enum": "<string>",
     "test_case_id": "<string>",
     "display_text": "<string>",
     "evaluation_result": "<CORRECT or INCORRECT>",
     "description": "<string>"
   }}
 ]
}}
**CRITICAL JSON FIELD REQUIREMENTS:**
- \`test_case_enum\`: MUST exactly match the "test_case_enum" value from the corresponding input test case
- \`test_case_id\`: MUST exactly match the "id" value from the corresponding input test case
- These fields are used for database integrity constraints - any mismatch will cause system errors
- Do NOT modify, abbreviate, or recreate these identifiers - copy them exactly as provided
- Each test case evaluation must preserve the exact enum and id from its input test case

**UUID INTEGRITY — ZERO TOLERANCE RULE:**

The \`test_case_id\` field in every evaluation MUST be copied CHARACTER-BY-CHARACTER from the \`"id"\` field of the corresponding input test case.

A valid UUID has EXACTLY this format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
- 8 hex chars, dash, 4 hex chars, dash, 4 hex chars, dash, 4 hex chars, dash, 12 hex chars
- Total: 32 hex characters + 4 dashes = 36 characters

BEFORE writing each test_case_id, you MUST:
1. Locate the exact \`"id"\` value from the respective input test case
2. Count that it has exactly 36 characters (including 4 dashes)
3. Verify it matches the pattern: 8-4-4-4-12
4. Copy it verbatim — do NOT reconstruct, abbreviate, or retype it from memory

❌ NEVER reconstruct a UUID from memory
❌ NEVER shorten or truncate a UUID
❌ NEVER guess missing characters
✅ ALWAYS copy the raw string exactly as it appears in the input

If you are unsure of any character in the UUID, go back and re-read the input test case before writing your response. A malformed UUID will cause a critical database error.

**ABSOLUTE RULES - NO EXCEPTIONS:**
- ❌ NEVER skip a test case for any reason (dependencies, syntax errors, type differences, etc.)
- ❌ NEVER merge multiple test cases into one evaluation
- ❌ NEVER conditionally exclude test cases based on their properties
- ❌ NEVER assume you can skip "dependent" test cases
- ✅ ALWAYS evaluate every single test case individually
- ✅ ALWAYS return the exact same number of evaluations as input test cases
- ✅ If dependencies fail, still evaluate the dependent test and mark it INCORRECT

**VERIFICATION BEFORE RESPONDING:**
Before you generate your JSON response, complete this checklist:
□ I counted the test cases in the input: _____ (write the number)
□ My total_test_cases_count equals this number
□ My test_case_details array has exactly this many elements
□ Every test_case_enum from input appears exactly once in my output
□ I did not skip any test case for any reason

If you cannot check all boxes, DO NOT RESPOND - fix the issue first.

Please ensure that your response is strictly in a valid RFC8259 compliant JSON format. After composing your response, validate that it includes all required keys, is not enclosed in an array, and does not contain any additional characters or elements that would invalidate the JSON structure. The JSON should be directly parsable by json.loads in Python without causing any errors. Do not include any other fields in the valid RFC8259 compliant JSON. Don't add Notes at the end, only respond with valid json.`;

function buildEvaluationPrompt(testCasesForPrompt) {
  return PROMPT_BEFORE_TESTCASES + testCasesForPrompt + PROMPT_AFTER_TESTCASES;
}

function formatSingleTestCase(tc) {
  const obj = { ...tc };
  delete obj.final_verdict_rule;
  const lines = ['  {{'];
  const keys = Object.keys(obj);
  keys.forEach((key, i) => {
    const val = obj[key];
    const valStr = JSON.stringify(val);
    const comma = i < keys.length - 1 ? ',' : '';
    lines.push(`    "${key}": ${valStr}${comma}`);
  });
  lines.push('  }}');
  return lines.join('\n');
}

function buildTestCasesForPrompt(originalTestCases, generatedTestCases) {
  // Use original test case structure but swap in IDs from generated JSON
  const merged = originalTestCases.map((tc, i) => {
    const genTc = generatedTestCases[i];
    const newId = genTc?.id || tc.id || tc.test_case_id;
    return { ...tc, id: newId };
  });

  const items = merged.map((tc, i) => {
    const formatted = formatSingleTestCase(tc);
    if (i < merged.length - 1) {
      return formatted.replace(/\}\}$/, '}},');
    }
    return formatted;
  });
  return `\`\n[\n${items.join('\n')}\n]\n\n\``;
}

function parseGeneratedJson(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function getTestCasesFromQuestion(question) {
  if (!question.testCasesJson?.trim()) return [];
  try {
    const parsed = JSON.parse(question.testCasesJson);
    return parsed.test_cases || (Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export default function SheetGenerator() {
  const { activeProject } = useAppState();
  const [resourceId, setResourceId] = useState('');
  const [sessionDisplayIds, setSessionDisplayIds] = useState('');
  const [passThreshold, setPassThreshold] = useState(6);
  const [sheetData, setSheetData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeSheet, setActiveSheet] = useState('ide');

  if (!activeProject) return null;

  const { questions, pipeline } = activeProject;
  const generatedJson = pipeline?.generatedJson;
  const questionJsonArray = parseGeneratedJson(generatedJson);

  const requiredIdCount = questionJsonArray.length * 2;
  const parsedDisplayIds = sessionDisplayIds.split('\n').map(s => s.trim()).filter(Boolean);
  const hasEnoughIds = parsedDisplayIds.length >= requiredIdCount;
  const canGenerate = resourceId.trim() && questionJsonArray.length > 0 && hasEnoughIds;

  const handleGenerate = () => {
    if (!resourceId.trim() || questionJsonArray.length === 0) {
      toast.error('Resource ID and generated JSON are required');
      return;
    }
    if (!hasEnoughIds) {
      toast.error(`Need ${requiredIdCount} session_display_ids (2 per question), got ${parsedDisplayIds.length}`);
      return;
    }

    setGenerating(true);

    try {
      // ─── Build ide_sessions rows ───
      const ideSessionRows = [];
      questionJsonArray.forEach((qJson, idx) => {
        const q = questions[idx];
        const title = (qJson.question?.short_text || qJson.short_text || '').replace(/\s+/g, '');
        const questionId = qJson.question?.question_id || qJson.question_id;

        // Row 1: Question/Prefilled
        const displayId1 = parsedDisplayIds[idx * 2];
        const meta1 = JSON.stringify({
          session_type: 'QUESTION',
          question_id: questionId,
          resource_id: resourceId.trim(),
          runtime: 'DATASCIENCE',
          requirements_enum: 'GENAI',
        }, null, 4);

        ideSessionRows.push({
          session_id: qJson.ide_session_id || '',
          session_display_id: displayId1,
          boilerplate_code_s3_url: '',
          user_directory_path: `/home/nxtwave/${title}`,
          is_submit_enabled: 'TRUE',
          tests_download_url: '',
          test_type: 'DATASCIENCE',
          metadata: meta1,
          resource_id: resourceId.trim(),
          is_deploy_enabled: 'FALSE',
          session_url: '',
          ide_type: 'CCBP_IDE_V2',
        });

        // Row 2: Solution
        const displayId2 = parsedDisplayIds[idx * 2 + 1];
        // Solution metadata has extra newline before closing brace
        const meta2Parts = JSON.stringify({
          session_type: 'QUESTION',
          question_id: questionId,
          resource_id: resourceId.trim(),
          runtime: 'DATASCIENCE',
          requirements_enum: 'GENAI',
        }, null, 4);
        // Add extra blank line before closing brace
        const meta2 = meta2Parts.replace(/\n}$/, '\n \n}');

        ideSessionRows.push({
          session_id: qJson.solutions?.[0]?.ide_session_id || '',
          session_display_id: displayId2,
          boilerplate_code_s3_url: '',
          user_directory_path: '/home/nxtwave/Solution',
          is_submit_enabled: 'FALSE',
          tests_download_url: '',
          test_type: 'DATASCIENCE',
          metadata: meta2,
          resource_id: resourceId.trim(),
          is_deploy_enabled: 'FALSE',
          session_url: '',
          ide_type: 'CCBP_IDE_V2',
        });
      });

      // ─── Build PromptConfigDetails rows ───
      const promptConfigRows = [];
      const promptConfigIds = []; // one per question
      questionJsonArray.forEach((qJson, idx) => {
        const q = questions[idx];
        const testCases = getTestCasesFromQuestion(q);
        const generatedTestCases = qJson.test_cases || [];
        const testCasesForPrompt = buildTestCasesForPrompt(testCases, generatedTestCases);
        const promptText = buildEvaluationPrompt(testCasesForPrompt);

        const configId = crypto.randomUUID();
        promptConfigIds.push(configId);

        // Row 1: Main config row
        promptConfigRows.push({
          id: configId,
          name_enum: 'LLM_AI_EVALUATION',
          prompt: promptText,
          count: 3,
          'field name': '',
          'field title': '',
        });

        // Row 2: passed_test_cases_count
        promptConfigRows.push({
          id: '',
          name_enum: '',
          prompt: '',
          count: '',
          'field name': 'passed_test_cases_count',
          'field title': 'No.of Test cases passed',
        });

        // Row 3: total_test_cases_count
        promptConfigRows.push({
          id: '',
          name_enum: '',
          prompt: '',
          count: '',
          'field name': 'total_test_cases_count',
          'field title': 'Total No.of Test Cases',
        });

        // Row 4: test_case_details
        promptConfigRows.push({
          id: '',
          name_enum: '',
          prompt: '',
          count: '',
          'field name': 'test_case_details',
          'field title': 'Test Case Details',
        });
      });

      // ─── Build AIEvaluationDetails rows ───
      const aiEvalRows = [];
      questionJsonArray.forEach((qJson, idx) => {
        const q = questions[idx];
        aiEvalRows.push({
          question_id: qJson.question?.question_id || qJson.question_id,
          answer: q.solutionCode || '',
          prompt_config_id: promptConfigIds[idx],
          response_evaluation_field_config_exists: 'TRUE',
          name: 'passed_test_cases_count',
          value: passThreshold,
          data_type: 'FLOAT',
          operator: 'GREATER_THAN_OR_EQUAL',
          textual_answer_url: '',
          service_enum: 'AZURE_OPENAI/gpt-5-chat/gpt-5-chat',
        });
      });

      setSheetData({ ideSessionRows, promptConfigRows, aiEvalRows });
      toast.success('Sheet data generated!');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!sheetData) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: ide_sessions
    const ws1 = XLSX.utils.json_to_sheet(sheetData.ideSessionRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'ide_sessions');

    // Sheet 2: PromptConfigDetails
    const ws2 = XLSX.utils.json_to_sheet(sheetData.promptConfigRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'PromptConfigDetails');

    // Sheet 3: AIEvaluationDetails
    const ws3 = XLSX.utils.json_to_sheet(sheetData.aiEvalRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'AIEvaluationDetails');

    const fileName = `${activeProject.name.replace(/\s+/g, '_')}_sheet.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
    toast.success(`Downloaded ${fileName}`);
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">Sheet Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate .xlsx with ide_sessions, PromptConfigDetails, and AIEvaluationDetails
        </p>
      </div>

      {/* Status check */}
      {questionJsonArray.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            No generated JSON found. Complete the pipeline through Phase 4 (JSON Generation) first, or generate JSON via the JSON Generator page.
          </p>
        </div>
      )}

      {/* Top-level inputs */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">Resource ID</label>
          <input
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            placeholder="Enter Resource ID (used across all sheets)"
            className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:border-accent-blue transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">
            Session Display IDs (one per line, {requiredIdCount} needed — 2 per question)
          </label>
          <textarea
            value={sessionDisplayIds}
            onChange={(e) => setSessionDisplayIds(e.target.value)}
            placeholder={`Paste ${requiredIdCount} IDs from gigacalculator.com/randomizers/random-alphanumeric-generator.php\nOne per line. Pairs: Q1-question, Q1-solution, Q2-question, Q2-solution, ...`}
            rows={Math.max(3, Math.min(8, requiredIdCount))}
            className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:border-accent-blue transition-colors"
          />
          <p className={`text-xs mt-1 ${hasEnoughIds ? 'text-green-400' : 'text-yellow-400'}`}>
            {parsedDisplayIds.length} / {requiredIdCount} IDs provided
          </p>
        </div>
        <div className="max-w-xs">
          <label className="text-xs font-medium text-gray-400 block mb-1">Pass Threshold (passed_test_cases_count value)</label>
          <input
            type="number"
            value={passThreshold}
            onChange={(e) => setPassThreshold(Math.max(1, Number(e.target.value) || 6))}
            min={1}
            className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Generate Sheet
          </button>
          {sheetData && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <Download size={16} />
              Download .xlsx
            </button>
          )}
        </div>
      </div>

      {/* Auto-import summary */}
      {questionJsonArray.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Eye size={14} />
            Auto-Imported Data ({questionJsonArray.length} question{questionJsonArray.length !== 1 ? 's' : ''})
          </h3>
          <div className="space-y-2">
            {questionJsonArray.map((qJson, idx) => {
              const q = questions[idx];
              const testCases = getTestCasesFromQuestion(q);
              return (
                <div key={idx} className="bg-dark-900 border border-dark-600 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200">Q{idx + 1}: {qJson.question?.short_text || qJson.short_text}</span>
                    <span className="text-xs text-gray-500">{testCases.length} test cases</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 font-mono space-y-0.5">
                    <p>question_id: {qJson.question?.question_id || qJson.question_id}</p>
                    <p>ide_session_id: {qJson.ide_session_id}</p>
                    <p>solution_ide_session_id: {qJson.solutions?.[0]?.ide_session_id || 'N/A'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spreadsheet Preview */}
      {sheetData && (
        <div className="bg-dark-800 border border-dark-600 rounded-lg flex flex-col">
          {/* Sheet tabs */}
          <div className="flex border-b border-dark-600 bg-dark-900 rounded-t-lg">
            {[
              { key: 'ide', label: 'ide_sessions', count: sheetData.ideSessionRows.length },
              { key: 'prompt', label: 'PromptConfigDetails', count: sheetData.promptConfigRows.length },
              { key: 'eval', label: 'AIEvaluationDetails', count: sheetData.aiEvalRows.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSheet(tab.key)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeSheet === tab.key
                    ? 'border-accent-blue text-accent-blue bg-dark-800'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-gray-600">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Sheet content */}
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            {activeSheet === 'ide' && (
              <table className="text-xs border-collapse w-max min-w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-dark-900">
                    {['#', 'session_id', 'session_display_id', 'boilerplate_code_s3_url', 'user_directory_path', 'is_submit_enabled', 'tests_download_url', 'test_type', 'metadata', 'resource_id', 'is_deploy_enabled', 'session_url', 'ide_type'].map((col) => (
                      <th key={col} className="text-left px-3 py-2 text-gray-400 font-semibold whitespace-nowrap border-b border-r border-dark-600 bg-dark-900">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.ideSessionRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-dark-800' : 'bg-dark-800/50'}>
                      <td className="px-3 py-2 text-gray-500 font-semibold border-r border-dark-600 whitespace-nowrap">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-300 font-mono border-r border-dark-600 whitespace-nowrap">{row.session_id}</td>
                      <td className="px-3 py-2 text-gray-300 font-mono border-r border-dark-600 whitespace-nowrap">{row.session_display_id}</td>
                      <td className="px-3 py-2 text-gray-500 border-r border-dark-600 whitespace-nowrap">{row.boilerplate_code_s3_url || ''}</td>
                      <td className="px-3 py-2 text-gray-300 font-mono border-r border-dark-600 whitespace-nowrap">{row.user_directory_path}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.is_submit_enabled}</td>
                      <td className="px-3 py-2 text-gray-500 border-r border-dark-600 whitespace-nowrap">{row.tests_download_url || ''}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.test_type}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono border-r border-dark-600 max-w-xs">
                        <pre className="whitespace-pre-wrap text-xs leading-tight">{row.metadata}</pre>
                      </td>
                      <td className="px-3 py-2 text-gray-300 font-mono border-r border-dark-600 whitespace-nowrap">{row.resource_id}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.is_deploy_enabled}</td>
                      <td className="px-3 py-2 text-gray-500 border-r border-dark-600 whitespace-nowrap">{row.session_url || ''}</td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{row.ide_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSheet === 'prompt' && (
              <table className="text-xs border-collapse w-max min-w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-dark-900">
                    {['#', 'id', 'name_enum', 'prompt', 'count', 'field name', 'field title'].map((col) => (
                      <th key={col} className="text-left px-3 py-2 text-gray-400 font-semibold whitespace-nowrap border-b border-r border-dark-600 bg-dark-900">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.promptConfigRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-dark-800' : 'bg-dark-800/50'}>
                      <td className="px-3 py-2 text-gray-500 font-semibold border-r border-dark-600 whitespace-nowrap">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-300 font-mono border-r border-dark-600 whitespace-nowrap">{row.id}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.name_enum}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono border-r border-dark-600 max-w-md">
                        {row.prompt ? (
                          <details>
                            <summary className="cursor-pointer text-accent-blue hover:underline whitespace-nowrap">
                              View prompt ({row.prompt.length.toLocaleString()} chars)
                            </summary>
                            <pre className="whitespace-pre-wrap text-xs leading-tight mt-1 max-h-64 overflow-auto">{row.prompt}</pre>
                          </details>
                        ) : ''}
                      </td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.count}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row['field name']}</td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{row['field title']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSheet === 'eval' && (
              <table className="text-xs border-collapse w-max min-w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-dark-900">
                    {['#', 'question_id', 'answer', 'prompt_config_id', 'response_evaluation_field_config_exists', 'name', 'value', 'data_type', 'operator', 'textual_answer_url', 'service_enum'].map((col) => (
                      <th key={col} className="text-left px-3 py-2 text-gray-400 font-semibold whitespace-nowrap border-b border-r border-dark-600 bg-dark-900">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.aiEvalRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-dark-800' : 'bg-dark-800/50'}>
                      <td className="px-3 py-2 text-gray-500 font-semibold border-r border-dark-600 whitespace-nowrap">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-300 font-mono border-r border-dark-600 whitespace-nowrap">{row.question_id}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono border-r border-dark-600 max-w-xs">
                        <details>
                          <summary className="cursor-pointer text-accent-blue hover:underline whitespace-nowrap">
                            View code ({row.answer.length.toLocaleString()} chars)
                          </summary>
                          <pre className="whitespace-pre-wrap text-xs leading-tight mt-1 max-h-40 overflow-auto">{row.answer}</pre>
                        </details>
                      </td>
                      <td className="px-3 py-2 text-gray-300 font-mono border-r border-dark-600 whitespace-nowrap">{row.prompt_config_id}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.response_evaluation_field_config_exists}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.name}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.value}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.data_type}</td>
                      <td className="px-3 py-2 text-gray-300 border-r border-dark-600 whitespace-nowrap">{row.operator}</td>
                      <td className="px-3 py-2 text-gray-500 border-r border-dark-600 whitespace-nowrap">{row.textual_answer_url || ''}</td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{row.service_enum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
