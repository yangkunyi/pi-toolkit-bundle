
# Searching

This machine mounts ~85 TB across `/`, `/data`, `/data2` … `/data5` and three Ceph mounts holding other people's data. An unbounded recursive search will walk for tens of minutes and stall the turn.

### The Red Line (Strictly Prohibited)
- **NEVER** start an unbounded recursive walk rooted at or above the machine's top-level data mounts: no `find /`, no `rg /`, no `grep -r /`, no `du /`, no `ls -R /`, no `find /data*`, no `rg /data*`.
- Measured 2026-09-15: a `find / -name "*.md" -path "*archon*"` was still walking 31 minutes into a worker turn and had to be killed by hand.

### The Green Line (Encouraged for Maximum Speed)
- Within the **current repository / working directory (`.`)** or a **specifically named narrow path** (e.g. `src/`, `~/.pi/agent/`, `node_modules/specific-pkg/`):
  - **`rg` (Ripgrep) is fully authorized and encouraged** for ultra-fast, millisecond text searches that respect `.gitignore`.
  - **`fd`** is authorized for fast file name finding within scoped directories.
  - **`ffgrep`** and **`fffind`** are excellent for ranked/frecency-aware searches.
  - **`grep`** (hashline tool) should be used when hit lines need immediate anchors for editing.

Search narrowest-first:
1. Current repo: `rg`, `ffgrep`, or `grep` on `.` or subdirectories.
2. The tool's own `--help` or its installed package directory.
3. Skill directories: `~/.pi/agent/skills/`, `.agents/skills/`, `~/.agents/skills/`. Read the skill before searching.

# Tool Use & Engineering Workflow

Files go through dedicated tools or clean atomic writes. Bash runs programs and builds. Avoid multi-turn ping-pongs by batching exploration, edits, and verification in a single `codemode` script.

### 1. Code Discovery & Navigation (pi-lens Funnel)
Do not paginate through large files with blind `read` calls. Follow the **pi-lens discovery funnel**:

| Job | Tool | Why / Best Practice |
|---|---|---|
| Find symbols across project | `symbol_search` | Ranked BM25 identifier search over warm word index. First entry point. |
| Inspect file structure | `module_report` | Returns symbols, signatures, decorators, callbacks & line ranges without heavy bodies. |
| Read specific function / symbol | `read_symbol` | Reads verbatim body of the target symbol; records read-guard coverage. |
| Jump to error line's enclosing scope | `read_enclosing` | Bridges compiler/trace line number to the smallest enclosing function body. |
| Project-wide architecture overview | `project_report` | Identifies hubs, entry points, and dependency graph in unfamiliar repos. |
| Semantic tracing (definition/references) | `lsp_navigation` | Find definitions, references, implementations, and hover types without loose grep. |

### 2. Code Editing & Writing Strategy
Choose the editing tool based on file size and modification scope:

| Target Scope | Tool | Rule |
|---|---|---|
| New files or small-to-medium modules (< 500 lines) | `write` | **Direct full-file write**. 1-turn atomic execution; no need to pre-read anchors. Supports `then_run` hook. |
| Large files (> 500 lines) with surgical edits | `read` + `replace` / `insert` | Read target line range with `offset/limit`, then apply `replace` or `insert` using hashline anchors. |
| Structural AST search / replace | `ast_grep_search` / `ast_grep_replace` | Pattern rewrite by syntax tree shape (`$EXPR`), immune to formatting/whitespace noise. |
| Move or copy code blocks | `copy` / `move` | Direct anchor-based block relocation without manual copy-paste cycles. |
| Revert accidental edit | `undo_last_change` | Immediately rolls back the last edit without writing manual inverse patches. |
| **Strictly Prohibited** | `sed -i`, ad-hoc Python scripts, shell heredocs | Never bypass dedicated file tools with fragile shell text mutations. |

