// src/state.ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
var GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".pi", "agent", "sidekick");
var GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, "config.json");
var StateManager = class {
  config = {
    slots: {}
  };
  constructor() {
    this.load();
  }
  load() {
    try {
      if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
        const raw = fs.readFileSync(GLOBAL_CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        this.config = {
          defaultModel: parsed.defaultModel,
          defaultThinking: parsed.defaultThinking,
          slots: parsed.slots || {}
        };
      }
    } catch {
      this.config = { slots: {} };
    }
  }
  save() {
    try {
      fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
      fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
    } catch {
    }
  }
  getDefaultModel() {
    return this.config.defaultModel;
  }
  setDefaultModel(model) {
    this.config.defaultModel = model;
    this.save();
  }
  getDefaultThinking() {
    return this.config.defaultThinking;
  }
  setDefaultThinking(thinking) {
    this.config.defaultThinking = thinking;
    this.save();
  }
  getEffectiveModel() {
    if (!this.config.defaultModel) return void 0;
    if (this.config.defaultThinking && !this.config.defaultModel.includes(":")) {
      return `${this.config.defaultModel}:${this.config.defaultThinking}`;
    }
    return this.config.defaultModel;
  }
  getSlot(name) {
    const key = name.trim().toLowerCase();
    if (!this.config.slots[key]) {
      this.config.slots[key] = {
        name: key,
        lastActive: Date.now(),
        totalTasks: 0,
        lastStatus: "idle"
      };
    }
    return this.config.slots[key];
  }
  updateSlot(name, update) {
    const key = name.trim().toLowerCase();
    const current = this.getSlot(key);
    this.config.slots[key] = {
      ...current,
      ...update,
      lastActive: Date.now()
    };
    this.save();
  }
  resetSlot(name) {
    if (name) {
      const key = name.trim().toLowerCase();
      delete this.config.slots[key];
    } else {
      this.config.slots = {};
    }
    this.save();
  }
  getAllSlots() {
    return Object.values(this.config.slots);
  }
};

// src/tool.ts
import { Type } from "typebox";

// src/dispatcher.ts
import { randomUUID } from "node:crypto";
var SUBAGENT_RPC_REQUEST_EVENT = "subagents:rpc:v1:request";
var SUBAGENT_RPC_REPLY_EVENT_PREFIX = "subagents:rpc:v1:reply:";
async function callSubagentsRpc(piEvents, method, params, signal) {
  const requestId = randomUUID();
  const replyEvent = `${SUBAGENT_RPC_REPLY_EVENT_PREFIX}${requestId}`;
  return new Promise((resolve, reject) => {
    let timeoutTimer;
    const cleanup = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (typeof unsubscribe === "function") unsubscribe();
      if (signal) signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("Sidekick dispatch aborted."));
    };
    const unsubscribe = piEvents.on(replyEvent, (reply) => {
      cleanup();
      if (!reply) {
        reject(new Error("Empty reply received from subagent RPC."));
        return;
      }
      if (reply.success) {
        resolve(reply.data);
      } else {
        const err = reply.error?.message || reply.error?.code || "Unknown RPC error";
        reject(new Error(err));
      }
    });
    if (signal) {
      signal.addEventListener("abort", onAbort);
    }
    timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for pi-subagents RPC response."));
    }, 15e3);
    piEvents.emit(SUBAGENT_RPC_REQUEST_EVENT, {
      version: 1,
      requestId,
      method,
      params
    });
  });
}
async function dispatchSidekick(pi, stateManager, options) {
  const slotName = (options.slotName || "default").trim().toLowerCase();
  const slot = stateManager.getSlot(slotName);
  const selectedModel = options.model || stateManager.getEffectiveModel();
  const isAsync = options.block !== true;
  stateManager.updateSlot(slotName, {
    lastStatus: "running",
    lastTask: options.task
  });
  try {
    let outcome;
    if (slot.runId) {
      try {
        outcome = await callSubagentsRpc(
          pi.events,
          "resume",
          {
            id: slot.runId,
            message: options.task
          },
          options.signal
        );
      } catch (resumeErr) {
        slot.runId = void 0;
      }
    }
    if (!slot.runId) {
      outcome = await callSubagentsRpc(
        pi.events,
        "spawn",
        {
          agent: "sidekick",
          task: options.task,
          model: selectedModel,
          async: isAsync
        },
        options.signal
      );
    }
    const runId = outcome?.runId || outcome?.id || slot.runId;
    const outputText = outcome?.output || outcome?.text || (typeof outcome === "string" ? outcome : JSON.stringify(outcome, null, 2));
    stateManager.updateSlot(slotName, {
      runId,
      lastStatus: "completed",
      totalTasks: slot.totalTasks + 1
    });
    return {
      slotName,
      runId,
      output: outputText,
      isAsync,
      isError: false
    };
  } catch (err) {
    stateManager.updateSlot(slotName, {
      lastStatus: "failed"
    });
    return {
      slotName,
      runId: slot.runId,
      output: err.message || String(err),
      isAsync,
      isError: true
    };
  }
}

