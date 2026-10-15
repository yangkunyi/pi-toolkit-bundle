import { Container, Input, SelectList, Spacer, Text, fuzzyFilter } from "@earendil-works/pi-tui";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
const THINKING_LEVELS = [
    { level: "off", description: "Disable reasoning/thinking" },
    { level: "minimal", description: "Minimal thinking tokens" },
    { level: "low", description: "Low thinking effort" },
    { level: "medium", description: "Medium balanced thinking" },
    { level: "high", description: "Deep reasoning" },
    { level: "xhigh", description: "Extended deep reasoning" },
    { level: "max", description: "Maximum available thinking budget" }
];
export class SidekickModelPickerComponent extends Container {
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
        // Build model select items
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
        this.hintText = new Text(this.theme.fg("dim", "  Type to filter · ↑/↓ navigate · Enter select · Esc cancel"), 1, 0);
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
        const filtered = query.trim()
            ? fuzzyFilter(this.allModelItems, query, (item) => `${item.value} ${item.description || ""}`)
            : this.allModelItems;
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
        this.titleText.setText(this.theme.fg("accent", this.theme.bold(`Select Thinking Level for ${this.selectedModelId}`)));
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
            // Return to model selection step on Esc
            this.step = "model";
            this.titleText.setText(this.theme.fg("accent", this.theme.bold("Select Sidekick Model")));
            this.searchInput.focused = true;
            this.showModelList(this.searchInput.getValue());
        };
        this.hintText.setText(this.theme.fg("dim", "  ↑/↓ select thinking intensity · Enter confirm · Esc back to models"));
        this.listContainer.addChild(this.selectList);
        this.tui.requestRender();
    }
    handleInput(keyData) {
        if (this.step === "model") {
            const isNav = this.keybindings?.matches(keyData, "tui.select.up") ||
                this.keybindings?.matches(keyData, "tui.select.down") ||
                this.keybindings?.matches(keyData, "tui.select.confirm") ||
                this.keybindings?.matches(keyData, "tui.select.cancel") ||
                keyData === "\u001b[A" ||
                keyData === "\u001b[B" ||
                keyData === "\r" ||
                keyData === "\n" ||
                keyData === "\u001b";
            if (isNav) {
                this.selectList.handleInput(keyData);
                return;
            }
            this.searchInput.handleInput(keyData);
            this.showModelList(this.searchInput.getValue());
        }
        else {
            // thinking step
            this.selectList.handleInput(keyData);
        }
    }
}
//# sourceMappingURL=selector-ui.js.map