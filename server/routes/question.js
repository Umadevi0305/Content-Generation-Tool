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
    const { solutionCode, prefilledCode, customRules } = req.body;

    if (!solutionCode || !solutionCode.trim()) {
      return res.status(400).json({ error: 'Solution code is required' });
    }

    const systemPrompt = `You are an expert educational content creator for NxtWave's CCBP coding curriculum. You are generating a question markdown for ONE coding question only. Your job is to analyze the provided solution code and generate a question markdown document that guides someone to write this code. Generate the question based ONLY on the solution code and prefilled code provided below. Do not assume or reference any other code, questions, or context.

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
8. "Prompts to be used" section: extract system prompts, tool docstrings, and user queries from the solution code and place them with descriptive labels and context hints in parentheses
9. Submission Instructions: first line is always "python app.py", second line describes what to verify in the output (derived from what the code actually does). Do NOT include a ccbp submit line
10. Bold uses <b> HTML tags in the intro AND completion instructions for key terms (library names, tool names)
11. No "Example Usage" section
12. API key links use target="_blank" rel="noopener noreferrer". Resource doc links use only target="_blank"
13. List all relevant API service links under Set Up Instructions

PREFILLED CODE AWARENESS RULE (CRITICAL):
When prefilled code is provided, you MUST:
- Compare the solution code with the prefilled code LINE BY LINE to identify what's already done vs what the user needs to complete
- In "Functionality to be implemented" (Completion Instructions): ONLY include points that are MISSING from the prefilled code. Do NOT include anything already present in the prefilled code.
- In "Important Note" (test-passing requirements): ONLY include requirements for the parts the user needs to write. Skip requirements for code already in the prefilled code.
- Example: If the prefilled code already has "import os", "from dotenv import load_dotenv", and "load_dotenv()" — do NOT list "Import os" or "Call load_dotenv()" in either section. Only list the steps the user still needs to code.

WRITING STYLE RULES FOR GENERATED CONTENT (CRITICAL):
These rules control HOW you write points. The tone should match these reference examples exactly.

Intro Paragraph Tone:
- Short, one sentence
- Use <b> for the title and main framework/library name
- Describe what it helps USERS do (never say "students")
- Example: "In this project, let's build a <b>SkillMap Agent</b> using <b>LangChain</b> to help users understand skill demand in the industry and find matching job opportunities by combining web search capabilities with real-time job listings."

"Functionality to be implemented" (Completion Instructions) Tone:
- Write at a CONCEPTUAL level — describe WHAT to do, not exact code
- DO mention tool/service names with <b> tags (e.g., <b>Tavily Search</b>, <b>custom job search tool</b>)
- DO mention API/service names in backticks (e.g., \`JSearch API\`, \`RapidAPI\`)
- DON'T mention exact model strings, config values, or class paths
- Keep each point to one concise line
- Reference examples:
  - GOOD: "Set up <b>Tavily Search</b> as a tool for \`skill demand research\`"
  - GOOD: "Create a <b>custom job search tool</b> using the \`JSearch API\` from \`RapidAPI\`"
  - GOOD: "Define a <b>system prompt</b> that guides the agent's behavior"
  - BAD: "Import InMemorySaver from langgraph.checkpoint.memory"
  - BAD: "Define a config dictionary with thread_id set to '1'"

"Important Note" (Test-passing requirements) Tone:
- More specific than Completion Instructions — this is where exact values appear
- DO use inline code formatting for specific function names, model strings, and parameter values
- DO mention exact parameters when they're key requirements
- Keep each point concise — one line, no over-explanation
- Reference examples:
  - GOOD: "Initialize the model with \`\\"google_genai:gemini-2.5-flash\\"\`"
  - GOOD: "Configure \`TavilySearch\` with \`max_results=5\` and \`search_depth=\\"advanced\\"\`"
  - GOOD: "Use \`create_agent()\` with model, tools, and \`system_prompt\` as parameters"
  - GOOD: "Invoke the agent with the user query"
- For parts that should be discovered (memory, config, debug), use conceptual hints:
  - GOOD: "Import the required memory checkpointer class"
  - GOOD: "A configuration dictionary must be created with a configurable thread identifier"
  - GOOD: "Enable debug mode when creating the agent"
  - BAD: "Import InMemorySaver from langgraph.checkpoint.memory"
  - BAD: "config = {\\"configurable\\": {\\"thread_id\\": \\"1\\"}}"
  - BAD: "Pass debug=True to create_agent"
- Follow a logical order matching code flow: imports → initialization/setup → wiring → invocation
- Each requirement should be a standalone testable statement`;

    let userPrompt = `You are generating a question for ONE coding question only. Analyze ONLY the solution code below and generate a question markdown document. Do not reference any other questions or code.\n\nSolution Code:\n\`\`\`\n${solutionCode}\n\`\`\``;

    if (prefilledCode && prefilledCode.trim()) {
      userPrompt += `\n\nPREFILLED CODE (starter code given to the student):\n\`\`\`\n${prefilledCode}\n\`\`\`\n\nIMPORTANT: The prefilled code above is already provided to the student. Do NOT include any instructions, completion steps, or notes for functionality that is already implemented in the prefilled code. Only describe the parts the student needs to write themselves (i.e., what exists in the solution code but NOT in the prefilled code).`;
    }

    if (customRules && customRules.trim()) {
      userPrompt += `\n\nADDITIONAL CUSTOM RULES (follow these strictly):\n${customRules}`;
    }

    const markdown = await generateWithClaude(systemPrompt, userPrompt);
    res.json({ markdown });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate question' });
  }
});

export default router;