// src/tool.ts
var SidekickParamsSchema = Type.Object({
  task: Type.String({
    description: "Concrete implementation, testing, debugging, or research brief for the sidekick."
  }),
  name: Type.Optional(
    Type.String({
      description: "Slot name for the persistent sidekick instance (e.g. 'coder', 'tester', 'docs'). Defaults to 'default'."
    })
  ),
  model: Type.Optional(
    Type.String({
      description: "Optional model override as 'provider/id'. Defaults to the configured sidekick model."
    })
  ),
  block: Type.Optional(
    Type.Boolean({
      description: "Whether to wait for completion synchronously. Defaults to false (async in background)."
    })
  ),
  timeout: Type.Optional(
    Type.Number({
      description: "Optional timeout in seconds."
    })
  )
});
function registerSidekickTool(pi, stateManager) {
  pi.registerTool({
    name: "sidekick",
    label: "Sidekick",
    description: "Hand off implementation, testing, bug fixing, or file editing work to a persistent sidekick subagent. Context and session persist across calls to the same slot name.",
    promptSnippet: "Delegate bounded tasks to persistent sidekick slots (e.g. 'coder', 'tester')",
    promptGuidelines: [
      "Keep lead model in charge of planning, user interaction, architecture, and final review.",
      "Delegate code implementation, running tests, fixing linters, or heavy edits to the persistent sidekick via the `sidekick` tool.",
      "Use slot names (e.g. 'coder', 'tester') to separate work contexts across tasks."
    ],
    parameters: SidekickParamsSchema,
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const slotName = (params.name || "default").trim().toLowerCase();
      const res = await dispatchSidekick(pi, stateManager, {
        task: params.task,
        slotName,
        model: params.model,
        block: params.block,
        timeout: params.timeout,
        signal
      });
      if (res.isError) {
        return {
          content: [
            {
              type: "text",
              text: `[Sidekick Slot: ${slotName} Error]: ${res.output}`
            }
          ],
          details: {
            slot: slotName,
            error: res.output
          },
          isError: true
        };
      }
      if (res.isAsync) {
        return {
          content: [
            {
              type: "text",
              text: `[Sidekick Slot: ${slotName}] Task dispatched in background.
Model: ${params.model || stateManager.getDefaultModel() || "default"}
Run ID: ${res.runId || "active"}

You will be notified automatically when the sidekick finishes its work.`
            }
          ],
          details: {
            slot: slotName,
            runId: res.runId,
            async: true
          }
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `[Sidekick Slot: ${slotName} Finished]

${res.output}`
            }
          ],
          details: {
            slot: slotName,
            runId: res.runId,
            async: false
          }
        };
      }
    }
  });
}

