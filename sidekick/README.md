# pi-sidekick

Multi-instance persistent sidekick extension for the **Pi coding agent**, inspired by **UniPi Fusion**.

## 🌟 Overview

In complex programming workflows, combining a **Lead Architect** (focused on high-level planning, requirements reasoning, and final review) with a **Sidekick** (specialized in fast, continuous, dirty code modifications and test executions) significantly improves coding productivity and reduces context exhaustion.

`pi-sidekick` implements this architecture for Pi:
1. **Multi-Slot Persistent Instances**: Run different sidekick slots (e.g. `coder`, `tester`, `reviewer`, `default`). The shell, process state, and context persist within each slot across calls.
2. **Interactive TUI Model Selector**: Run `/sidekick:model` to dynamically pick any available model in your Pi model registry as the global sidekick engine.
3. **Async Background by Default**: The lead model hands off tasks without blocking your session; `block: true` can be passed when synchronous waiting is preferred.
4. **Seamless Integration**: Built directly on top of `pi-subagents` (`@earendil-works/pi-subagents`), leveraging robust worker child processes, retained children, and resume mechanisms.

---

## 🚀 Installation

### Option 1: Direct Pi package installation
```bash
pi install /data3/yky/pi-sidekick
```

### Option 2: Personal extension link
```bash
mkdir -p ~/.pi/agent/extensions
ln -s /data3/yky/pi-sidekick ~/.pi/agent/extensions/pi-sidekick
```

---

## 🛠 Commands

- `/sidekick:model`: Opens an interactive terminal picker (`ctx.ui.select`) showing all available models with valid authentication. Saves your selection persistently in `~/.pi/agent/sidekick/config.json`.
- `/sidekick:status`: Displays all active sidekick slots, their current status (`idle`, `running`, `completed`, `failed`), total tasks executed, and run IDs.
- `/sidekick:reset [slot_name]`: Clears persistent session state for a specific slot, or resets all slots if no name is given.

---

## 💬 Dual Invocation: How You and AI Both Talk to Sidekick

### 1. User Invocations (How You Talk to Sidekick)
You can directly send instructions to persistent sidekick slots without waiting for complex lead reasoning:

- **Prefix / Mention syntax (Fastest)**:
  - `@sidekick <task>`: Dispatches directly to the `default` persistent slot.
  - `@coder <task>`: Dispatches to the `coder` slot.
  - `@tester <task>`: Dispatches to the `tester` slot.
- **Slash command**:
  - `/sidekick [slot] <task>`: e.g. `/sidekick coder run vitest and fix failures`
- **Natural language**:
  - Just tell the Lead AI: *"让 sidekick 去跑一下测试"* or *"让 coder 去写一下 API"*

### 2. AI Invocation (How Lead AI Talks to Sidekick)
The lead agent is provided with the `sidekick` tool:

```json
{
  "name": "sidekick",
  "arguments": {
    "task": "Implement user authentication endpoint in src/auth.ts and verify unit tests",
    "name": "coder",
    "block": false
  }
}
```

#### Parameters
- `task` *(required)*: Detailed instructions and requirements for the subagent.
- `name` *(optional, string)*: Slot identifier (e.g. `"coder"`, `"tester"`, `"docs"`). Defaults to `"default"`.
- `model` *(optional, string)*: Model override (`provider/id`). If omitted, uses the configured sidekick model or inherits defaults.
- `block` *(optional, boolean)*: Set to `true` to block until completion; defaults to `false` (background async).
- `timeout` *(optional, number)*: Task execution timeout in seconds.

---

## 📁 Project Structure

```
pi-sidekick/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts      # Extension entrypoint & prompt policy injection
│   ├── types.ts      # Slot state and config types
│   ├── state.ts      # Persistent state manager (~/.pi/agent/sidekick/config.json)
│   ├── commands.ts   # Slash commands (/sidekick:model, /sidekick:status, /sidekick:reset)
│   └── tool.ts       # `sidekick` tool definition & pi-subagents delegation
└── dist/             # Compiled ESM output
```
