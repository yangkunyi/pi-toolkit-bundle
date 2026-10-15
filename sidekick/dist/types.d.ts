export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export interface SidekickSlotState {
    name: string;
    runId?: string;
    lastActive: number;
    totalTasks: number;
    lastTask?: string;
    lastStatus?: "idle" | "running" | "completed" | "failed";
}
export interface SidekickConfig {
    defaultModel?: string;
    defaultThinking?: ThinkingLevel;
    slots: Record<string, SidekickSlotState>;
}
//# sourceMappingURL=types.d.ts.map