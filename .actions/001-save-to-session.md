# Action: Save to Session

Save a summary of the current session into `.sessions/` and the original prompt into `.prompts/`.

## Steps

1. List existing files in `.sessions/` to determine the next number (`NNN`).
2. Derive a short slug from the session topic (e.g. `background-worker`).
3. Create `.prompts/NNN-<slug>.md`:
   - Title matching the session goal
   - Full or reconstructed prompt the user gave at the start of this session
   - Any clarifying Q&A that shaped the work
4. Create `.sessions/NNN-<slug>.md`:
   - First line: link to the corresponding prompt (`Prompt: .prompts/NNN-<slug>.md`)
   - Sections: Actions, Key Decisions, State
   - Max ~20 lines total; be concise
   - List every file created or modified
   - Note the current implementation state and what comes next
5. Update `.actions/000-overview.md` if new actions were added this session.

## Rules
- Use the same `NNN` for both files.
- Do not invent decisions that were not made.
- "State" section must reflect where the project actually stands now.
