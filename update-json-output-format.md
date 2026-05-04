Update the JSON Generator download to produce a ZIP with exactly 2 files (not folders — just 2 JSON files at root level inside the ZIP):

```
[ZIP Title].zip
├── ide_based_coding_questions.json
└── question_sets_questions.json
```

---

## File 1: ide_based_coding_questions.json

Each question must follow this EXACT nested structure:

```json
[
  {
    "question_type": "IDE_BASED_CODING",
    "question": {
      "question_id": "[generated UUID]",
      "content": "[full question markdown as escaped string]",
      "short_text": "[title]",
      "multimedia": [],
      "language": "ENGLISH",
      "content_type": "MARKDOWN",
      "difficulty": "[EASY/MEDIUM/HARD]",
      "default_tag_names": [],
      "concept_tag_names": [],
      "metadata": null
    },
    "question_asked_by_companies_info": [],
    "ide_session_id": "[generated UUID — question session]",
    "test_cases": [
      {
        "id": "[generated UUID]",
        "display_text": "[test case name]",
        "weightage": 5,
        "metadata": null,
        "test_case_enum": "[TEST_CASE_ENUM]"
      }
    ],
    "score": 35,
    "solutions": [
      {
        "order": 1,
        "title": {
          "content": "[solution title]",
          "content_type": "MARKDOWN"
        },
        "description": {
          "content": "[solution description]",
          "content_type": "MARKDOWN"
        },
        "ide_session_id": "[generated UUID — solution session]"
      }
    ],
    "hints": []
  }
]
```

**Key rules:**
- `question` is a nested object containing `question_id`, `content`, `short_text`, `difficulty` etc.
- `ide_session_id` is at top level (this is the question/prefilled session ID)
- `solutions[0].ide_session_id` is a separate UUID (this is the solution session ID)
- `test_cases[].weightage` is integer `5` (not float `5.0`)
- `test_cases[].metadata` is always `null`
- `score` = number of test cases × 5 (e.g., 7 test cases = 35)
- `difficulty` maps from toughness dropdown (EASY/MEDIUM/HARD)
- `hints` is always empty array `[]`
- `question_asked_by_companies_info` is always empty array `[]`

---

## File 2: question_sets_questions.json

Maps each question to a question set. The `question_set_id` is the **Resource ID** the user provides.

```json
[
  {
    "question_set_id": "[Resource ID]",
    "question_id": "[question_id from question 1]",
    "order": 2
  },
  {
    "question_set_id": "[Resource ID]",
    "question_id": "[question_id from question 2]",
    "order": 3
  },
  {
    "question_set_id": "[Resource ID]",
    "question_id": "[question_id from question 3]",
    "order": 4
  }
]
```

**Key rules:**
- `question_set_id` is the SAME Resource ID for ALL entries
- `question_id` comes from each question's `question.question_id`
- `order` starts at **2** and increments: 2, 3, 4, 5...
- One entry per question

---

## UI Requirements

- **Resource ID** text input on JSON Generator page (used as `question_set_id`)
- **ZIP Title** text input (used as ZIP filename)
- Preview both files in separate tabs before download
- Download button produces the ZIP with both files
