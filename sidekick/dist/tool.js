import { Type } from "typebox";
import { dispatchSidekick } from "./dispatcher.js";
const SidekickParamsSchema = Type.Object({
    task: Type.String({
        description: "Concrete implementation, testing, debugging, or research brief for the sidekick."
    }),
    name: Type.Optional(Type.String({
        description: "Slot name for the persistent sidekick instance (e.g. 'coder', 'tester', 'docs'). Defaults to 'default'."
    })),
    model: Type.Optional(Type.String({
        description: "Optional model override as 'provider/id'. Defaults to the configured sidekick model."
    })),
    block: Type.Optional(Type.Boolean({
        description: "Whether to wait for completion synchronously. Defaults to false (async in background)."
    })),
    timeout: Type.Optional(Type.Number({
        description: "Optional timeout in seconds."
    }))
});
export function registerSidekickTool(pi, stateManager) {
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
                            text: `[Sidekick Slot: ${slotName}] Task dispatched in background.\nModel: ${params.model || stateManager.getDefaultModel() || "default"}\nRun ID: ${res.runId || "active"}\n\nYou will be notified automatically when the sidekick finishes its work.`
                        }
                    ],
                    details: {
                        slot: slotName,
                        runId: res.runId,
                        async: true
                    }
                };
            }
            else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `[Sidekick Slot: ${slotName} Finished]\n\n${res.output}`
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
//# sourceMappingURL=tool.js.map