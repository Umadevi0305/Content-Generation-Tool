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
      questionKey,
      toughness,
      language,
      solutionTitle,
      solutionDescription,
    } = req.body;

    if (!questionMarkdown || !title) {
      return res.status(400).json({ error: 'Question markdown and title are required' });
    }

    const simplifiedTestCases = (testCases || []).map((tc) => ({
      display_text: tc.name || tc.display_text,
      weightage: 5.0,
      test_case_enum: tc.test_case_enum,
    }));

    const questionJson = [
      {
        question_id: uuidv4(),
        ide_session_id: uuidv4(),
        short_text: title,
        question_key: questionKey || title,
        question_text: questionMarkdown,
        content_type: 'MARKDOWN',
        toughness: toughness || 'EASY',
        language: language || 'ENGLISH',
        question_type: 'IDE_BASED_CODING',
        question_asked_by_companies_info: [],
        question_format: 'CODING_PRACTICE',
        test_cases: simplifiedTestCases,
        multimedia: [],
        solutions: [
          {
            order: 1,
            title: {
              content: solutionTitle || 'Solution',
              content_type: 'MARKDOWN',
            },
            description: {
              content: solutionDescription || '',
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