// src/selector-ui.ts
import {
  Container,
  Input,
  SelectList,
  Spacer,
  Text,
  fuzzyFilter
} from "@earendil-works/pi-tui";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
var THINKING_LEVELS = [
  { level: "off", description: "Disable reasoning/thinking" },
  { level: "minimal", description: "Minimal thinking tokens" },
  { level: "low", description: "Low thinking effort" },
  { level: "medium", description: "Medium balanced thinking" },
  { level: "high", description: "Deep reasoning" },
  { level: "xhigh", description: "Extended deep reasoning" },
  { level: "max", description: "Maximum available thinking budget" }
];
var SidekickModelPickerComponent = class extends Container {
  tui;
  theme;
  keybindings;
  onSelectDone;
  step = "model";
  selectedModelId;
  searchInput;
  selectList;
  listContainer;
  titleText;
  hintText;
  allModelItems;
  currentThinking = "medium";
  _focused = true;
  get focused() {
    return this._focused;
  }
  set focused(value) {
    this._focused = value;
    this.searchInput.focused = value;
  }
  constructor(tui, theme, keybindings, models, currentModel, currentThinking, onDone) {
    super();
    this.tui = tui;
    this.theme = theme;
    this.keybindings = keybindings;
    this.onSelectDone = onDone;
    if (currentThinking) {
      this.currentThinking = currentThinking;
    }
    this.allModelItems = models.map((m) => {
      const fullId = `${m.provider}/${m.id}`;
      const isCurrent = fullId === currentModel;
      return {
        value: fullId,
        label: isCurrent ? `${fullId} (current)` : fullId,
        description: m.name ? `(${m.name})` : `provider: ${m.provider}`
      };
    });
    this.addChild(new DynamicBorder());
    this.addChild(new Spacer(1));
    this.titleText = new Text(this.theme.fg("accent", this.theme.bold("Select Sidekick Model")), 1, 0);
    this.addChild(this.titleText);
    this.searchInput = new Input();
    this.searchInput.focused = true;
    this.addChild(this.searchInput);
    this.addChild(new Spacer(1));
    this.listContainer = new Container();
    this.addChild(this.listContainer);
    this.hintText = new Text(
      this.theme.fg("dim", "  Type to filter \xB7 \u2191/\u2193 navigate \xB7 Enter select \xB7 Esc cancel"),
      1,
      0
    );
    this.addChild(new Spacer(1));
    this.addChild(this.hintText);
    this.addChild(new DynamicBorder());
    this.showModelList("");
  }
  getSelectListTheme() {
    return {
      selectedPrefix: (text) => this.theme.fg("accent", text),
      selectedText: (text) => this.theme.fg("accent", this.theme.bold(text)),
      description: (text) => this.theme.fg("dim", text),
      scrollInfo: (text) => this.theme.fg("dim", text),
      noMatch: (text) => this.theme.fg("muted", text)
    };
  }
  showModelList(query) {
    const filtered = query.trim() ? fuzzyFilter(this.allModelItems, query, (item) => `${item.value} ${item.description || ""}`) : this.allModelItems;
    this.listContainer.clear();
    const maxVisible = Math.max(1, Math.min(filtered.length, 12));
    this.selectList = new SelectList(filtered, maxVisible, this.getSelectListTheme());
    this.selectList.onSelect = (item) => {
      this.selectedModelId = item.value.replace(" (current)", "").trim();
      this.transitionToThinkingStep();
    };
    this.selectList.onCancel = () => {
      this.onSelectDone(null);
    };
    this.listContainer.addChild(this.selectList);
    this.tui.requestRender();
  }
  transitionToThinkingStep() {
    this.step = "thinking";
    this.searchInput.setValue("");
    this.searchInput.focused = false;
    this.titleText.setText(
      this.theme.fg("accent", this.theme.bold(`Select Thinking Level for ${this.selectedModelId}`))
    );
    const thinkingItems = THINKING_LEVELS.map(({ level, description }) => {
      const isCur = level === this.currentThinking;
      return {
        value: level,
        label: isCur ? `${level} (current)` : level,
        description
      };
    });
    this.listContainer.clear();
    const maxVisible = thinkingItems.length;
    this.selectList = new SelectList(thinkingItems, maxVisible, this.getSelectListTheme());
    const curIdx = thinkingItems.findIndex((it) => it.value === this.currentThinking);
    if (curIdx >= 0) {
      this.selectList.setSelectedIndex(curIdx);
    }
    this.selectList.onSelect = (item) => {
      const thinking = item.value;
      this.onSelectDone({
        modelId: this.selectedModelId,
        thinking
      });
    };
    this.selectList.onCancel = () => {
      this.step = "model";
      this.titleText.setText(this.theme.fg("accent", this.theme.bold("Select Sidekick Model")));
      this.searchInput.focused = true;
      this.showModelList(this.searchInput.getValue());
    };
    this.hintText.setText(
      this.theme.fg("dim", "  \u2191/\u2193 select thinking intensity \xB7 Enter confirm \xB7 Esc back to models")
    );
    this.listContainer.addChild(this.selectList);
    this.tui.requestRender();
  }
  handleInput(keyData) {
    if (this.step === "model") {
      const isNav = this.keybindings?.matches(keyData, "tui.select.up") || this.keybindings?.matches(keyData, "tui.select.down") || this.keybindings?.matches(keyData, "tui.select.confirm") || this.keybindings?.matches(keyData, "tui.select.cancel") || keyData === "\x1B[A" || keyData === "\x1B[B" || keyData === "\r" || keyData === "\n" || keyData === "\x1B";
      if (isNav) {
        this.selectList.handleInput(keyData);
        return;
      }
      this.searchInput.handleInput(keyData);
      this.showModelList(this.searchInput.getValue());
    } else {
      this.selectList.handleInput(keyData);
    }
  }
};

