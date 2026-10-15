# Cairn plugin for Claude Code

Records questions, options, decisions and abandoned paths in a [beads](https://github.com/gastownhall/beads) store, and lets the next session recall them. It is the companion of the Cairn editor extension, which draws the same store as a graph, and it replaces the old `cairn@cairn` plugin (the Go CLI one). Uninstall that first: `claude plugin uninstall cairn@cairn`.

Everything is plain `bd`: no extra database, no CLI to install. Requires `bd` on PATH and Node 18 or later.

## What it does

- **SessionStart**: in a project that has a `.beads` directory (here or in a parent), injects about a dozen lines of recording conventions: a question is an epic, options are child spikes, the chosen option carries the `chosen` label and its design, its work is tasks under it, abandon with `bd close --reason` plus the `abandoned` label, overturn with `bd supersede`, ask the person with the `human` label, and record an established fact as a closed task labelled `conclusion`. Then a short digest of the recorded state: the issues labelled `human` (needs you), each open question with its state (open, decided or landed) and its chosen options with their progress, up to three findings concluded under it, up to three abandoned options with their reasons, and a warning when open work sits under a dropped or replaced option. Findings that belong to no question are listed at the end, up to five. The digest is capped at about 2400 characters and reads the store with two `bd` calls of at most 4 s each; if they fail, only the conventions are injected.
- **PreToolUse (Bash)**: auto-allows a single plain `bd` command that only reads (`show`, `list`, `ready`, `search`, ...) or that records (`create`, `update`, `close`, `comment`, `label add`, `dep add`, `supersede`, ...). It also auto-allows `node <this plugin>/scripts/record.js <words>` (the read-only search and recall the skills use); shell syntax, other stores (`--db`, `-C`), and anything destructive or administrative (`delete`, `init`, `config`, `dolt`, `sql`, `import`, `export`, ...) fall through to the normal permission prompt. `bd human respond|dismiss` also prompt: that answer is the person's.
- **PostToolUse (Bash)**: after a `bd` command that may change the store (anything not a known read, so `list` and `show` do not count), touches `.beads/.dashboard-ping` so the editor extension refreshes at once instead of waiting for its slow poll.
- **`/cairn:record [epic-id]`**: prints one question's record (its sub-questions, chosen options with their reasons and work, options dropped or considered, conclusions). With no id it lists the questions with their state.
- **`/cairn`**: asks the agent to review the session and record, with plain `bd` commands, the decisions it made but did not write down: the options weighed, the one chosen and why, options dropped, earlier decisions overturned, and anything only the person can settle. The recorded state comes with the prompt, so it extends an existing question rather than opening a duplicate. `record.js review` prints that prompt.
- **`cairn-record` skill**: when and how to record, including conclusions (a fact that was established, recorded as a closed task labelled `conclusion`), and how to recall before proposing an approach.
- **`/cairn:grill`** (skill, manual only): interviews you branch by branch until the product language and the decisions settle. It writes terms to `docs/CONTEXT.md` and records each question, option, chosen option, dropped option and established finding in beads the moment it settles, using the same conventions as `cairn-record`; a hard-to-reverse choice also gets an ADR that names the decision.

The recall script also searches: `node scripts/record.js search <text>` looks through title, description, design, notes and close reason, which `bd search` (titles only) cannot.

## Install

```sh
claude plugin marketplace add <path-to-this-repo>      # or the GitHub URL
claude plugin install cairn@cairn-beads
```

Start a new session afterwards. Set `BD=/full/path/to/bd` if `bd` is not on PATH for `record.js`.

## pi

The same conventions, recall and review come to the [pi](https://pi.dev) coding agent through a local pi package in `pi-extension/`. It adds `cairn_recall`, `cairn_option`, `cairn_choose`, `cairn_abandon`, `cairn_conclude` and `cairn_ask`, each of which records in one call; it reuses this plugin's skills and library. Install it from the repository with `node cli/dist/cairn.js setup pi`. See [pi-extension/README.md](../pi-extension/README.md).

## Development

Sources are TypeScript under `claude-plugin/src/`, bundled with esbuild into `claude-plugin/scripts/*.js` (no runtime dependencies). The built files are committed so the plugin works without a build. After changing a source file, run `npm run build:plugin` and commit both. The record model (roles, question states) and the decision-record renderer are shared with the extension (`src/shared/record-model.ts`, `src/shared/decision-record.ts`).
