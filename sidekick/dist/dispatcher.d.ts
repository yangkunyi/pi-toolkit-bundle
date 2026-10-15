import type { StateManager } from "./state.js";
export interface SidekickDispatchOptions {
    task: string;
    slotName?: string;
    model?: string;
    block?: boolean;
    timeout?: number;
    signal?: AbortSignal;
}
export interface SidekickDispatchResult {
    slotName: string;
    runId?: string;
    output: string;
    isAsync: boolean;
    isError: boolean;
}
/**
 * Unified Sidekick dispatcher using pi-subagents RPC
 */
export declare function dispatchSidekick(pi: any, stateManager: StateManager, options: SidekickDispatchOptions): Promise<SidekickDispatchResult>;
//# sourceMappingURL=dispatcher.d.ts.map