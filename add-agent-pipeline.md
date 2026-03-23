Add an **Agent Pipeline Mode** — a guided wizard that automates the entire content creation flow. User only provides inputs at the start, then reviews and accepts/rejects at each phase.

## How to Access

Add a toggle at the top of the app: **"Manual Mode"** (current) ↔ **"Agent Pipeline Mode"** (new). When Agent Pipeline is active, it replaces the sidebar with a step-by-step wizard view.

## The Pipeline Flow

### Phase 0: Setup (User Input)

Show input fields for EACH question (based on project session count):

Per question:
- **Solution Code** — paste or upload (REQUIRED)
- **Prefilled Code** — paste or upload (REQUIRED)
- **.env content** — textarea
- **requirements.txt** — textarea (optional)
- **Upload additional files** — drag/drop (optional)

Once all questions have solution + prefilled code filled:
- **"Start Pipeline"** button

---

### Phase 1: Question MD Generation (Auto)

**What the agent does:**
- For each question, sends solution code + prefilled code to Claude API
- Auto-generates the question markdown using all the format and tone rules already defined
- Shows generated MD per question in a preview panel

**User action:**
- Review each question's MD
- Can **edit inline** if needed
- Per question: **Accept ✅** or **Regenerate 🔄** button
- Once ALL questions are accepted → **"Proceed to Phase 2"** button appears

---

### Phase 2: Test Case Generation (Auto)

**What the agent does:**
- For each question, sends solution code + prefilled code + accepted question MD to Claude API
- Auto-generates test cases (default: 8 per question)
- Shows test case cards per question

**User action:**
- Review test cases for each question
- Can edit/delete/add individual test cases
- Per question: **Accept ✅** or **Regenerate 🔄**
- Once ALL accepted → **"Proceed to Phase 3"**

---

### Phase 3: Auto-Evaluation (Auto)

**What the agent does:**
- For each question, generates 3-5 student variants automatically (using the Student Simulator agent)
- Evaluates each variant against the accepted test cases
- Shows summary table + detail cards per question

**User action:**
- Review the evaluation results
- If test cases have issues (wrong pass/fail), go back to Phase 2 to fix them — **"Back to Phase 2"** button
- If results look good: **Accept ✅**
- Once ALL accepted → **"Proceed to Phase 4"**

---

### Phase 4: JSON Generation (Auto)

**What the agent does:**
- Assembles the question JSON array automatically using:
  - Accepted question MDs
  - Accepted test cases (simplified format)
  - Auto-generated UUIDs
- Auto-fills title, question_key from question MD heading
- Shows the generated JSON preview

**User action:**
- Review the JSON
- Can edit title, toughness, language, solution title/description fields
- **Accept ✅** → proceeds to Phase 5

---

### Phase 5: ZIP Generation (Auto)

**What the agent does:**
- For each question, auto-generates:
  - **Prefilled ZIP** — using prefilled code, .env, requirements.txt, uploaded files, auto-generated .gitignore
  - **Solution ZIP** — using solution code, .env, requirements.txt, uploaded files, auto-generated .gitignore
  - **Question JSON ZIP** — `IDE_BASED_CODING/[uuid].json`
- Shows download buttons for all ZIPs

**User action:**
- Download all ZIPs
- **"Open Upload Page"** and **"Open Content Loading Page"** buttons (same as Load to Platform sub-tab)
- **"Pipeline Complete ✅"** button — marks project as done

---

## UI Design

### Wizard Layout
- Left side: vertical step indicator showing all 5 phases with status:
  - ⬜ Not started
  - 🔄 In progress
  - ✅ Completed
  - Current phase highlighted
- Right side: the active phase content
- Top: progress bar showing "Phase 2 of 5 — Test Case Generation"

### Per-Question Navigation
Within each phase, show tabs for "Question 1", "Question 2", etc. with accept status per question:
- "Question 1 ✅" (accepted)
- "Question 2 🔄" (reviewing)
- "Question 3 ⬜" (not yet generated)

### Controls
- **Back** button — go to previous phase (with warning if current phase has unsaved changes)
- **Skip to Manual** — exits pipeline mode and opens the regular manual tabs with all current data preserved
- Each phase auto-saves to the Zustand project store

## Backend

No new endpoints needed — reuses existing:
- `POST /api/question/generate` — Phase 1
- `POST /api/testcases/generate` — Phase 2
- `POST /api/testcases/auto-evaluate` — Phase 3
- JSON generation is frontend logic — Phase 4
- ZIP generation is frontend logic — Phase 5

## Zustand Store Addition

```js
pipeline: {
  mode: 'manual',           // 'manual' | 'pipeline'
  currentPhase: 0,          // 0-4
  phaseStatus: [            // per phase
    'not_started',          // 'not_started' | 'in_progress' | 'completed'
    'not_started',
    'not_started',
    'not_started',
    'not_started',
  ],
  perQuestion: [            // per question acceptance tracking
    {
      questionMdAccepted: false,
      testCasesAccepted: false,
      evaluationAccepted: false,
    },
    // ... one per question
  ],
}
```

## Key Rules
- Pipeline mode and manual mode share the SAME project data store — switching between modes doesn't lose data
- User can exit pipeline mode anytime and continue manually
- Pipeline only moves forward when ALL questions in the current phase are accepted
- Each phase sends data to the next — no manual copy-pasting between phases
- If user goes back to a previous phase and changes something, subsequent phases reset to "not started" for that question
