Update the Question Generator's Claude API prompt template to use this EXACT format and tone. This is the reference — all generated questions must match this structure, tone, and style precisely.

## Complete Question Markdown Template

```markdown
# [Title]

In this project, let's build a <b>[Title]</b> using Python that utilizes <b>[Framework/Library]</b> to [what it helps users do — describe from the user's perspective, NOT student's perspective].

### Set Up Instructions

<details>
<summary>Click to view</summary>

* Have API keys and credentials ready for:
  * <a href="[api_link_1]" target="_blank" rel="noopener noreferrer">[Service Name 1]</a>
  * <a href="[api_link_2]" target="_blank" rel="noopener noreferrer">[Service Name 2]</a>
  
* Update the API keys in the .env file provided in your project directory

<MultiLineNote> Before you begin, refer to the <a href="https://learning-beta.earlywave.in/course?c_id=8874b642-82db-4274-8d71-b9940316db8d&s_id=fcf669b3-f01f-4e2e-ac81-9b5eea57ca20&t_id=dc1a531d-b441-4bf8-ad25-73f29fe35f28" target="_blank">
Cloud IDE Walkthrough </a> to get familiar with the environment.
</MultiLineNote>

</details>

### Completion Instructions

<details>
<summary>Functionality to be implemented</summary>
<br/>

Your code should implement the following functionality:

- [Import and environment setup point]
- [Initialize model point]
- [Set up tool/search capability point]
- [Create custom tool using API point]
- [Define system prompt point]
- [Create agent, invoke, and print response point]

</details>

### Important Note

<details>
<summary>Click to view</summary>
<br>

**The following instructions are required for the tests to pass:**

- [Requirement 1]
- [Requirement 2]
- [Requirement 3]
- [Requirement 4]
- [Requirement 5]
- [Requirement 6]

</details>

### Resources

<details>
<summary>Documentation & Tutorials</summary>

* <a href="[link]" target="_blank">[Resource Name]</a>
* <a href="[link]" target="_blank">[Resource Name]</a>

</details>

<details>
<summary>Prompts to be used</summary>
<br>

**[Label]:** ([Context for where to use it])

\```
[Prompt text]
\```

**[Label]:**

\```
[Prompt text]
\```

**[Label]:**

\```
[Prompt text]
\```

</details>

### Submission Instructions

<details>
<summary>Click to view</summary>

* Check the implementation and run your code using command `python app.py`.
* [Specific verification instruction describing what the output should contain].

</details>
```

## Tone & Style Rules

1. **NEVER use the word "students"** in the intro paragraph. Use "users" instead. Example: "help users understand skill demand" NOT "help students understand skill demand".
2. Intro paragraph describes what the tool helps **users** do — written from the user's perspective.
3. **Completion Instructions** use `-` dashes, NOT `*` bullets.
4. **Important Note** uses `-` dashes, NOT `*` bullets.
5. **Set Up Instructions** and **Resources > Documentation** use `*` bullets.
6. Set Up Instructions says "Update the API keys in the .env file provided in your project directory" — NOT "Create a .env file".
7. The `<MultiLineNote>` Cloud IDE Walkthrough block is ALWAYS included — it's fixed, never changes.
8. "Prompts to be used" section: AI should extract system prompts, tool docstrings, and user queries from the solution code and place them with descriptive labels and context hints in parentheses.
9. Submission Instructions: first line is always `python app.py`, second line describes what to verify in the output (derived from what the code actually does).
10. Bold uses `<b>` HTML tags in the intro and completion instructions for key terms (library names, tool names).
11. No "Example Usage" section.
12. API key links use `target="_blank" rel="noopener noreferrer"`. Resource doc links use only `target="_blank"`.

## Prefilled Code Awareness Rule (CRITICAL)

When generating the question, the AI also receives the **prefilled code** (if provided). The AI MUST:

- **Compare the solution code with the prefilled code line by line** to identify what's already done vs what the user needs to complete
- In **"Functionality to be implemented"** (Completion Instructions): ONLY include points that are **MISSING** from the prefilled code. Do NOT include anything that is already present/written in the prefilled code.
- In **"Important Note"** (test-passing requirements): ONLY include requirements for the parts the user needs to write. Skip requirements for code that's already in the prefilled code.
- Example: If the prefilled code already has `import os`, `from dotenv import load_dotenv`, and `load_dotenv()` — do NOT list "Import os" or "Call load_dotenv()" in either section. Only list the steps the user still needs to code.

To support this, update the Question Generator page (Page 1) to include a **"Prefilled Code"** textarea input alongside the existing Solution Code input. Both are sent to the Claude API when generating the question.

## Writing Style Rules for Generated Content (CRITICAL)

These rules control HOW the AI writes points. The tone should match this reference example exactly:

### Intro Paragraph Tone:
- Short, one sentence
- Use `<b>` for the title and main framework/library name
- Describe what it helps USERS do (never say "students")
- Example: "In this project, let's build a <b>SkillMap Agent</b> using <b>LangChain</b> to help users understand skill demand in the industry and find matching job opportunities by combining web search capabilities with real-time job listings."

### Completion Instructions ("Functionality to be implemented") Tone:
- Write at a **conceptual level** — describe WHAT to do, not exact code
- DO mention tool/service names with `<b>` tags (e.g., <b>Tavily Search</b>, <b>custom job search tool</b>)
- DO mention API/service names in backticks (e.g., `JSearch API`, `RapidAPI`)
- DON'T mention exact model strings, config values, or class paths
- Keep each point to one concise line
- Reference example tone:
  - GOOD: "Set up <b>Tavily Search</b> as a tool for `skill demand research`"
  - GOOD: "Create a <b>custom job search tool</b> using the `JSearch API` from `RapidAPI`"
  - GOOD: "Define a <b>system prompt</b> that guides the agent's behavior"
  - BAD: "Import InMemorySaver from langgraph.checkpoint.memory"
  - BAD: "Define a config dictionary with thread_id set to '1'"

### Important Note ("The following instructions are required for the tests to pass") Tone:
- More specific than Completion Instructions — this is where exact values appear
- DO use inline code formatting for specific function names, model strings, and parameter values
- DO mention exact parameters when they're key requirements
- Keep each point concise — one line, no over-explanation
- Reference example tone:
  - GOOD: "Initialize the model with `\"google_genai:gemini-2.5-flash\"`"
  - GOOD: "Configure `TavilySearch` with `max_results=5` and `search_depth=\"advanced\"`"
  - GOOD: "Use `create_agent()` with model, tools, and `system_prompt` as parameters"
  - GOOD: "Invoke the agent with the user query"
- For parts that should be discovered (memory, config, debug), use conceptual hints:
  - GOOD: "Import the required memory checkpointer class"
  - GOOD: "A configuration dictionary must be created with a configurable thread identifier"
  - GOOD: "Enable debug mode when creating the agent"
  - BAD: "Import InMemorySaver from langgraph.checkpoint.memory"
  - BAD: "config = {\"configurable\": {\"thread_id\": \"1\"}}"
  - BAD: "Pass debug=True to create_agent"