# Pi + Cairn + Sidekick All-in-One Toolkit

可直接推送到 Git 的开箱即用套件，为开发者与团队提供一套完整的 **Pi Coding Agent + Cairn 决策与任务体系 + Sidekick 持久子 Agent + VS Code 可视化仪表盘**。

> **核心设计理念**：
> 1. **AI 免读源码**：Cairn 预先编译为独立的 Pi 插件包和 CLI，Agent 启动后通过原生 Schema 直接调用决策工具（`cairn_recall`, `cairn_choose`, `cairn_option`, `cairn_abandon`, `cairn_conclude`, `cairn_ask`），无需占用上下文加载或理解源码。
> 2. **轻量便携**：剥离重型外部二进制，只打包配置、预编译插件与产物，一键脚本自动检查并安装。
> 3. **全流程协同**：VS Code 插件提供图形化决策图谱（Graph）、看板（Board）与路线图（Roadmap），与终端内的 Pi Agent 共享同一份底层 Beads 状态。

---

## 目录结构

```text
pi-toolkit-bundle/
├── install.sh                  # 一键自动化安装与配置脚本
├── README.md                   # 完整的安装与使用说明
│
├── cairn/                      # Cairn 决策系统套件（预编译产物）
│   ├── bin/
│   │   ├── cairn               # Cairn CLI 管理工具 (cairn init / setup pi / check)
│   ├── pi-extension/           # Pi 原生扩展包 (cairn-pi)
│   │   ├── dist/cairn.js       # 预编译好的单一 Bundle（含工具与提示词注入）
│   │   └── package.json
│   └── claude-plugin/skills/   # Cairn 核心技能 (grill, cairn-record)
│
├── vscode/
│   └── cairn-0.2.1.vsix        # VS Code / Cursor / Windsurf 图形扩展安装包
│
├── sidekick/                   # Pi Sidekick 扩展（持久化多 Slot 子 Agent）
│   ├── dist/                   # 预编译好的 Sidekick 模块
│   └── package.json
│
├── pi/                         # Pi 核心工程配置与规范
│   ├── settings.clean.json     # 纯净的 Pi 全局配置模板
│   ├── AGENTS.md               # 经实战验证的代码搜索、编辑、诊断规范
│   └── APPEND_SYSTEM.md        # 系统提示词追加约束（范围限制、实事求是规范）
│
└── skills/                     # 精选的常用 Agent Skills
    ├── cairn-record/           # 决策检索与召回
    ├── grill/                  # 需求访谈与领域建模交互式工作流
    ├── karpathy-lean/          # 极致精简、诚实的代码编写指南
    ├── email-cli/              # Himalaya 邮件终端集成
    ├── impeccable/             # 前端与 UI 精准打磨设计指南
    └── find-skills/            # 技能发现与扩展工具
```

---

## 前置环境要求 (Prerequisites)

本套件专注于配置与预编译产物，底层的运行时环境请按需下载安装：

1. **Node.js** >= 18（推荐 v20 或 v22）
2. **Pi CLI**：
   ```bash
   npm install -g @earendil-works/pi-coding-agent
   ```
3. **Beads (bd) CLI**（用于决策与任务的底层存储与跨端同步）：
   - macOS:
     ```bash
     brew install steveyegge/beads/bd
     ```
   - Linux / 通用安装：参见 [Beads 官方仓库](https://github.com/steveyegge/beads)。
4. **VS Code / Cursor / Windsurf**（可选，用于可视化图形界面）。

---

## 快速安装 (Quick Start)

克隆本仓库后，直接运行一键安装脚本：

```bash
cd pi-toolkit-bundle
./install.sh
```

脚本将自动执行以下操作：
1. 检查 Node.js、pi、bd 环境。
2. 安装 Cairn Pi 插件 (`pi install ./cairn/pi-extension`)。
3. 安装 Pi Sidekick 插件 (`pi install ./sidekick`)。
4. 将 `cairn` 软链到 `~/.local/bin/`。
5. 将全局 Skills 安装至 `~/.agents/skills/` 与 `~/.pi/agent/skills/`。
6. 初始化并更新 `~/.pi/agent/` 下的 `settings.json`、`AGENTS.md` 和 `APPEND_SYSTEM.md`。
7. 检测并安装 VS Code / Cursor 的 `cairn-0.2.1.vsix` 插件。

> **提示**：确保 `~/.local/bin` 已加入你的环境变量 `PATH` 中：
> ```bash
> export PATH="$HOME/.local/bin:$PATH"
> ```

---

## 在项目中使用 Cairn 工作流

### 1. 初始化项目
在任何 Git 代码仓库根目录下运行：

```bash
cd /path/to/your-project
cairn init
```

这会自动：
- 运行 `bd init` 初始化 `.beads` 本地数据库。
- 注入标准的 `AGENTS.md` 提示词模板。

### 2. 启动 Pi 智能体
进入该项目目录后启动 Pi：

```bash
pi
```

- **自动识别**：Pi 会检测到仓库中的 `.beads/`，自动激活 Cairn。
- **系统提示注入**：AI 会在上下文自动获得当前未结（Open）、已决（Decided）的问题摘要。
- **内置决策工具集**：
  - `cairn_recall`：查看当前决策列表、检索决策历史或单个问题记录。
  - `cairn_option`：为问题提出候选方案。
  - `cairn_choose`：选定方案、记录设计决策理由并生成后续任务。
  - `cairn_abandon`：放弃不通的方案并记录简要原因。
  - `cairn_conclude`：记录经过验证的客观技术结论。
  - `cairn_ask`：向人类标记需要用户决策的问题。

### 3. 打开 VS Code 可视化仪表盘
在 VS Code / Cursor 中打开该项目：
- 点击活动栏（Activity Bar）的 **Cairn** 图标。
- 查看：
  - **Overview**：项目健康度、任务总览与待办事项。
  - **Graph**：问题、方案与决议的交互式依赖图谱。
  - **Board**：基于状态分类的看板。
  - **Roadmap**：排期与甘特图视图。

---

## 模型与配置定制

Pi 的全局配置文件存放在 `~/.pi/agent/`：
- **`settings.json`**：TUI 显示、思考级别、启用的工具列表。
- **`models.json`**：配置大模型 Provider（如 OpenAI、Claude、Gemini、DeepSeek 或本地 Magpie 代理服务）。
- **`AGENTS.md`**：自定义 Agent 编码习惯与规则。

---

## 常见问题与排查 (Troubleshooting)

- **检查 Cairn 安装状态**：
  ```bash
  cairn setup pi --check
  ```
- **重新编译/打包 VS Code 插件**（如需定制前端界面）：
  可在源码仓库中执行 `npm run package` 产出新的 `.vsix` 文件。
- **更新插件**：
  在更新本仓库后，重新执行 `./install.sh` 即可完成覆盖升级。
