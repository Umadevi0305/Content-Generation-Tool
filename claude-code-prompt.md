# Project: NxtWave Content Creation Tool

## Overview
Build a full-stack web application for creating educational coding questions, test cases, JSON configs, and ZIP bundles — used internally at NxtWave for CCBP curriculum content production.

**Tech Stack:**
- Frontend: React (Vite) + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express
- AI: Anthropic Claude API (for question generation and test case generation)
- File handling: archiver (for ZIP), uuid (for IDs)

---

## Application Structure

```
nxtwave-content-tool/
├── client/                  # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── QuestionGenerator.jsx
│   │   │   ├── TestCaseGenerator.jsx
│   │   │   ├── JsonGenerator.jsx
│   │   │   └── ZipGenerator.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── CodeEditor.jsx       # Monaco or simple textarea with syntax highlighting
│   │   │   ├── MarkdownPreview.jsx
│   │   │   └── CopyButton.jsx
│   │   └── utils/
│   │       └── api.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/
│   ├── index.js
│   ├── routes/
│   │   ├── question.js
│   │   ├── testcases.js
│   │   ├── json.js
│   │   └── zip.js
│   ├── services/
│   │   ├── claude.js            # Claude API integration
│   │   └── zipBuilder.js
│   ├── templates/               # Reference format templates
│   │   ├── question-format.md
│   │   ├── testcase-format.json
│   │   └── json-format.json
│   └── package.json
├── .env
└── README.md
```

---

## Page 1: Question Text Generator

### UI Layout
- Left panel: Code editor area labeled **"Solution Code"** — a large textarea/code editor where user pastes their Python/JS solution code
- Right panel: Generated question markdown preview with **Copy** and **Download as .md** buttons
- Bottom section: A **"Generate Question"** button

### Functionality
1. User pastes their **solution code** into the editor
2. Clicks **"Generate Question"**
3. Backend sends the solution code to Claude API with a prompt that instructs it to:
   - Analyze what the code does
   - Generate a question markdown document following the EXACT format below
4. The generated markdown appears in the right panel with live preview
5. User can **edit** the generated markdown inline
6. User can **Copy** or **Download as .md**

### Question Markdown Format (MUST match this structure exactly)

```markdown
# [Title of the Project]

In this project, let's build a <b>**[Title]</b> using Python that utilizes <b>[Framework/Library]</b> to create [brief description of what it does].

You will be provided with <b>prefilled code</b>, and your task is to complete it using [key concepts] to interact with the model.


### Set Up Instructions

<details>
<summary>Click to view</summary>

* Have API keys and credentials ready for:

  *  <a href="[relevant_api_link]" target="_blank" rel="noopener noreferrer">
[Service Name]
</a>
* Store your API key in Google Colab's userdata with the key name:

\```
[API_KEY_NAME]="your_api_key_here"
\```

</details>

### Completion Instructions

<details>
<summary>Functionality to be implemented</summary>
<br/>

Your code should implement the following functionality:

* [Step 1 - Import statements]
* [Step 2 - API key access]
* [Step 3 - Create SystemMessage/config]
* [Step 4 - Create HumanMessage/input]
* [Step 5 - Store in list/structure]
* [Step 6 - Initialize model]
* [Step 7 - Invoke/call model]
* [Step 8 - Print/display response]

</details>


### Important Note

<details>
<summary>Click to view</summary>
<br>
**The following instructions are required for the tests to pass:**

* [Requirement 1]
* [Requirement 2]
* [Requirement 3]
* ...

</details>


### Resources

<details>
<summary>Documentation & Tutorials</summary>

* <a href="[link]" target="_blank">[Resource Name]</a>
* ...

</details>

<details>
<summary>Prompts to be used</summary>
<br>

**[Prompt Label 1]:** (Use this as the [context for where to use it])
\```
[Prompt text 1]
\```

**[Prompt Label 2]:**
\```
[Prompt text 2]
\```

**[Prompt Label 3]:**
\```
[Prompt text 3]
\```

</details>

### Submission Instructions

<details>
<summary>Click to view</summary>

* Check the implementation and run your code using command `python app.py`.
* [Verification instruction specific to the question, e.g., "Verify the output contains both internship preparation tips and internship listings with apply links."]

</details>
```

---

## Page 2: Test Case Generator

### UI Layout
- Top section with 3 input areas side by side (or tabbed):
  1. **Solution Code** — textarea/code editor
  2. **Prefilled Code** — textarea/code editor (optional, can be empty)
  3. **Question Markdown** — textarea/markdown editor
