import type { SidekickSlotState, ThinkingLevel } from "./types.js";
export declare class StateManager {
    private config;
    constructor();
    private load;
    private save;
    getDefaultModel(): string | undefined;
    setDefaultModel(model: string | undefined): void;
    getDefaultThinking(): ThinkingLevel | undefined;
    setDefaultThinking(thinking: ThinkingLevel | undefined): void;
    getEffectiveModel(): string | undefined;
    getSlot(name: string): SidekickSlotState;
    updateSlot(name: string, update: Partial<SidekickSlotState>): void;
    resetSlot(name?: string): void;
    getAllSlots(): SidekickSlotState[];
}
//# sourceMappingURL=state.d.ts.map