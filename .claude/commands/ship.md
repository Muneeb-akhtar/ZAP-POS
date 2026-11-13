---
description: Build, review, commit and push the current changes to main
---
Ship the current changes to GitHub (`main` branch of Muneeb-akhtar/ZAP-POS):

1. Run `git status` and `git diff --stat` to see what changed. If nothing changed, say so and stop.
2. Make sure no unwanted files are staged: no `node_modules/`, `dist/`, `.env*` (only `.env.example` is allowed, and it must hold placeholders, never real keys), zips or screenshots. If any appear, fix `.gitignore` instead of committing them.
3. Check for leftovers in the changed files: unused imports, unused components/CSS rules/icons/JSON fields, console.log debugging. Remove them.
4. Run `npm run build` in `src/zappos-web`. If it fails, fix the error before continuing.
5. Update the Claude docs (mandatory, see CLAUDE.md rule 10): add a dated entry to `docs/CHANGELOG.md`; update `docs/ARCHITECTURE.md` for any structural change; update `CLAUDE.md` / `.claude/commands/*` if rules, commands or workflows changed. Include these in the same commit.
6. Stage the changes and commit with a short imperative message describing the change (e.g. `Add admin login page`). $ARGUMENTS
7. `git push origin main`. Never force-push.
8. Report: the commit message, the files changed, and the push result.