// src/commands.ts
function registerSidekickCommands(pi, stateManager) {
  pi.registerCommand("sidekick:model", {
    description: "Search and select default model & thinking level for sidekick",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("UI is not available in current mode.", "error");
        return;
      }
      const availableModels = ctx.modelRegistry.getAvailable();
      if (!availableModels || availableModels.length === 0) {
        ctx.ui.notify("No available models found in registry.", "warning");
        return;
      }
      const currentDefault = stateManager.getDefaultModel();
      const currentThinking = stateManager.getDefaultThinking();
      const result = await ctx.ui.custom((tui, theme, keybindings, done) => {
        return new SidekickModelPickerComponent(
          tui,
          theme,
          keybindings,
          availableModels,
          currentDefault,
          currentThinking,
          done
        );
      });
      if (result) {
        stateManager.setDefaultModel(result.modelId);
        stateManager.setDefaultThinking(result.thinking);
        const thinkingLabel = result.thinking ? ` (thinking: ${result.thinking})` : "";
        ctx.ui.notify(`Sidekick default model set to: ${result.modelId}${thinkingLabel}`, "info");
      }
    }
  });
  pi.registerCommand("sidekick:status", {
    description: "Show status of all persistent sidekick slots",
    handler: async (_args, ctx) => {
      const defaultModel = stateManager.getDefaultModel() || "(inherited / auto)";
      const defaultThinking = stateManager.getDefaultThinking() || "(default)";
      const slots = stateManager.getAllSlots();
      const lines = [
        "\u{1F916} === Sidekick Status ===",
        `Default Model:    ${defaultModel}`,
        `Default Thinking: ${defaultThinking}`,
        `Total Persistent Slots: ${slots.length}`,
        ""
      ];
      if (slots.length === 0) {
        lines.push("No active slots. Run `/sidekick <task>` or let Lead AI call the sidekick tool.");
      } else {
        slots.forEach((s) => {
          const lastActiveStr = new Date(s.lastActive).toLocaleTimeString();
          lines.push(
            `\u2022 [${s.name}] status: ${s.lastStatus} | tasks: ${s.totalTasks} | last active: ${lastActiveStr}`
          );
          if (s.lastTask) {
            lines.push(`    last task: ${s.lastTask}`);
          }
        });
      }
      lines.push("===========================");
      ctx.ui.notify(lines.join("\n"), "info");
    }
  });
  pi.registerCommand("sidekick:reset", {
    description: "Reset a sidekick slot session (or all slots if omitted)",
    handler: async (args, ctx) => {
      const targetSlot = args?.trim();
      if (targetSlot) {
        stateManager.resetSlot(targetSlot);
        ctx.ui.notify(`Sidekick slot '${targetSlot}' has been reset.`, "info");
      } else {
        stateManager.resetSlot();
        ctx.ui.notify("All sidekick slots have been reset.", "info");
      }
    }
  });
}

