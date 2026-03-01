# Action: Commit and Merge

Commit all changes on the current branch/worktree and merge into `main`. Be precise. Do not guess.

## Steps

1. Run `git status` to see what is modified or untracked.
2. If nothing to commit, skip to step 5.
3. Run `git add -A` then `git commit -m "<short imperative message>"`.
   - Message: one line, imperative mood, ≤72 chars, no period.
4. Verify commit succeeded (`git log -1 --oneline`).
5. Identify the current branch (`git branch --show-current`).
6. Identify the worktree root (`git worktree list`).
7. Switch to `main` in the **main worktree** (not the current worktree):
   - If running inside a linked worktree, use the main repo path from `git worktree list` (first entry).
   - Run `git -C <main-repo-path> merge --no-ff <current-branch> -m "Merge <current-branch> into main"`.
8. Confirm merge succeeded (`git -C <main-repo-path> log --oneline -3`).
9. Do NOT push unless the user explicitly asks.
10. Do NOT delete the worktree or branch unless the user explicitly asks.

## Safety Rules
- Never force-push or reset.
- Never merge if `git status` shows a conflict.
- If any step fails, stop and report the error verbatim. Do not retry destructive steps.
- Always verify the target branch is `main` before merging.
