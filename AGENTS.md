# Repository Guidelines

## Project Structure & Module Organization
- Keep production code in `src/`, tests in `tests/`, helper scripts in `scripts/`, docs in `docs/`, and static assets in `assets/`.
- Use feature-oriented folders under `src/` (e.g., `src/tasks/`, `src/storage/`, `src/ui/`). Mirror this layout in `tests/`.
- Store configuration in `config/` and environment variables in `.env`; commit a redacted `.env.example`.

## Build, Test, and Development Commands
- Prefer script shims so workflows are stack-agnostic:
  - `./scripts/dev` — run the app locally (watch mode if supported).
  - `./scripts/test` — execute the full test suite with coverage.
  - `./scripts/build` — produce release artifacts (binary, bundle, or dist).
- If your stack provides native commands, call them from these scripts (e.g., Node: `npm run dev|test|build`; Python: `pytest -q`, `python -m todo`).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; max line length: 100 characters.
- Names: functions/variables in `lowerCamelCase` (JS/TS) or `snake_case` (Python); classes/types in `PascalCase`; files in `kebab-case` for web, `snake_case` for Python.
- Keep modules focused; avoid “god files.” Prefer pure functions and small units.
- Provide a formatter/linter via `./scripts/format` (e.g., Prettier, Black, Ruff, ESLint) and run it before pushing.

## Testing Guidelines
- Place unit tests in `tests/` mirroring `src/` paths.
- Naming: `test_<module>.py` or `<module>.spec.ts` depending on stack.
- Target ≥80% coverage; include edge cases (empty lists, large lists, invalid input). Tests must be deterministic and fast.
- Run with `./scripts/test`; add focused tests with each change.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- One logical change per commit; present tense, imperative mood.
- PRs must include: clear description, linked issues, screenshots for UI changes, migration notes if applicable, and updated tests/docs.

## Security & Configuration Tips
- Never commit secrets. Use `.env` and keep `.env.example` in sync.
- Validate all inputs; avoid unsafe eval and prefer parameterized queries.
- Pin dependencies (lockfiles) and update them regularly.

## Agent-Specific Instructions
- Limit diffs to the task scope; do not reformat unrelated files.
- Follow this guide’s structure; update docs/tests alongside behavior changes.
- When unsure, prefer small, reversible changes and ask for review.
