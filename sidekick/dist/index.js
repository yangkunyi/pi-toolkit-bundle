import { StateManager } from "./state.js";
import { registerSidekickTool } from "./tool.js";
import { registerSidekickCommands } from "./commands.js";
export default function registerSidekickExtension(pi) {
    const stateManager = new StateManager();
    // 注册/同步 sidekick 专属 runtime agent，直接赋予全量 tools 与 inheritSkills
    const registerOrUpdateSidekickAgent = () => {
        try {
            const leadTools = pi
                .getAllTools()
                .map((t) => t.name)
                .filter((name) => !["subagent", "subagent_supervisor", "sidekick"].includes(name));
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
        }
        catch {
            // ignore
        }
    };
    // 启动即注册
    registerOrUpdateSidekickAgent();
    // 1. 注册核心命令与选择器 (/sidekick:model, /sidekick:status, /sidekick:reset)
    registerSidekickCommands(pi, stateManager);
    // 2. 注册主模型可调用的 sidekick 工具
    registerSidekickTool(pi, stateManager);
    // 3. 拦截 @sidekick 或 @slot_name 前缀的直接用户消息
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
                    text: `[User directed to Sidekick slot: '${slot}']\nPlease delegate the following task to sidekick slot '${slot}' immediately without unnecessary preambles:\n\n${task}`
                };
            }
        }
        return { action: "continue" };
    });
    // 4. 注入 Lead 角色提示词策略 & 确保 Agent 状态同步
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
//# sourceMappingURL=index.js.map