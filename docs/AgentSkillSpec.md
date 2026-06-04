# AgentSkillSpec - Intermediate Standard

## Overview

`AgentSkillSpec` is the unified intermediate representation for agent skills across different platforms (Codex, Claude, Cursor, etc.).

## Schema

```json
{
  "name": "string (required)",
  "description": "string (required)",
  "version": "string (default: 1.0.0)",
  "source_platform": "string (required)",
  "target_platform": "string (optional)",
  "triggers": {
    "keywords": ["string"],
    "intent": "string"
  },
  "inputs": ["string"],
  "workflow": [
    {
      "step": 1,
      "description": "string",
      "notes": "string (optional)"
    }
  ],
  "constraints": ["string"],
  "outputs": {
    "format": "string",
    "must_include": ["string"]
  },
  "resources": [
    {
      "path": "string",
      "description": "string"
    }
  ],
  "examples": ["string"],
  "metadata": {}
}
```

## Field Descriptions

### Required Fields

- **name**: Skill name (from directory name or title)
- **description**: Brief description of skill purpose
- **source_platform**: Platform where skill originated (codex, claude, cursor, etc.)

### Optional Fields

- **target_platform**: Target platform for conversion
- **version**: Semantic version (default: 1.0.0)
- **triggers**: Conditions that activate the skill
  - **keywords**: List of trigger keywords
  - **intent**: Description of when to use
- **inputs**: Expected input types
- **workflow**: Ordered list of execution steps
- **constraints**: Rules and limitations
- **outputs**: Expected output format and requirements
- **resources**: External files or dependencies
- **examples**: Usage examples
- **metadata**: Platform-specific data and raw content

## Validation Rules

1. `name` must not be empty
2. `description` must not be empty
3. `triggers` must contain at least one keyword or intent
4. `workflow` must contain at least one step
5. `constraints` must not be empty
6. `source_platform` must be supported
7. `target_platform` (if provided) must be supported

## Supported Platforms

- **codex**: OpenAI Codex skills
- **claude**: Anthropic Claude skills
- **cursor**: Cursor rules
- **markdown**: Generic markdown format

## Example

```json
{
  "name": "Query Optimizer",
  "description": "Optimizes database queries for better performance",
  "version": "1.0.0",
  "source_platform": "codex",
  "target_platform": "claude",
  "triggers": {
    "keywords": ["database", "query", "optimization"],
    "intent": "Use when user asks about database performance"
  },
  "inputs": ["SQL query", "Database schema"],
  "workflow": [
    {
      "step": 1,
      "description": "Analyze query structure",
      "notes": "Use EXPLAIN to understand execution plan"
    },
    {
      "step": 2,
      "description": "Identify bottlenecks",
      "notes": "Look for missing indexes and inefficient joins"
    },
    {
      "step": 3,
      "description": "Suggest optimizations",
      "notes": "Provide specific recommendations"
    }
  ],
  "constraints": [
    "Do not modify production databases",
    "Always test changes in staging first"
  ],
  "outputs": {
    "format": "markdown",
    "must_include": ["optimization suggestions", "expected performance improvement"]
  },
  "resources": [
    {
      "path": "scripts/analyze_query.py",
      "description": "Query analysis script"
    }
  ],
  "examples": [
    "Optimize SELECT * FROM users WHERE email = 'test@example.com'"
  ],
  "metadata": {
    "raw_content": "Original SKILL.md content..."
  }
}
```
