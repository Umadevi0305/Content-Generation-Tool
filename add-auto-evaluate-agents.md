Add an **Auto-Evaluate** feature to the Test Case Evaluator page using AI agents. This automates the process of generating different student-like code submissions and evaluating each against the test cases.

## What it does

Instead of manually pasting student code and evaluating one at a time, this feature:
1. Takes the original solution + prefilled code + test cases
2. AI agents automatically generate multiple "student submission variants" — each simulating a different way a student might write or partially complete the code
3. Evaluates each variant against the test cases
4. Maintains a history of all variants and their evaluation results

## UI Changes to Test Case Evaluator Page

Add a new section/tab within the Test Case Evaluator called **"Auto-Evaluate"** alongside the existing manual evaluation.

### Inputs (auto-loaded from project store):
- **Question Text** — auto-imported from the Question Generator (the question MD for the active question)
- **Original Solution** — auto-imported from the solution code provided initially
- **Prefilled Code** — auto-imported from the prefilled code
- **Test Cases** — auto-imported from Test Case Generator

All inputs show as read-only blocks with the data pre-filled. User can override by editing if needed.

### Configuration:
- **Number of Variants** — number input (default: 5, min: 1, max: 10)
- **"Generate & Evaluate"** button

### How the AI Agent Works

Use the Claude API on the backend to simulate a multi-agent workflow. Create these agent roles in a single structured prompt:

**Agent 1 — Student Simulator**
Takes the original solution, prefilled code, and question text. Generates N different student submission variants. Each variant should be a realistic way a student might submit code:

- **Variant Type: Complete Correct** — Student writes everything correctly but with different variable names, formatting, or style
- **Variant Type: Partial Completion** — Student completes most steps but misses 1-2 things (e.g., forgot to pass config, missed an import)
- **Variant Type: Wrong Approach** — Student uses a different but incorrect approach (e.g., wrong model string, missing API key parameter)
- **Variant Type: Prefilled Only** — Student submits the prefilled code as-is without completing anything
- **Variant Type: Almost There** — Student does everything right except one critical detail (e.g., prints response instead of response.content)
- **Variant Type: Syntax Error** — Student has a typo or syntax issue
- **Variant Type: Extra Code** — Student adds unnecessary code that doesn't break functionality

The agent should pick from these variant types based on the number requested, ensuring diversity.

**Agent 2 — Evaluator**
Takes each generated variant and evaluates it against the test cases using the same evaluation prompt already in the app (the one from the Test Case Evaluator page). Returns pass/fail results per test case for each variant.

### Backend API Endpoint

```
POST /api/testcases/auto-evaluate
  Body: {
    questionText: string,
    solutionCode: string,
    prefilledCode: string,
    testCases: array,
    numberOfVariants: number
  }
  Returns: {
    variants: [
      {
        variantNumber: 1,
        variantType: "Partial Completion",
        description: "Student completed all steps but forgot to pass checkpointer to create_agent",
        studentCode: "...full code...",
        evaluation: {
          passed_test_cases_count: 6,
          total_test_cases_count: 8,
          test_case_details: [...]
        }
      },
      ...
    ]
  }
```

### Backend Implementation

Make TWO Claude API calls:

**Call 1 — Generate Variants**
```
Prompt: You are simulating different students attempting this coding question.

Question: ${questionText}
Original Solution: ${solutionCode}
Prefilled Code (base code given to students): ${prefilledCode}

Generate ${numberOfVariants} different student submission variants. Each variant should be a complete Python file that a student might submit.

Rules:
- Use the prefilled code as the base — students start from this
- Each variant should simulate a different level of completion or different mistakes
- Include a mix: some correct, some partially correct, some with errors
- For each variant provide: variant_type, description (1 line explaining what this student did differently), and the full code

Respond ONLY in JSON:
{
  "variants": [
    {
      "variant_type": "Partial Completion",
      "description": "Student completed most steps but forgot to import InMemorySaver",
      "code": "...full python code..."
    }
  ]
}
```

**Call 2 — Evaluate Each Variant**
For each generated variant, call the Claude API with the existing evaluation prompt (the same one used in manual evaluation) passing:
- questionText
- solutionCode (as reference)
- variant code (as student submission)
- testCases

This can be done in parallel (Promise.all) for speed.

### Results Display

**Summary Table** at the top:
| Variant | Type | Description | Passed | Total | Status |
|---------|------|-------------|--------|-------|--------|
| V1 | Complete Correct | All steps done with different var names | 8 | 8 | ✅ All Pass |
| V2 | Partial Completion | Forgot checkpointer import | 6 | 8 | ⚠️ Partial |
| V3 | Prefilled Only | Submitted prefilled without changes | 0 | 8 | ❌ All Fail |

**Expandable Detail Cards** below the table:
Each variant has a collapsible card showing:
- Variant type badge (green/yellow/red based on pass rate)
- Description
- The full student code (syntax highlighted, read-only)
- Test case results (same card layout as manual evaluation — green/red badges per test case)
- **"Use as Manual Test"** button — copies this variant's code into the manual evaluation tab's Student Submission input

### History

**Evaluation History** section at the bottom of the Auto-Evaluate tab:
- Every time user runs "Generate & Evaluate", save the full result set with a timestamp
- Show history as a list:
  ```
  Run 1 — March 23, 2026 2:45 PM — 5 variants — Avg pass rate: 62%
  Run 2 — March 23, 2026 3:10 PM — 3 variants — Avg pass rate: 78%
  ```
- Click any run to expand and see all variants and results from that run
- **"Clear History"** button
- History stored in Zustand and persists across tab switches

### Zustand Store Addition

```js
autoEvaluate: {
  variants: [],           // current run results
  isGenerating: false,
  history: [],            // [{timestamp, variants, avgPassRate}]
}
```