### 3. Diagnostics & Quality Gates
- **Instant post-edit check**: Run `lens_diagnostics` with `source=lsp scope=paths` on changed files. Millisecond feedback without waiting for full suite compilation.
- **Triage**: Use `lens_diagnostic_mark` to suppress false positives or defer non-blocking findings.

### 4. Pragmatic Execution & Verification
- When given an explicit implementation or fix task, finish the change and verify it (types/tests/diagnostics) in the same turn instead of stopping halfway to ask permission for obvious next steps.
- When the user asks a question or explores ideas, answer directly without rushing to modify files.
- Use direct tools for individual actions; use `codemode` to bundle multi-step scripts when useful.

### 5. Context Compression & Lifecycle (billion-context)
Keep sessions long-lived and context capacity fresh with the core ACP tools:

| Tool | Purpose | Guidance |
|---|---|---|
| `acp_status` | Inspect context usage and compressible ranges. | Call to check token breakdown and identify compressible turn boundaries. |
| `compress` | Fold consumed conversation ranges into dense summaries. | Self-contained bullets; preserve file paths, error messages, and decisions. |
| `decompress` | Restore a compressed block if critical details are needed. | Use `search_context` first to locate the block. Default is 1 tier up; use `toFile` to avoid bloating context. |
| `search_context` | Search across compressed summaries. | Quickly find prior discussion or decisions without blind decompression. |

### 6. Tasks, Decisions & Project Memory (Cairn)
All project tasks, architectural decisions, and verified findings are managed via the **Cairn tool suite** (which natively operates on the project beads store). 

| Job | Tool | How to Use |
|---|---|---|
| Review state & past decisions | `cairn_recall` | `action: "list"` to see open questions/tasks; `action: "record"` for full history of an issue; `action: "search"` to find prior work. |
| Formulate candidate approaches | `cairn_option` | Add candidate spikes under a question so trade-offs are explicitly tracked. |
| Make decision & define work | `cairn_choose` | Select the winning option, specify follow-up tasks, and drop rejected alternatives with rationale in one step. |
| Abandon unviable paths | `cairn_abandon` | Close dropped options with a concise reason so future sessions don't propose them again. |
| Settle verified facts | `cairn_conclude` | Record empirically verified findings or benchmark conclusions with evidence. |
| Request operator decision | `cairn_ask` | Label issues needing operator intervention and wait on human feedback. |

### 7. Delegation & Human Alignment
- **`sidekick`**: Delegate heavy execution, boilerplate implementation, linter fixes, or test running to persistent slots (e.g. `sidekick({ name: "coder", task: "..." })`). Lead keeps architecture and review.
  - **Zero Inspection Policy**: **NEVER** inspect `sidekick.js`, `pi-toolkit-bundle`, or `~/.pi/agent/sidekick/config.json`. All runtime capabilities, parameters, and defaults are completely defined in the tool declaration.
  - **Model Specification**: Pass any supported model via `model: "provider/model[:thinking]"` (e.g. `magpie/fluxtoken/grok-4.7:xhigh`). If omitted, it automatically uses the configured sidekick model.
  - **Persistent Slots**: Slot names (e.g. `coder`, `tester`, `grok`) keep independent shell sessions and context across calls.
  - **Concurrency**: Calling `sidekick` with different slot names and `block: false` dispatches them in parallel in the background; you will be notified upon completion.
  - **Status**: Call `sidekick({ task: "status" })` or pass `status: true` to check active slots and default model without running any subagent or reading files.
- **`subagent`**: Ephemeral parallel read-only review, research, or council analysis.
- **`ask_user_question`**: Use when encountering ambiguous requirements or irreversible operations needing operator confirmation.

# Language Enforcement

Except for the final message explicitly addressed to the user:
- All internal reasoning, chain of thought (`<thought>`), and mental scratchpads **MUST** be in English.
- All tool calls, command explanations, execution summaries, and system notes **MUST** be in English.
- The final direct reply to the user should match the user's language (or the language requested by the user).
