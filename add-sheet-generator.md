Remove the separate "Session Display ID Generator" page. Instead, add a **"Sheet Generator"** page in the sidebar (after ZIP Generator).

Session Display IDs (like GENAI578TR) are now generated internally — prefix "GENAI" + 5 random uppercase alphanumeric characters. No separate page needed.

UUIDs for JSON (question_id, ide_session_id etc.) are also generated internally during JSON generation. No separate page needed for that either.

---

## Sheet Generator Page

### Top-Level Inputs

- **Resource ID** — text input (user provides this once, used across all subsheets)
- **Tests Download URL** — text input (user provides once, same for all question rows)
- **"Generate Sheet"** button
- **"Download .xlsx"** button

All other data is auto-imported from the project store (question JSON, solution codes, test cases).

### The .xlsx file has 3 subsheets. Here are the exact rules:

---

### Subsheet 1: ide_sessions

Columns: `session_id | session_display_id | boilerplate_code_s3_url | user_directory_path | is_submit_enabled | tests_download_url | test_type | metadata | resource_id | is_deploy_enabled | session_url | ide_type`

**2 rows per question** (Row 1 = question/prefilled, Row 2 = solution):

| Column | Row 1 (Question) | Row 2 (Solution) |
|--------|-------------------|-------------------|
| session_id | `ide_session_id` from generated question JSON | `solutions[0].ide_session_id` from generated question JSON |
| session_display_id | Auto-generate: GENAI + 5 random alphanumeric | Auto-generate: GENAI + 5 random alphanumeric (different from Row 1) |
| boilerplate_code_s3_url | **Leave blank** | **Leave blank** |
| user_directory_path | `/home/nxtwave/[QuestionTitleNoSpaces]` (e.g., `/home/nxtwave/ResearchPaperAssistant`) | `/home/nxtwave/Solution` |
| is_submit_enabled | TRUE | FALSE |
| tests_download_url | User-provided URL from top input | *(leave empty)* |
| test_type | DATASCIENCE | DATASCIENCE |
| metadata | See JSON below | See JSON below (with extra newline before closing `}`) |
| resource_id | User-provided Resource ID | User-provided Resource ID |
| is_deploy_enabled | FALSE | FALSE |
| session_url | *(leave empty)* | *(leave empty)* |
| ide_type | CCBP_IDE_V2 | CCBP_IDE_V2 |

**Metadata JSON for Row 1 (Question):**
```json
{
    "session_type": "QUESTION",
    "question_id": "[from generated question JSON]",
    "resource_id": "[user-provided Resource ID]",
    "runtime": "DATASCIENCE",
    "requirements_enum": "GENAI"
}
```

**Metadata JSON for Row 2 (Solution):**
```json
{
    "session_type": "QUESTION",
    "question_id": "[from generated question JSON]",
    "resource_id": "[user-provided Resource ID]",
    "runtime": "DATASCIENCE",
    "requirements_enum": "GENAI"
 
}
```
*(Note: solution row metadata has an extra blank line before closing brace — match reference exactly)*

**user_directory_path logic:** Take the question's `short_text` / title, remove all spaces, use as folder name. Example: "Research Paper Assistant" → `/home/nxtwave/ResearchPaperAssistant`

---

### Subsheet 2: PromptConfigDetails

Columns: `id | name_enum | prompt | count | field name | field title`

**Per unique prompt config (one per question or shared if test structures match):**

- **Row 1:** `id` = new UUID, `name_enum` = LLM_AI_EVALUATION, `prompt` = THE FULL EVALUATION PROMPT (see critical rule below), `count` = number of test cases
- **Row 2:** *(id, name_enum, prompt, count all empty)*, `field name` = passed_test_cases_count, `field title` = No.of Test cases passed
- **Row 3:** *(empty)*, `field name` = total_test_cases_count, `field title` = Total No.of Test Cases
- **Row 4:** *(empty)*, `field name` = test_case_details, `field title` = Test Case Details

Then repeat Row 1-4 pattern for next prompt config if needed.

**CRITICAL PROMPT RULE:**
The `prompt` column must contain the EXACT evaluation prompt text provided below. Do NOT modify, summarize, or rephrase ANY part of it. The ONLY thing that changes between prompt configs is the `test cases:` section — replace it with the specific question's test cases (using `{{` `}}` escaped format with IDs from the generated question JSON).

The prompt template is the full evaluation prompt the user provided (META ROLE through the final JSON instruction). The dynamic parts are:
- `{question_text}` — replaced with the question markdown
- `{actual_answer}` — replaced with the solution code
- `{user_answer}` — stays as `{user_answer}` (this is a placeholder for runtime)
- The test cases block — replaced with this question's test cases in `{{` `}}` format, with IDs taken from the generated question JSON (matched by test_case_enum)

---

### Subsheet 3: AIEvaluationDetails

Columns: `question_id | answer | prompt_config_id | response_evaluation_field_config_exists | name | value | data_type | operator | textual_answer_url | service_enum`

**1 row per question:**

| Column | Value |
|--------|-------|
| question_id | From generated question JSON |
| answer | The full solution code for this question |
| prompt_config_id | The `id` from this question's PromptConfigDetails row |
| response_evaluation_field_config_exists | TRUE |
| name | passed_test_cases_count |
| value | 6 *(default, user can change)* |
| data_type | FLOAT |
| operator | GREATER_THAN_OR_EQUAL |
| textual_answer_url | **Leave blank** (user fills after uploading) |
| service_enum | AZURE_OPENAI/gpt-5-chat/gpt-5-chat |

---

## Auto-Import Sources

| Data | Imported From |
|------|--------------|
| question_id, ide_session_id, solution ide_session_id | JSON Generator (generated question JSON) |
| session_display_id | Auto-generated internally (GENAI + 5 random chars) |
| Solution code | Project store (per question) |
| Test cases with IDs | JSON Generator + Test Case Generator |
| Question title (for user_directory_path) | JSON Generator (short_text) |
| Resource ID | User input on this page |

## Implementation

Use **SheetJS** (frontend) or **ExcelJS** (backend) to create the .xlsx. Download as a proper .xlsx file. Store all inputs in Zustand.
