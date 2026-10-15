# Cairn for pi

The Cairn recording conventions for the [pi](https://pi.dev) coding agent, as a local pi package. It records questions, options, decisions, dropped options and established findings in the project's beads store, and it lets the agent recall them. It is the pi counterpart of the Claude Code plugin in `claude-plugin/`, and both share its library and skills. The design is in [ADR 0009](../docs/adr/0009-pi-adapter-tools-first.md).

## What it does

- **Tools**, each one a single call that does the plain-`bd` steps of a convention:
  - `cairn_recall` reads the record: `action` `list` (the questions with their state), `record` with an `id` (one question's record), or `search` with `text`. Read-only, and always called directly.
  - `cairn_option` adds a candidate option under a question.
  - `cairn_choose` labels an option `chosen` and stores the why as its design. It takes an existing `option`, or a `question`, `title` and `what` for a new option chosen at once; `what` becomes its description and is not allowed with `option`. `tasks` become tasks under the chosen option, and `drop` abandons the candidates rejected.
  - `cairn_abandon` closes an option with a one-line reason and labels it `abandoned`; a longer argument goes in `detail`.
  - `cairn_conclude` records a finding as a closed task labelled `conclusion`, with its evidence.
  - `cairn_ask` labels an issue `human` (it needs the person) and records the question.
- **Results in the transcript** show one line: `✓ abandoned t-12: Too slow`, `✓ chosen t-crs.2 (2 tasks)`, `? asked on t-4: <question>`, `questions: 3`, and `✗ ...` on error. The model still gets the full text; expanding a result shows it.
- **Prompt**: the recording conventions, and the recorded state (what needs the person, each open question with where it stands, its findings and abandoned options). The section is cached and only read again when the store changes, so the prompt stays byte-identical from turn to turn. The conventions say to ask the person with `ask_user_question` (numbered plain-text options when it is not installed).
- **Codemode**: when pi's `codemode` tool is active, the five write tools are called from codemode scripts (`await tools.cairn_choose({ option, why, tasks, drop })`), and the prompt says so. `cairn_recall` stays direct. See below for when the switch happens.
- **Panel**: `ctrl+shift+c` or `/cairn-panel` shows, above the editor, the items that need the person and the open questions. It needs a UI, refreshes after a write while shown, and has no timer. Terminals without the kitty keyboard protocol send ctrl+shift+c as ctrl+c, so use `/cairn-panel` there.
- **Skills**: `cairn-record` and `grill`, from `claude-plugin/skills/`. They name actions, not tools; the prompt maps them to the pi tools.
- **End of a run**: if the run wrote to the store, it checks the records it touched for clear problems: an abandoned issue still open, an abandoned and closed issue without a reason, a closed option that is neither chosen nor abandoned, a conclusion without evidence, and open work under a dropped or replaced option (stranded). It names them once and asks the agent to fix them.
- **After a compaction**: asks the agent to check the summary for decisions that are not recorded yet. A manual compaction runs the check at once; an automatic one waits for the next turn.
- **Commands**: `/cairn` asks the agent to review the session and record what it did not write down; `/cairn-answer` answers an issue that needs the person, from a picker; `/cairn-panel` shows or hides the panel.
- **Footer**: `⚑ N needs you` (or `⚑ cairn`) when there is a UI.

Without a `.beads` directory above the working directory, the extension does nothing: the tools answer that there is no store, and no bd call is made.

### Codemode: when the write tools switch

pi registers a tool's exposure when it is registered, and the factory runs before pi's settings can be read. So all five tools start `direct`. The extension then checks whether pi's `codemode` tool is active at `session_start` and at the start of each turn (never on a timer). When it is active, the five write tools are re-registered as `codemode` and taken out of the active set; when it goes inactive, they are re-registered as `direct`.

The limit: a toggle in the middle of a turn takes effect at the next turn. Codemode is on when `defaultTools` contains `+codemode` (or `--tools`, or `codemode` is set active), as in the default pi settings.

## Install

Requires pi 1.1.0 or later, `bd` on `PATH` (or `BD` set to its full path), and Node 18 or later.

```sh
npm run build:plugin                       # builds pi-extension/dist/cairn.js and cli/dist/cairn.js
node cli/dist/cairn.js setup pi            # runs `pi install <this folder>`
node cli/dist/cairn.js setup pi --check    # one line per requirement; exit 0 when the required ones pass
node cli/dist/cairn.js setup pi --remove   # runs `pi remove <this folder>`
```

Restart pi, or run `/reload`, after installing. `setup pi` only adds the package to pi's settings (`~/.pi/agent/settings.json`, or `PI_CODING_AGENT_DIR`); it never deletes files. If an old `cairn.ts` extension is still in `~/.pi/agent/extensions/` or the project's `.pi/extensions/`, `setup pi` warns about it and you remove it yourself, because it would load next to this package.

To try the bundle for one run without installing it: `pi -e /full/path/to/pi-extension/dist/cairn.js`. Do not add `-ne` (no extensions) in that case: it also turns off pi's built-in extensions, including codemode.

## Development

- Sources are TypeScript in `src/`, bundled by esbuild (`npm run build:plugin`) to `dist/cairn.js` as an ESM module. The bundle is committed so the package works without a build. Rebuild after changing any source, and commit the bundle with it.
- pi supplies `@earendil-works/pi-ai` (which provides TypeBox's `Type`), `@earendil-works/pi-tui` (the `Text` and `Box` components), `@earendil-works/pi-coding-agent` and `typebox` at run time. The bundle keeps them external and never bundles a copy. The repo has no pi packages: `src/pi-api.ts` is a hand-written subset of pi 1.1.0's extension types, `src/pi-ai.d.ts` declares the one builder the tools use, and `src/pi-tui.d.ts` declares the two components.
- The tools take the `Type` builder and the `tui` components as dependencies, so the tests run without pi (`src/test/pi-*.test.ts`, `src/test/cli-setup-pi.test.ts`). The tests use a fake `bd` (`src/test/pi-fakes.ts`) and never run a real `bd` or `pi`.
- The package's skills are not in the manifest: `resources_discover` offers `claude-plugin/skills/`, found from the bundle's own location.
- `bd` runs only through `pi.exec`, asynchronously, with a timeout (`src/bd-runner.ts`). Each write refreshes the ping (`.beads/.dashboard-ping`), the status footer and, while shown, the panel.
- The `cairn` command (`cli/src/`) is plain node. It only asks `pi` to install, list or remove the package, and runs `bd --version`. It works through a symlink (`cli/src/cairn.ts` resolves its repo root from the real path of the bundle).
