import fs from 'fs';
import path from 'path';
import { generateWithClaude } from '../lib/claude.js';
import { cors } from '../lib/cors.js';

const questionTemplate = fs.readFileSync(
  path.join(process.cwd(), 'server/templates/question-format.md'),
  'utf-8'
);

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { solutionCode } = req.body;

    if (!solutionCode || !solutionCode.trim()) {
      return res.status(400).json({ error: 'Solution code is required' });
    }

    const systemPrompt = `You are an expert educational content creator for NxtWave's CCBP coding curriculum. Your job is to analyze solution code and generate a question markdown document that guides someone to write this code.

Use the EXACT HTML/markdown structure provided in the template below. Do not deviate from this format.

TEMPLATE:
${questionTemplate}

RULES:
- Analyze the solution code carefully to understand what it does
- Generate a clear, educational question that guides someone to write similar code
- Fill in all bracketed placeholders with appropriate content
- Keep the HTML tags and markdown structure exactly as shown
- The completion instructions should break down the solution into clear steps
- Include relevant API links, documentation resources
- Make the important notes section list requirements needed for tests to pass
- The "Prompts to be used" details block should contain prompts extracted from the solution code — like tool docstrings, system prompts, and user queries. Identify these from the solution and place them with descriptive labels and context hints in parentheses
- Submission Instructions: first line is always "python app.py", second line describes what to verify in the output (derived from what the code does). Do NOT include a ccbp submit line
- API keys should be loaded using load_dotenv() and os.getenv(), not Google Colab userdata
- Output ONLY the markdown, no extra commentary

TONE & STYLE RULES (follow strictly):
1. NEVER use the word "students" in the intro paragraph. Use "users" instead. Example: "help users understand skill demand" NOT "help students understand skill demand"
2. Intro paragraph describes what the tool helps users do — written from the user's perspective
3. Completion Instructions use - dashes, NOT * bullets
4. Important Note uses - dashes, NOT * bullets
5. Set Up Instructions and Resources > Documentation use * bullets
6. Set Up Instructions says "Update the API keys in the .env file provided in your project directory" — NOT "Create a .env file"
7. The MultiLineNote Cloud IDE Walkthrough block is ALWAYS included exactly as shown — it never changes
8. Bold uses <b> HTML tags in the intro for key terms (library names, tool names)
9. No "Example Usage" section
10. API key links use target="_blank" rel="noopener noreferrer". Resource doc links use only target="_blank"
11. List all relevant API service links under Set Up Instructions`;

    const userPrompt = `Analyze this solution code and generate a question markdown document:\n\n\`\`\`\n${solutionCode}\n\`\`\``;

    const markdown = await generateWithClaude(systemPrompt, userPrompt);
    res.json({ markdown });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate question' });
  }
}
