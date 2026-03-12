Update the JSON Generator page to support multiple questions in a single JSON output. Currently it only handles 1 question at a time. Here's the full rework:

---

## Updated Page: JSON Generator (Multiple Questions Support)

### UI Layout — Step-by-step flow

**Step 1: Number of Questions**
- Show a prominent number input at the top: "How many questions?" (default: 1, min: 1, max: 20)
- A "Set" or "Continue" button next to it
- When the user sets the number, dynamically render that many input sections below

**Step 2: Per-Question Input Sections**

For each question (1 to N), render a collapsible/accordion section with a header like "Question 1", "Question 2", etc. Each section contains:

1. **Question Markdown** — textarea
   - Add an "Import from Question Generator" button that pulls from Page 1 store (only useful for Question 1 typically, but keep it on all)
2. **Test Cases JSON** — textarea (the full test case format with id, name, test_case_enum, etc.)
   - Add an "Import from Test Case Generator" button that pulls from Page 2 store
3. **Configuration fields for this question:**
   - **Title / Short Text** — text input
   - **Question Key** — text input (defaults to title value)
   - **Toughness** — dropdown: EASY, MEDIUM, HARD
   - **Language** — dropdown: ENGLISH (default), HINDI, etc.
   - **Solution Title** — text input
   - **Solution Description** — text input

Each accordion section should be expandable/collapsible so the page doesn't get overwhelmingly long. Show the question title in the accordion header once the user fills it in (e.g., "Question 1 — Travel Guide Assistant").

**Step 3: Generate**
- A single **"Generate JSON"** button at the bottom
- Generates ONE JSON array containing ALL questions

**Step 4: Output**
- Right panel or bottom section: The generated JSON preview (syntax highlighted, editable)
- **Copy** and **Download JSON** buttons
- The output is a JSON array `[{question1}, {question2}, {question3}, ...]`

### Output JSON Format

The output is a JSON ARRAY where each item follows this structure (same as before, but now there are N items):

```json
[
  {
    "question_id": "[new-uuid-v4]",
    "ide_session_id": "[new-uuid-v4]",
    "short_text": "[Title from Question 1]",
    "question_key": "[Question Key from Question 1]",
    "question_text": "[Full question markdown 1 as escaped string]",
    "content_type": "MARKDOWN",
    "toughness": "EASY",
    "language": "ENGLISH",
    "question_type": "IDE_BASED_CODING",
    "question_asked_by_companies_info": [],
    "question_format": "CODING_PRACTICE",
    "test_cases": [
      {
        "display_text": "[test case name from test cases JSON 1]",
        "weightage": 5.0,
        "test_case_enum": "[test_case_enum from test cases JSON 1]"
      }
    ],
    "multimedia": [],
    "solutions": [
      {
        "order": 1,
        "title": {
          "content": "[Solution Title 1]",
          "content_type": "MARKDOWN"
        },
        "description": {
          "content": "[Solution Description 1]",
          "content_type": "MARKDOWN"
        },
        "ide_session_id": "[new-uuid-v4]"
      }
    ],
    "hints": []
  },
  {
    "question_id": "[new-uuid-v4]",
    "ide_session_id": "[new-uuid-v4]",
    "short_text": "[Title from Question 2]",
    ...same structure...
  },
  {
    "question_id": "[new-uuid-v4]",
    "ide_session_id": "[new-uuid-v4]",
    "short_text": "[Title from Question 3]",
    ...same structure...
  }
]
```

### Key Rules

1. Each question in the array gets its OWN set of new UUID v4 values — `question_id`, `ide_session_id` (top level), and `solutions[0].ide_session_id`. No two questions share any UUID.

2. The test_cases for each question come from that question's specific test cases JSON input. Map them to the simplified format: `name` → `display_text`, `weight` → `weightage` (as float 5.0), `test_case_enum` stays as-is.

3. The `question_text` for each question is that question's specific markdown, properly escaped as a JSON string.

4. This is still pure frontend logic — NO Claude API call needed. Just data assembly and UUID generation.

5. If the user provides test cases in the full format (with id, fail_if, condition, must_contain etc.), only extract the 3 fields needed: `display_text` (from `name`), `weightage` (from `weight`, as float), `test_case_enum`.

### Zustand Store Update

Update the JSON Generator slice in the store to handle multiple questions:

```js
jsonGenerator: {
  numberOfQuestions: 1,
  questions: [
    // Each item in this array represents one question's inputs:
    {
      questionMarkdown: '',
      testCasesJson: '',
      title: '',
      questionKey: '',
      toughness: 'EASY',
      language: 'ENGLISH',
      solutionTitle: '',
      solutionDescription: '',
    }
  ],
  generatedJson: '',  // the final output JSON string
}
```

When `numberOfQuestions` changes:
- If increased (e.g., 1 → 3): add 2 new empty question objects to the array, keeping existing data intact
- If decreased (e.g., 3 → 2): remove from the end, but show a confirmation dialog first ("This will remove Question 3 data. Continue?")
- NEVER clear existing question data when the number changes upward

### UX Details

- Accordion sections should have a subtle color indicator: grey = empty/incomplete, green outline = all fields filled
- When user changes the number input and clicks Set, smoothly animate the new sections appearing
- "Import from..." buttons should show a toast if there's nothing to import ("No data available from Question Generator")
- The Generate button should validate that each question has at minimum: question markdown and title filled in. Show specific validation errors like "Question 2 is missing a title"
- Each accordion header should show: "Question {N}" + title if filled + a small badge showing how many test cases are loaded (e.g., "8 test cases")
