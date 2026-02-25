# Prompt: Make a Repository LLM-Friendly

Use this prompt in a new conversation to generate LLM-friendly documentation for any repository. Paste it as-is and let the model execute.

---

## Prompt

I want to make this repository as LLM-friendly as possible for my team. We explicitly feed these files into LLM context windows when working with or on this codebase. Generate the following documentation files by reading the actual source code — do not guess or hallucinate any API details, types, or signatures.

### 1. `llms.txt` (root) — Orientation & Navigation

Short, dense entry point. When someone tells an LLM "read the llms.txt," it should immediately understand what this project is and where to find details.

**Must contain:**

- H1 with project name
- Blockquote with one-liner summary
- 2-3 sentence description
- Package/module listing as a table: name, npm/import path, one-sentence description, stability status (stable vs experimental/PoC)
- Documentation map table: file path and purpose for each doc file (ReadMe.LLM, CLAUDE.md, per-package READMEs, per-package llms-usage.md, any existing docs like DEVELOP.md, CONTRIBUTING.md, etc.)
- Note about experimental packages: "Do not use or reference unless explicitly asked"

**Must NOT contain:** Code examples, API details, or lengthy explanations. That's ReadMe.LLM's job.

### 2. `ReadMe.LLM` (root) — Code Generation Cheat Sheet

The heavy hitter. When pasted into an LLM context window, this gives the model everything it needs to generate correct code for this library without reading source files. Hallucination prevention is the #1 goal.

**Must contain (in this order):**

1. One-sentence description of what this is
2. Package overview table (name, npm name, version, status, peer dependencies)
3. Full TypeScript type signatures for all public types (base constraints, config interfaces, return types, utility types)
4. Function signatures for all public API functions with full generics
5. Per-function usage examples (1-2 each, complete and runnable)
6. Middleware/plugin pattern documentation (if applicable) — how to write one, the function signature, how to chain lifecycle hooks
7. Canonical examples (3-4 complete, working examples covering the most common use cases)
8. "Common Mistakes / Do NOT Do This" section — wrong vs correct patterns for every mistake a model is likely to make (wrong import paths, wrong access patterns, wrong argument passing, etc.)
9. Complete import reference — every valid import path listed explicitly, with a note that there are NO deep import paths (if applicable)
10. Established usage patterns/conventions (if the project has them)

**Format rules:**

- TypeScript code blocks with full type annotations — models anchor on these
- Minimal prose, let code speak
- Use warnings/icons for gotchas
- Structure with clear H2 headers so models can find sections even if context is truncated
- Include actual generic type parameters from the source — don't simplify them away

### 3. Per-package/module `llms-usage.md` — Focused Usage Guides

One file per package or major module. No installation instructions, no motivation — just signatures + examples + gotchas.

**Each file must contain:**

1. Package/module name and one-line description
2. Correct import statement(s)
3. Full TypeScript type signatures for all public exports
4. 1-2 focused usage examples per export
5. "How it works" section — brief description of internal mechanics that affect usage (e.g., "uses MobX reaction under the hood", "deep-compares via lodash isEqual")
6. Gotchas / common mistakes specific to that package
7. For experimental packages: clearly mark as experimental with a warning at the top

### 4. `CLAUDE.md` (root) — AI Agent Development Guide

Instructions for AI agents working ON this codebase (developing, not using). Target: under 200 lines.

**Must contain:**

1. One-paragraph project overview
2. Monorepo/directory layout (if applicable)
3. Tech stack table (tool, role)
4. Common commands — actual scripts from package.json, not guesses
5. Package/module dependency graph
6. Coding conventions: file structure patterns, naming conventions, TypeScript strictness, test organization
7. Architecture notes: how the core internals work (enough for an agent to understand what it's modifying)
8. Package/module status table (stable vs PoC) with "don't touch PoC unless asked"
9. Release/versioning process
10. "Things to Watch Out For" — specific gotchas for agents modifying this code (skipped tests, inconsistencies, known gaps)

**Format:** Concise, structured, scannable. Use actual paths and commands. Reference existing docs (DEVELOP.md, CONTRIBUTING.md) rather than repeating them.

### Execution Instructions

1. Before writing ANY file, thoroughly read the source code: all public-facing source files, package.json files, existing READMEs, config files, and test files.
2. Extract all type signatures, function signatures, and API shapes from the actual source. Do not rely on memory or inference.
3. Write all files.
4. After writing, flag any issues found along the way (stale descriptions, missing cleanup registrations, inconsistencies, etc.)

---

_Last updated: February 2026_
