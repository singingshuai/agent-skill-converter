# Agent Skill Converter

Convert agent skills between Codex, Claude, Cursor, GitHub Copilot, and Markdown formats.

## Features

- **Bidirectional conversion**: Codex ↔ Claude ↔ Cursor ↔ GitHub Copilot ↔ Markdown
- **Auto-detection**: Automatically identifies the source platform from pasted content
- **Step flow chart**: Skills with workflow steps are displayed as a vertical flow diagram
- **Section comparison**: Side-by-side comparison of each section before and after conversion
- **Loss report**: Detailed report of fully preserved / partially preserved / lost / manual-check items
- **Conversion verification**: Simulates how the target platform reads the output, with a compatibility score
- **Intermediate JSON**: View the unified `AgentSkillSpec` intermediate representation
- **Single-file version**: A 178KB standalone HTML file, no server needed

## Quick Start

### Online (Recommended)

Visit the GitHub Pages deployment:

**https://singingshuai.github.io/agent-skill-converter/**

### Local Development

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Single File

The root `agent-skill-converter.html` is a self-contained 178KB file with all JS and CSS inlined. Serve it via HTTP (browser security blocks `file://` protocol):

```bash
python -m http.server 8080
# Open http://localhost:8080/agent-skill-converter.html
```

### Windows One-Click

Double-click `启动转换器.bat` (Start Converter) to launch a local server and open the browser automatically.

## Usage

1. **Paste content**: Paste any platform's skill file content into the input box
   - Codex `SKILL.md` (frontmatter with `license` field)
   - Claude `SKILL.md` (frontmatter with `name` field)
   - Cursor `.mdc` (frontmatter with `alwaysApply` field)
2. **Select target platform** from the dropdown
3. **Click "开始转换"** (Start Conversion)
4. **View results**:
   - **步骤流程** (Steps): Vertical flow chart of workflow steps (click to expand details)
   - **章节对比** (Sections): Side-by-side section comparison (click to expand content preview)
   - **转换结果** (Output): Generated target platform file
   - **中间 JSON** (Spec): Unified intermediate representation
   - **损失报告** (Report): Preservation status of each field
   - **转换验证** (Verify): Target platform compatibility score

## Project Structure

```
agent-skill-converter/
├── README.md                       # This file
├── README_CN.md                    # Chinese documentation
├── agent-skill-converter.html      # Standalone single-file version (178KB)
├── index.html                      # GitHub Pages entry point
├── assets/                         # GitHub Pages static assets
├── .gitignore
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── App.tsx                 # Main UI
        ├── index.css               # Styles
        ├── main.tsx                # Entry point
        └── lib/
            ├── types.ts            # Type definitions
            ├── parser.ts           # Parsers (Codex/Claude/Cursor)
            ├── generators.ts       # Generators (5 target platforms)
            ├── validator.ts        # Validation rules
            └── verifier.ts         # Conversion verification
```

## Architecture

- **Pure frontend**: All conversion logic runs in the browser, no backend required
- **Intermediate standard**: All skills are first parsed into a unified `AgentSkillSpec` structure, then generated into the target platform format
- **Rule-based conversion**: No LLM dependency, deterministic rule-based transformation
- **Content preservation**: Section-level preservation (not field-level extraction), 99%+ retention rate
- **47 test cases**: Verified against real-world skills from Codex, Claude, and Cursor

## Supported Platforms

| Platform | Input | Output | Format |
|----------|-------|--------|--------|
| Codex | ✅ | ✅ | `name` + `description` + `license` frontmatter |
| Claude | ✅ | ✅ | `name` + `description` frontmatter |
| Cursor | ✅ | ✅ | `description` + `globs` + `alwaysApply` frontmatter, `.mdc` files |
| GitHub Copilot | - | ✅ | Claude-style format |
| Markdown | - | ✅ | Generic markdown with metadata |

## License

MIT