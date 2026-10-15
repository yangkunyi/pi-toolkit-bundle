import { SidekickModelPickerComponent } from "./selector-ui.js";
export function registerSidekickCommands(pi, stateManager) {
    // 1. /sidekick:model - TUI 交互式带搜索的模型选择器 + 思考强度选择
    pi.registerCommand("sidekick:model", {
        description: "Search and select default model & thinking level for sidekick",
        handler: async (_args, ctx) => {
            if (!ctx.hasUI) {
                ctx.ui.notify("UI is not available in current mode.", "error");
                return;
            }
            // 获取当前所有可用模型
            const availableModels = ctx.modelRegistry.getAvailable();
            if (!availableModels || availableModels.length === 0) {
                ctx.ui.notify("No available models found in registry.", "warning");
                return;
            }
            const currentDefault = stateManager.getDefaultModel();
            const currentThinking = stateManager.getDefaultThinking();
            const result = await ctx.ui.custom((tui, theme, keybindings, done) => {
                return new SidekickModelPickerComponent(tui, theme, keybindings, availableModels, currentDefault, currentThinking, done);
            });
            if (result) {
                stateManager.setDefaultModel(result.modelId);
                stateManager.setDefaultThinking(result.thinking);
                const thinkingLabel = result.thinking ? ` (thinking: ${result.thinking})` : "";
                ctx.ui.notify(`Sidekick default model set to: ${result.modelId}${thinkingLabel}`, "info");
            }
        }
    });
    // 2. /sidekick:status - 查看所有命名实例槽位
    pi.registerCommand("sidekick:status", {
        description: "Show status of all persistent sidekick slots",
        handler: async (_args, ctx) => {
            const defaultModel = stateManager.getDefaultModel() || "(inherited / auto)";
            const defaultThinking = stateManager.getDefaultThinking() || "(default)";
            const slots = stateManager.getAllSlots();
            const lines = [
                "🤖 === Sidekick Status ===",
                `Default Model:    ${defaultModel}`,
                `Default Thinking: ${defaultThinking}`,
                `Total Persistent Slots: ${slots.length}`,
                ""
            ];
            if (slots.length === 0) {
                lines.push("No active slots. Run `/sidekick <task>` or let Lead AI call the sidekick tool.");
            }
            else {
                slots.forEach((s) => {
                    const lastActiveStr = new Date(s.lastActive).toLocaleTimeString();
                    lines.push(`• [${s.name}] status: ${s.lastStatus} | tasks: ${s.totalTasks} | last active: ${lastActiveStr}`);
                    if (s.lastTask) {
                        lines.push(`    last task: ${s.lastTask}`);
                    }
                });
            }
            lines.push("===========================");
            ctx.ui.notify(lines.join("\n"), "info");
        }
    });
    // 3. /sidekick:reset [slot] - 重置指定槽位或所有槽位
    pi.registerCommand("sidekick:reset", {
        description: "Reset a sidekick slot session (or all slots if omitted)",
        handler: async (args, ctx) => {
            const targetSlot = args?.trim();
            if (targetSlot) {
                stateManager.resetSlot(targetSlot);
                ctx.ui.notify(`Sidekick slot '${targetSlot}' has been reset.`, "info");
            }
            else {
                stateManager.resetSlot();
                ctx.ui.notify("All sidekick slots have been reset.", "info");
            }
        }
    });
}
//# sourceMappingURL=commands.js.map