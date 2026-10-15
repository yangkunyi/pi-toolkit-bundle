import { Container } from "@earendil-works/pi-tui";
import type { ThinkingLevel } from "./types.js";
export interface SidekickModelSelection {
    modelId: string;
    thinking?: ThinkingLevel;
}
export declare class SidekickModelPickerComponent extends Container {
    private tui;
    private theme;
    private keybindings;
    private onSelectDone;
    private step;
    private selectedModelId?;
    private searchInput;
    private selectList;
    private listContainer;
    private titleText;
    private hintText;
    private allModelItems;
    private currentThinking;
    private _focused;
    get focused(): boolean;
    set focused(value: boolean);
    constructor(tui: any, theme: any, keybindings: any, models: {
        id: string;
        name?: string;
        provider: string;
    }[], currentModel: string | undefined, currentThinking: ThinkingLevel | undefined, onDone: (result: SidekickModelSelection | null) => void);
    private getSelectListTheme;
    private showModelList;
    private transitionToThinkingStep;
    handleInput(keyData: string): void;
}
//# sourceMappingURL=selector-ui.d.ts.map