- Middle section — Configuration panel:
  - **Number of test cases** — number input (default: 8, min: 1, max: 20)
  - **Custom Rules** — textarea where user can type rules like:
    - "Do NOT generate a test case for print statement"
    - "Must check for specific import X"
    - "Ignore dotenv check"
  - **Generate Test Cases** button
- Bottom section — Generated test cases displayed as **editable cards/rows**:
  - Each test case card shows: name, test_case_enum, type, fail_if, condition, must_contain, flexibility_note, weight
  - Each card has: **Edit** (inline edit all fields), **Delete** (remove that test case), **Copy** (copy individual test case JSON)
  - **Copy All** button — copies the entire test cases JSON
  - **Download JSON** button

### Test Case JSON Format (MUST match exactly)

```json
{
  "test_cases": [
    {
      "id": "[uuid-v4]",
      "name": "Check for 'os' import",
      "test_case_enum": "IMPORT_OS",
      "type": "static_code_check",
      "fail_if": "The 'os' module is not imported.",
      "condition": "The solution utilizes the 'os' module.",
      "must_contain": [
        "import os"
      ],
      "flexibility_note": "Student code must import the 'os' module.",
      "weight": 5
    }
  ],
  "final_verdict_rule": {
    "logic": "ALL test cases must pass",
    "on_failure": "FAIL",
    "on_success": "PASS"
  }
}
```

### Key Rules for Test Case Generation
- Each test case gets a fresh UUID v4 as `id`
- `test_case_enum` should be SCREAMING_SNAKE_CASE derived from the check name
- `type` is always `"static_code_check"`
- `must_contain` array should list the exact code patterns to look for — support BOTH single-quote and double-quote variants where applicable
- Some test cases may use `must_call` instead of `must_contain` for function call checks
- `weight` defaults to 5
- The `final_verdict_rule` is always appended at the end
- The tone and detail level of `fail_if`, `condition`, and `flexibility_note` should match the reference format exactly

### Claude API Prompt for Test Case Generation
When sending to Claude API, include:
- The solution code
- The prefilled code (if any)
- The question markdown
- The desired number of test cases
- Any custom rules the user provided
- The reference test case format as an example
- Instruction: "Generate test cases that verify the student's code matches the solution's structure. Focus on imports, API key retrieval, function calls, and output patterns. Use the EXACT same JSON format and tone as the reference."

---

## Page 3: JSON Generator

### UI Layout
- Left panel with 2 input areas:
  1. **Question Markdown** — textarea (paste or auto-filled from Page 1)
  2. **Test Cases JSON** — textarea (paste or auto-filled from Page 2)
- Configuration fields:
  - **Title / Short Text** — text input
  - **Question Key** — text input (defaults to title)
  - **Toughness** — dropdown: EASY, MEDIUM, HARD
  - **Language** — dropdown: ENGLISH (default), HINDI, etc.
  - **Solution Title** — text input
  - **Solution Description** — text input
- **Generate JSON** button
- Right panel: Generated JSON preview (syntax highlighted, editable)
- **Copy** and **Download JSON** buttons

### Output JSON Format (MUST match exactly)

```json
[
  {
    "question_id": "[new-uuid-v4]",
    "ide_session_id": "[new-uuid-v4]",
    "short_text": "[Title]",
    "question_key": "[Question Key]",
    "question_text": "[Full question markdown as escaped string]",
    "content_type": "MARKDOWN",
    "toughness": "EASY",
    "language": "ENGLISH",
    "question_type": "IDE_BASED_CODING",
    "question_asked_by_companies_info": [],
    "question_format": "CODING_PRACTICE",
    "test_cases": [
      {
        "display_text": "[test case name from test cases JSON]",
        "weightage": 5.0,
        "test_case_enum": "[test_case_enum from test cases JSON]"
      }
    ],
    "multimedia": [],
    "solutions": [
      {
        "order": 1,
        "title": {
          "content": "[Solution Title]",
          "content_type": "MARKDOWN"
        },
        "description": {
          "content": "[Solution Description]",
          "content_type": "MARKDOWN"
        },
        "ide_session_id": "[new-uuid-v4]"
      }
    ],
    "hints": []
  }
]
```

### Important Notes for JSON Generation
- Generate NEW UUID v4 for: `question_id`, `ide_session_id` (top level), and `solutions[0].ide_session_id`
- The `test_cases` array in the output JSON uses a SIMPLIFIED format (only `display_text`, `weightage`, `test_case_enum`) — NOT the full test case objects from Page 2
- `display_text` maps to the `name` field from the test cases JSON
- `weightage` is always `5.0` (float)
- `question_text` must contain the full markdown as a properly escaped JSON string (newlines as `\n`, quotes escaped, etc.)
- This is pure frontend logic — NO Claude API call needed for this page

