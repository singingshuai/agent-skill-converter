import json
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException
from ..core.spec import ConvertRequest, ConvertResponse, AgentSkillSpec
from ..core.validator import validate_spec, ValidationError
from ..core.platforms import is_supported
from ..parsers.codex_parser import parse_codex_skill
from ..generators.claude_generator import generate_claude
from ..generators.cursor_generator import generate_cursor
from ..generators.markdown_generator import generate_markdown

router = APIRouter()

GENERATORS = {
    "claude": generate_claude,
    "cursor": generate_cursor,
    "markdown": generate_markdown,
}


@router.post("/convert", response_model=ConvertResponse)
async def convert_skill(request: ConvertRequest):
    if request.source_platform != "codex":
        raise HTTPException(status_code=400, detail="Only codex source platform is supported in v1")

    if not is_supported(request.target_platform):
        raise HTTPException(status_code=400, detail=f"Unsupported target platform: {request.target_platform}")

    if request.target_platform not in GENERATORS:
        raise HTTPException(status_code=400, detail=f"Generator not available for: {request.target_platform}")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_md = Path(temp_dir) / "SKILL.md"
            skill_md.write_text(request.content, encoding="utf-8")
            spec = parse_codex_skill(Path(temp_dir))
            spec.target_platform = request.target_platform
            validate_spec(spec)

            result = GENERATORS[request.target_platform](spec)
            return ConvertResponse(
                success=True,
                spec=spec,
                output_files=result["output_files"],
                loss_report=result["loss_report"],
            )
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"errors": e.errors})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inspect")
async def inspect_skill(request: ConvertRequest):
    if request.source_platform != "codex":
        raise HTTPException(status_code=400, detail="Only codex source platform is supported in v1")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_md = Path(temp_dir) / "SKILL.md"
            skill_md.write_text(request.content, encoding="utf-8")
            spec = parse_codex_skill(Path(temp_dir))
            validate_spec(spec)
            return {"success": True, "spec": spec.model_dump()}
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"errors": e.errors})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
