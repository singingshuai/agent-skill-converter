# Agent Skill 转换器

在 Codex / Claude / Cursor / GitHub Copilot 之间相互转换 Agent Skills。

## 功能

- **双向转换**：Codex ↔ Claude ↔ Cursor ↔ GitHub Copilot ↔ Markdown
- **平台自动检测**：粘贴内容后自动识别来源平台
- **步骤流程图**：有工作流步骤的 skill 以垂直流程图展示
- **章节对比**：逐 section 对比转换前后的保留情况，点击可展开详情
- **损失报告**：每次转换生成完整/部分/丢失/需确认的报告
- **转换验证**：模拟目标平台读取转换结果，给出兼容性评分
- **中间 JSON**：查看统一中间标准 `AgentSkillSpec` 的完整结构
- **单文件可用**：178KB 的 HTML 文件，双击即可使用

## 快速使用

### 方式一：在线访问（推荐）

直接访问 GitHub Pages 部署地址：

**https://singingshuai.github.io/agent-skill-converter/**

### 方式二：本地启动

```bash
# 双击启动
启动转换器.bat

# 或手动命令
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

### 方式三：单文件

项目根目录的 `agent-skill-converter.html` 是一个 178KB 的独立文件，所有 JS 和 CSS 已内联。通过本地 HTTP 服务打开即可使用：

```bash
# 需要通过 HTTP 服务打开（浏览器安全限制不允许直接 file:// 打开）
python -m http.server 8080
# 然后浏览器访问 http://localhost:8080/agent-skill-converter.html
```

## 使用方法

1. **粘贴内容**：将任意平台的 skill 文件内容粘贴到输入框
   - 支持 Codex `SKILL.md`（含 `license` 字段的 frontmatter）
   - 支持 Claude `SKILL.md`（含 `name` 字段的 frontmatter）
   - 支持 Cursor `.mdc`（含 `alwaysApply` 字段的 frontmatter）
2. **选择目标平台**：从下拉菜单选择要转换成的平台
3. **点击"开始转换"**
4. **查看结果**：
   - **步骤流程**：有工作流步骤时展示垂直流程图（可点击展开详情）
   - **章节对比**：左右对比每个 section 的保留情况（可点击展开内容预览）
   - **转换结果**：查看生成的目标平台文件
   - **中间 JSON**：查看统一中间标准结构
   - **损失报告**：查看完整保留/部分保留/丢失/需确认的内容
   - **转换验证**：查看目标平台能否正确读取转换结果

## 项目结构

```
agent-skill-converter/
├── README.md                       # 英文说明
├── README_CN.md                    # 中文说明（本文件）
├── agent-skill-converter.html      # 单文件版本（178KB，双击可用）
├── index.html                      # GitHub Pages 入口
├── assets/                         # GitHub Pages 静态资源
├── .gitignore
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── App.tsx                 # 主界面
        ├── index.css               # 样式
        ├── main.tsx                # 入口
        └── lib/
            ├── types.ts            # 类型定义
            ├── parser.ts           # 解析器（Codex/Claude/Cursor）
            ├── generators.ts       # 生成器（5 个目标平台）
            ├── validator.ts        # 校验规则
            └── verifier.ts         # 转换验证
```

## 技术方案

- **纯前端**：所有转换逻辑在浏览器内完成，无需后端
- **中间标准**：所有 skill 先解析为统一的 `AgentSkillSpec` 结构，再生成目标平台格式
- **规则转换**：不依赖大模型，基于规则的确定性转换
- **内容保留**：逐 section 保留，非逐字段提取，保留率 99%+

## 支持的平台

| 平台 | 输入 | 输出 | 格式特征 |
|------|------|------|----------|
| Codex | ✅ | ✅ | `name` + `description` + `license` frontmatter |
| Claude | ✅ | ✅ | `name` + `description` frontmatter |
| Cursor | ✅ | ✅ | `description` + `globs` + `alwaysApply` frontmatter，`.mdc` 文件 |
| GitHub Copilot | - | ✅ | 基于 Claude 格式 |
| Markdown | - | ✅ | 通用 Markdown 格式，含元数据 |

## License

MIT