---

## Page 4: ZIP Generator

### UI Layout — Two sections side by side or tabbed:

#### Section A: Prefilled Code ZIP
- **ZIP File Name** — text input (user provides the name, e.g., "PrefillCode")
- **app.py Code** — large code editor textarea
- **.env Content** — textarea (e.g., `GEMINI_API_KEY="your_api_key_here"`)
- **requirements.txt Content** — textarea (optional, can be left empty)
- **Generate Prefilled ZIP** button → downloads `[UserProvidedName].zip`

#### Section B: Solution Code ZIP
- **app.py Code** — large code editor textarea
- **.env Content** — textarea
- **requirements.txt Content** — textarea (optional)
- **Generate Solution ZIP** button → downloads `Solution.zip` (always named Solution.zip)

### ZIP Structure
```
[ZipName].zip
├── app.py
├── .env
└── requirements.txt    (only included if content is provided)
```

### Implementation
- Use JSZip on the frontend OR send to backend which uses `archiver` npm package
- The ZIP should contain the files at root level (no nested folder inside the ZIP)
- If requirements.txt is empty/blank, do NOT include it in the ZIP
- File encoding: UTF-8

---

## Backend API Endpoints

```
POST /api/question/generate
  Body: { solutionCode: string }
  Returns: { markdown: string }

POST /api/testcases/generate
  Body: { 
    solutionCode: string, 
    prefilledCode: string, 
    questionMarkdown: string, 
    numberOfTestCases: number, 
    customRules: string 
  }
  Returns: { testCases: object }

POST /api/json/generate
  Body: { 
    questionMarkdown: string, 
    testCases: array, 
    title: string, 
    questionKey: string, 
    toughness: string, 
    language: string, 
    solutionTitle: string, 
    solutionDescription: string 
  }
  Returns: { questionJson: array }

POST /api/zip/generate
  Body: { 
    zipName: string, 
    appCode: string, 
    envContent: string, 
    requirementsContent: string 
  }
  Returns: ZIP file (binary download)
```

---

## Design Requirements

### Theme
- Dark theme with a professional, clean look
- Sidebar navigation with icons for each page
- Use a color palette: dark backgrounds (#0f1117, #1a1b26), accent blue (#3b82f6), green for success (#22c55e)
- Monospace font for code areas (JetBrains Mono or Fira Code from Google Fonts)
- Sans-serif for UI text (DM Sans or similar)

### UX Requirements
- Toast notifications for copy/download actions
- Loading spinners during API calls
- Responsive — works on desktop (primary) and tablet
- Syntax highlighting in code editors (use a lightweight lib like react-simple-code-editor + prism.js, or just styled textareas)
- All generated outputs must be EDITABLE before copy/download
- Smooth page transitions

### Navigation (Sidebar)
1. Question Generator (icon: FileText)
2. Test Case Generator (icon: TestTube)
3. JSON Generator (icon: Braces)
4. ZIP Generator (icon: Archive)

---

## Environment Variables

```
ANTHROPIC_API_KEY=your_claude_api_key
PORT=3001
```

The frontend runs on port 5173 (Vite default), backend on port 3001.

---

## Critical Implementation Notes

1. **Claude API calls** should use the `@anthropic-ai/sdk` npm package on the backend. Use `claude-sonnet-4-20250514` model.

2. **For Question Generation prompt**, include the solution code and instruct Claude to follow the exact markdown template shown above. The prompt should say: "Analyze this solution code and generate a question markdown document that a student would follow to write this code. Use the exact HTML/markdown structure provided in the template."

3. **For Test Case Generation prompt**, include ALL three inputs (solution, prefilled, question) plus custom rules. The prompt must include the reference test case format as a few-shot example.

4. **JSON Generation** does NOT need Claude API — it's pure data transformation on the frontend or backend. Just map test cases to the simplified format, generate UUIDs, and assemble the JSON.

5. **ZIP Generation** can be done entirely on the frontend using JSZip library. No backend call needed.

6. Make sure all **Copy** buttons copy to clipboard and show a "Copied!" toast.

7. Make sure all **Download** buttons trigger proper file downloads with correct filenames and MIME types.

8. **Error handling**: Show user-friendly error messages if Claude API fails, if inputs are missing, etc.

---

## Setup & Run Instructions

After building, the project should be runnable with:

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Run backend
cd server && node index.js

# Run frontend (in another terminal)
cd client && npm run dev
```

Or provide a root `package.json` with concurrent scripts to run both.
