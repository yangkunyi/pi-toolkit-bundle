import { randomUUID } from "node:crypto";
const SUBAGENT_RPC_REQUEST_EVENT = "subagents:rpc:v1:request";
const SUBAGENT_RPC_REPLY_EVENT_PREFIX = "subagents:rpc:v1:reply:";
/**
 * Send an RPC request to pi-subagents over Pi's event bus
 */
async function callSubagentsRpc(piEvents, method, params, signal) {
    const requestId = randomUUID();
    const replyEvent = `${SUBAGENT_RPC_REPLY_EVENT_PREFIX}${requestId}`;
    return new Promise((resolve, reject) => {
        let timeoutTimer;
        const cleanup = () => {
            if (timeoutTimer)
                clearTimeout(timeoutTimer);
            if (typeof unsubscribe === "function")
                unsubscribe();
            if (signal)
                signal.removeEventListener("abort", onAbort);
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
            }
            else {
                const err = reply.error?.message || reply.error?.code || "Unknown RPC error";
                reject(new Error(err));
            }
        });
        if (signal) {
            signal.addEventListener("abort", onAbort);
        }
        // Default 15s timeout waiting for RPC acknowledgement
        timeoutTimer = setTimeout(() => {
            cleanup();
            reject(new Error("Timeout waiting for pi-subagents RPC response."));
        }, 15000);
        piEvents.emit(SUBAGENT_RPC_REQUEST_EVENT, {
            version: 1,
            requestId,
            method,
            params
        });
    });
}
/**
 * Unified Sidekick dispatcher using pi-subagents RPC
 */
export async function dispatchSidekick(pi, stateManager, options) {
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
            // 1. Slot has an existing runId -> resume conversation
            try {
                outcome = await callSubagentsRpc(pi.events, "resume", {
                    id: slot.runId,
                    message: options.task
                }, options.signal);
            }
            catch (resumeErr) {
                // If resume fails (e.g. run ended or cleaned up), clear runId and spawn fresh
                slot.runId = undefined;
            }
        }
        if (!slot.runId) {
            // 2. Spawn a fresh sidekick run
            outcome = await callSubagentsRpc(pi.events, "spawn", {
                agent: "sidekick",
                task: options.task,
                model: selectedModel,
                async: isAsync
            }, options.signal);
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
    }
    catch (err) {
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
//# sourceMappingURL=dispatcher.js.map