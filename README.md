# Agent Skill Converter

Convert agent skills between different platforms (Codex, Claude, Cursor, etc.) using a unified intermediate standard.

## Features

- Convert Codex skills to Claude, Cursor, or generic Markdown format
- View intermediate JSON representation
- Generate conversion loss reports
- CLI and Web interface

## Quick Start

### Using Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:8000

### Local Development

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## CLI Usage

### Convert Skill

```bash
python -m app.cli convert \
  --from codex \
  --to claude \
  --input ./examples/simple-skill \
  --output ./dist/simple-skill-claude
```

### Inspect Skill

```bash
python -m app.cli inspect \
  --from codex \
  --input ./examples/simple-skill
```

## API Endpoints

### POST /api/convert

Convert skill to target platform.

**Request:**
```json
{
  "source_platform": "codex",
  "target_platform": "claude",
  "input_type": "markdown",
  "content": "# Skill Name\n..."
}
```

**Response:**
```json
{
  "success": true,
  "spec": {},
  "output_files": [{"filename": "skill.md", "content": "..."}],
  "loss_report": {
    "preserved": ["name", "description"],
    "partial": ["workflow"],
    "lost": [],
    "manual_check": ["resources"]
  }
}
```

### POST /api/inspect

Inspect skill intermediate JSON without generating output.

**Request:** Same as /api/convert

**Response:**
```json
{
  "success": true,
  "spec": {}
}
```

## Project Structure

```
agent-skill-converter/
©À©¤©¤ backend/
©¦   ©À©¤©¤ app/
©¦   ©¦   ©À©¤©¤ api/          # FastAPI routes
©¦   ©¦   ©À©¤©¤ core/         # Spec, validator, loss report
©¦   ©¦   ©À©¤©¤ generators/   # Platform generators
©¦   ©¦   ©¸©¤©¤ parsers/      # Platform parsers
©¦   ©À©¤©¤ tests/
©¦   ©¸©¤©¤ Dockerfile
©À©¤©¤ frontend/
©¦   ©À©¤©¤ src/
©¦   ©¦   ©¸©¤©¤ components/
©¦   ©¸©¤©¤ Dockerfile
©À©¤©¤ examples/             # Test skill fixtures
©À©¤©¤ docs/
©¸©¤©¤ docker-compose.yml
```

## Supported Platforms

- **Codex**: OpenAI Codex skills (input only in v1)
- **Claude**: Anthropic Claude skills
- **Cursor**: Cursor rules (.cursor/rules/*.mdc)
- **Markdown**: Generic markdown format

## License

MIT
