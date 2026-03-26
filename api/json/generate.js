import { v4 as uuidv4 } from 'uuid';
import { cors } from '../lib/cors.js';

export default function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      questionMarkdown,
      testCases,
      title,
      toughness,
      language,
      solutionTitle,
      solutionDescription,
    } = req.body;

    if (!questionMarkdown || !title) {
      return res.status(400).json({ error: 'Question markdown and title are required' });
    }

    const formattedTestCases = (testCases || []).map((tc) => ({
      id: uuidv4(),
      display_text: tc.name || tc.display_text,
      weightage: 5,
      metadata: null,
      test_case_enum: tc.test_case_enum,
    }));

    const score = formattedTestCases.length * 5;

    const questionJson = [
      {
        question_type: 'IDE_BASED_CODING',
        question: {
          question_id: uuidv4(),
          content: questionMarkdown,
          short_text: title,
          multimedia: [],
          language: language || 'ENGLISH',
          content_type: 'MARKDOWN',
          difficulty: toughness || 'EASY',
          default_tag_names: [],
          concept_tag_names: [],
          metadata: null,
        },
        question_asked_by_companies_info: [],
        ide_session_id: uuidv4(),
        test_cases: formattedTestCases,
        score,
        solutions: [
          {
            order: 1,
            title: {
              content: solutionTitle || 'Solution',
              content_type: 'MARKDOWN',
            },
            description: {
              content: solutionDescription || `An approach to build the ${title}`,
              content_type: 'MARKDOWN',
            },
            ide_session_id: uuidv4(),
          },
        ],
        hints: [],
      },
    ];

    res.json({ questionJson });
  } catch (error) {
    console.error('JSON generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate JSON' });
  }
}