// src/index.ts
function registerSidekickExtension(pi) {
  const stateManager = new StateManager();
  const registerOrUpdateSidekickAgent = () => {
    try {
      const leadTools = pi.getAllTools().map((t) => t.name).filter((name) => !["subagent", "subagent_supervisor", "sidekick"].includes(name));
      const request = {
        version: 1,
        name: "sidekick",
        definition: {
          description: "Persistent implementation engineer sharing full tools, skills, and project context with the lead.",
          systemPrompt: "You are the persistent Sidekick implementation engineer. You have full access to tools and skills to implement, test, edit, debug, and run commands. Deliver clean, working solutions.",
          systemPromptMode: "append",
          inheritSkills: true,
          inheritProjectContext: true,
          inheritGlobalContext: true,
          tools: leadTools
        }
      };
      pi.events.emit("pi-subagents:runtime-agent-register:v1", request);
    } catch {
    }
  };
  registerOrUpdateSidekickAgent();
  registerSidekickCommands(pi, stateManager);
  registerSidekickTool(pi, stateManager);
  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") {
      return { action: "continue" };
    }
    const trimmed = event.text.trim();
    const match = trimmed.match(/^@([a-zA-Z0-9_\-]+)\s+([\s\S]+)$/);
    if (match) {
      const target = match[1].toLowerCase();
      const task = match[2].trim();
      const knownSlots = stateManager.getAllSlots().map((s) => s.name);
      if (target === "sidekick" || knownSlots.includes(target)) {
        const slot = target === "sidekick" ? "default" : target;
        ctx.ui.notify(`Forwarding directly to sidekick [${slot}]...`, "info");
        return {
          action: "transform",
          text: `[User directed to Sidekick slot: '${slot}']
Please delegate the following task to sidekick slot '${slot}' immediately without unnecessary preambles:

${task}`
        };
      }
    }
    return { action: "continue" };
  });
  pi.on("before_agent_start", async (event) => {
    registerOrUpdateSidekickAgent();
    const defaultModel = stateManager.getDefaultModel();
    const modelHint = defaultModel ? `Default sidekick model: ${defaultModel}.` : "";
    const policy = `
# Mode: Lead Architect with Persistent Sidekick
You are operating in the Lead Architect seat.
- Your primary role is high-level planning, domain modeling, task coordination, ambiguity resolution, and final acceptance.
- You have an implementation partner named \`sidekick\` via the \`sidekick\` tool (or native subagent). ${modelHint}
- Sidekick has the exact same tools, project instructions, and skills as you.
- For concrete code implementations, running tests, fixing errors, or long refactoring loops, delegate them to a named sidekick slot (e.g. \`coder\`, \`tester\`, or default).
- The same slot retains its shell state and context across calls.
`;
    if (event.systemPromptOptions?.sections) {
      event.systemPromptOptions.sections.sidekick_policy = policy;
    }
  });
}
export {
  registerSidekickExtension as default
};
