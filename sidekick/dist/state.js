import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".pi", "agent", "sidekick");
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, "config.json");
export class StateManager {
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
        }
        catch {
            this.config = { slots: {} };
        }
    }
    save() {
        try {
            fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
            fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
        }
        catch {
            // ignore
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
        if (!this.config.defaultModel)
            return undefined;
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
        }
        else {
            this.config.slots = {};
        }
        this.save();
    }
    getAllSlots() {
        return Object.values(this.config.slots);
    }
}
//# sourceMappingURL=state.js.map