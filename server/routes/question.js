import { Router } from 'express';
import { generateWithClaude } from '../services/claude.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const questionTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/question-format.md'),
  'utf-8'
);

router.post('/generate', async (req, res) => {
  try {
    const { solutionCode } = req.body;

    if (!solutionCode || !solutionCode.trim()) {
      return res.status(400).json({ error: 'Solution code is required' });
    }

    const systemPrompt = `You are an expert educational content creator for NxtWave's CCBP coding curriculum. Your job is to analyze solution code and generate a question markdown document that a student would follow to write this code.

Use the EXACT HTML/markdown structure provided in the template below. Do not deviate from this format.

TEMPLATE:
${questionTemplate}

RULES:
- Analyze the solution code carefully to understand what it does
- Generate a clear, educational question that guides a student to write similar code
- Fill in all bracketed placeholders with appropriate content
- Keep the HTML tags and markdown structure exactly as shown
- The completion instructions should break down the solution into clear steps
- Include relevant API links, documentation resources
- Make the important notes section list requirements needed for tests to pass
- The "Prompts to be used" details block should contain prompts extracted from the solution code — like tool docstrings, system prompts, and user queries. Identify these from the solution and place them with proper labels
- Submission Instructions: first line is always "python app.py", second line describes what to verify in the output (derived from what the code does), third line is the ccbp submit command
- API keys should be loaded using load_dotenv() and os.getenv(), not Google Colab userdata
- Output ONLY the markdown, no extra commentary`;

    const userPrompt = `Analyze this solution code and generate a question markdown document:\n\n\`\`\`\n${solutionCode}\n\`\`\``;

    const markdown = await generateWithClaude(systemPrompt, userPrompt);
    res.json({ markdown });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate question' });
  }
});

export default router;
