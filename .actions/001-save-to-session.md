# Action: Save to Session

Save a unified session file into `.sessions/` combining the original prompt and a summary.

## Steps

1. List existing files in `.sessions/` to determine the next number (`NNN`).
2. Derive a short slug from the session topic (e.g. `background-worker`).
3. Create `.sessions/NNN-<slug>.md` with the following structure:

```
---
Session NNN
{Session title}
---
# PROMPT
Full or reconstructed prompt the user gave at the start of this session.
Include any clarifying Q&A that shaped the work.
---
# SESSION
## Actions
## Key Decisions
## State
## Files Modified
```

4. Keep the SESSION section concise (~20 lines). List every file created or modified. Note current state and what comes next.
5. Update `.actions/000-overview.md` if new actions were added this session.

## Rules
- Use the same `NNN` for prompt and session (single file).
- Do not invent decisions that were not made.
- "State" section must reflect where the project actually stands now.
