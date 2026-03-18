Add the following features to the JSON Generator page as sub-tabs within it.

## Sub-tab 1: JSON Generation (existing — just update the download)

Update the JSON download behavior:
- Add a **"Resource ID"** text input — user provides a UUID here (this becomes the JSON filename inside the ZIP)
- Add a **"ZIP Title"** text input — user provides the name for the ZIP file
- When downloading, create a ZIP with this structure:
```
IDE_BASED_CODING/
  └── [Resource ID].json
```
- The JSON file inside is named using the Resource ID value
- The ZIP file is named using the ZIP Title value (e.g., `[ZIP Title].zip`)
- Both fields are required before download — show validation if empty

## Sub-tab 2: Load to Platform

This is a helper tab with two steps for uploading to the NKB backend.

**Step 1: Upload JSON**
- Show a clickable link/button that opens `https://nkb-backend-ccbp-beta.earlywave.in/admin/nkb_load_data/uploadfile/add/` in a new tab
- Text: "Open Upload Page"
- Below it, a note: "Upload the generated JSON ZIP file on this page"

**Step 2: Content Loading**
- Show a clickable link/button that opens `https://nkb-backend-ccbp-beta.earlywave.in/admin/nkb_load_data/contentloading/add/` in a new tab
- Text: "Open Content Loading Page"
- Below it, show this JSON block with a **Copy** button:
```json
{
  "load_data_type": "QUESTION_SET",
  "input_dir_path_url": ""
}
```
- When user clicks Copy, it copies this exact JSON to clipboard and shows "Copied!" toast

## Sub-tab 3: Response Processing

This tab processes the response.zip that comes back after loading.

**UI:**

1. **Upload response.zip** — file upload input (accepts .zip only)

2. After upload, extract the ZIP. It contains two files:
   - `ide_based_coding_questions.json` — **USE THIS ONE**
   - `question_sets_questions.json` — IGNORE this file

3. For each question found in `ide_based_coding_questions.json`, display **4 blocks** grouped under a header like "Question 1 — [short_text]":

   **Block 1 — Question ID** (heading as label, Copy button)
   ```
   85f974ff-5606-464b-a187-0d6a5ed0b28e
   ```

   **Block 2 — IDE Session IDs** (heading as label, Copy button)
   ```
   85f974ff-5606-464b-a187-0d6a5ed0b28e
   b41c10e6-c28b-4918-8bd3-e824813a40a1
   ```

   **Block 3 — Paste Test Cases** (textarea input per question)
   - A textarea labeled "Paste test cases for Question 1"
   - User pastes test cases JSON here for THIS specific question
   - Each question has its OWN independent paste area — pasting in one does NOT affect others
   - Also provide an "Import from Test Case Generator" button to pull from Page 2 store

   **Block 4 — Updated Test Cases** (output, Copy button)
   - Once user pastes test cases in Block 3, auto-generate the updated version here
   - Take the pasted test cases, match each by `test_case_enum` with the test case IDs from `ide_based_coding_questions.json` for this question
   - Replace the `id` field in each test case with the matched ID from the response
   - Display in this EXACT format (double curly braces, 2-space indentation, arrays on single line):

   ````
   ```
   test cases: `
   [
     {{
       "id": "81147be2-00f6-41b3-8581-530cd477114c",
       "name": "Check for 'InMemorySaver' import from langgraph.checkpoint.memory",
       "test_case_enum": "IMPORT_INMEMORY_SAVER",
       "type": "static_code_check",
       "fail_if": "The 'InMemorySaver' class is not imported from langgraph.checkpoint.memory.",
       "condition": "The solution imports the InMemorySaver class for memory checkpointing.",
       "must_contain": ["from langgraph.checkpoint.memory import InMemorySaver"],
       "flexibility_note": "Student code must import InMemorySaver from langgraph.checkpoint.memory.",
       "weight": 5
     }},
     {{
       "id": "7092f180-93c5-446d-93c8-18aebe26af46",
       "name": "Check for InMemorySaver instantiation",
       "test_case_enum": "INSTANTIATE_CHECKPOINTER",
       "type": "static_code_check",
       "fail_if": "An instance of InMemorySaver is not created.",
       "condition": "The solution creates a checkpointer instance using InMemorySaver().",
       "must_contain": ["InMemorySaver()"],
       "flexibility_note": "Student code must create an InMemorySaver instance to enable conversational memory.",
       "weight": 5
     }}
   ]
   
   `
   ```
   ````

   **CRITICAL FORMAT RULES for Block 4 output:**
   - Wrap everything in triple backticks (```) for display
   - Start with `test cases: \`` on first line
   - Use `{{` and `}}` instead of `{` and `}` for each test case object
   - Use **2-space indentation** for the object inside `{{`
   - `must_contain` array stays on a **SINGLE LINE** — e.g., `["from langgraph.checkpoint.memory import InMemorySaver"]` NOT expanded across multiple lines
   - `must_call` array (if present) also stays on a single line
   - Each test case object ends with `}},` (comma after closing braces) except the last one
   - Close with `]` then empty line then `` ` `` on its own line
   - Block 4 updates live as user pastes/edits in Block 3
   - If no matching `test_case_enum` found in the response, keep the original ID

4. Repeat this 4-block pattern for every question found in the response.

5. Add a **Copy All** button at the bottom that copies all questions' updated test cases together. Same format rules apply.

**Logic for ID mapping:**
- Extract the response.zip → find and parse `ide_based_coding_questions.json` (ignore `question_sets_questions.json`)
- For each question in `ide_based_coding_questions.json`, get its `question_id` and its `test_cases` array
- The response's test_cases have `test_case_enum` fields — match these with the test cases from Page 2 (Test Case Generator)
- Replace the `id` in the Page 2 test cases with the corresponding ID from `ide_based_coding_questions.json` (matched by `test_case_enum`)
- Output the updated test cases in the double-curly-brace escaped format

**Store in Zustand:**
```js
responseProcessing: {
  responseFile: null,
  extractedQuestions: [],  // [{question_id, short_text, ide_session_ids, test_cases}]
  perQuestionTestCases: {},  // keyed by question_id → { imported: string, pasted: string }
  updatedTestCases: {},    // keyed by question_id → final merged test cases with replaced IDs
}
```

This is all frontend logic — no backend call needed. Use JSZip to extract the uploaded ZIP.