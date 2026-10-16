# Pi + Cairn + Sidekick All-in-One Toolkit

可直接推送到 Git 的开箱即用套件，为开发者与团队提供一套完整的 **Pi Coding Agent + Cairn 决策与任务体系 + Sidekick 持久子 Agent + VS Code 可视化仪表盘 + RTK 优化**。

> **核心设计理念**：
> 1. **一体化 Pi 插件包**：整个仓库本身就是一个原生 Pi Package，可直接通过 `pi install git:github.com/yangkunyi/pi-toolkit-bundle` 安装，同时预编译提供 Cairn 决策工具（`cairn_recall`, `cairn_choose`, `cairn_option`, `cairn_abandon`, `cairn_conclude`, `cairn_ask`）、Sidekick 协作工具和系统级 Skills。
> 2. **AI 免读源码**：所有工具预先编译为单文件 ESM Bundle，Agent 启动后通过原生 Schema 直接调用，无需占用上下文加载或理解源码。
> 3. **全流程协同**：VS Code 插件提供图形化决策图谱（Graph）、看板（Board）与路线图（Roadmap），与终端内的 Pi Agent 共享同一份底层 Beads 状态。

---

## 目录结构

```text
pi-toolkit-bundle/
├── package.json                  # Pi Package 根清单（支持 pi install git:...）
├── install.sh                    # 一键自动化环境安装与配置脚本
├── README.md                     # 完整的安装与使用说明
│
├── extensions/                   # 预编译 Pi 原生扩展单文件 Bundle
│   ├── index.js                  # 统一入口 (自动装载 Cairn + Sidekick)
│   ├── cairn.js                  # Cairn 决策系统扩展 (工具 + 提示词注入)
│   └── sidekick.js               # Sidekick 持久子 Agent 扩展
│
├── bin/
│   └── cairn                     # Cairn CLI 管理工具 (cairn init [prefix] / setup pi)
├── cli/
│   └── cairn.js                  # Cairn CLI 执行引擎
│
├── vscode/
│   └── cairn-0.2.1.vsix          # VS Code / Cursor / Windsurf 图形扩展安装包
│
├── pi/                           # Pi 核心工程配置与生态设定
│   ├── settings.clean.json       # 纯净的 Pi 全局配置模板
│   ├── open-tui.json             # 中文 TUI 与状态栏监控配置
│   ├── optimizer.json            # RTK 实时推理与 Token 压缩配置
│   ├── sol-pi.json               # SoL-Pi 上下文与 Observation 优化配置
│   ├── AGENTS.md                 # 经实战验证的代码搜索、编辑、诊断规范
│   └── APPEND_SYSTEM.md          # 系统提示词追加约束（实事求是规范）
│
└── skills/                       # 精选的常用 Agent Skills
    ├── cairn-record/             # 决策检索与召回
    ├── grill/                    # 需求访谈与领域建模交互式工作流
    ├── karpathy-lean/            # 极致精简、诚实的代码编写指南
    ├── email-cli/                # Himalaya 邮件终端集成
    ├── impeccable/               # 前端与 UI 精准打磨设计指南
    └── find-skills/              # 技能发现与扩展工具
```

---

## 安装方式

### 方式 A：完整一键安装脚本（推荐）

直接克隆本仓库并运行 `install.sh`：

```bash
git clone https://github.com/yangkunyi/pi-toolkit-bundle.git
cd pi-toolkit-bundle
./install.sh
```

**`install.sh` 会自动为您完成以下所有工作**：
1. 检查 Node.js 环境（>= 18）。
2. 检测并安装 **Beads (`bd`)** 命令行工具（官方安装脚本 + npm 回退）。
3. 检测并安装 **RTK CLI (`rtk`)** 命令行工具（官方安装脚本）。
4. 检测并安装 **Pi CLI** (`npm install -g @earendil-works/pi-coding-agent`)。
5. 将当前套件作为一体化包安装到 Pi（自动载入 Cairn、Sidekick 与 Skills）。
6. 安装推荐的 Pi 生态扩展（`pi-subagents`, `billion-context`, `pi-lens`, `SoL-Pi`, `pi-open-tui`, `pi-rtk-optimizer` 等）。
7. 将 `cairn` 命令行工具软链到 `~/.local/bin/`。
8. 将精选 Skills 安装至 `~/.agents/skills/` 与 `~/.pi/agent/skills/`。
9. 初始化 Pi 规范配置文件（`settings.json`, `AGENTS.md`, `open-tui.json`, `optimizer.json`, `sol-pi.json` 等）。
10. 检测并自动向 VS Code / Cursor / Windsurf 安装图形化 Cairn 插件。

---

### 方式 B：直接作为 Pi 插件安装

如果您已有现成的 Pi 环境，只需一条命令即可将本套件装入 Pi：

```bash
pi install git:github.com/yangkunyi/pi-toolkit-bundle
```

---

## 快速使用

### 1. 初始化项目仓库

在任意目标 Git 仓库根目录下执行：

```bash
cd /path/to/your-project
cairn init [可选前缀]
```

这会自动：
- 初始化本地 Beads 数据库（`.beads/`）；
- 配置 `AGENTS.md`，注入 Cairn 决策和架构规范；
- 确保 Pi Agent 进入该仓库后能立即调用决策与记录工具。

### 2. 在终端使用 Pi 编程

直接在项目目录下启动 Pi：

```bash
pi
```

- **Cairn 决策工具已就绪**：Agent 可以直接使用 `cairn_recall`, `cairn_choose`, `cairn_option`, `cairn_conclude` 等工具记录架构决策与工作路径。
- **Sidekick 持久子 Agent**：
  - 在终端输入 `@sidekick 实现这个函数并运行测试` 或 `@coder ...` 即可将具体编码/调试重任委派给专用子 Slot。
  - 支持 `/sidekick:model`, `/sidekick:status`, `/sidekick:reset` 管理。
- **RTK 智能输出压缩**：自动拦截长命令输出，压缩 Token 消耗达 60-90%。

### 3. 在 VS Code / Cursor 中可视化查看

打开 VS Code 或 Cursor，点击侧边栏的 **Cairn** 图标：
- **Tree View**：浏览层级化任务与决策项；
- **Graph View**：交互式 DAG 依赖图谱，清晰展示决策分支与任务链路；
- **Kanban Board**：拖拽式看板，实时掌握进行中与已关闭任务。

---

## License

MIT
