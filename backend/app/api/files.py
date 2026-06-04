from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from ..core.spec import ConvertRequest, ConvertResponse
from ..core.validator import validate_spec, ValidationError
from ..core.platforms import is_supported
from ..parsers.codex_parser import parse_codex_skill
from ..generators.claude_generator import generate_claude
from ..generators.cursor_generator import generate_cursor
from ..generators.markdown_generator import generate_markdown
from pathlib import Path
import tempfile
import zipfile
import shutil

router = APIRouter()

GENERATORS = {
    "claude": generate_claude,
    "cursor": generate_cursor,
    "markdown": generate_markdown,
}


@router.post("/upload-convert")
async def upload_convert(
    file: UploadFile = File(...),
    source_platform: str = "codex",
    target_platform: str = "claude",
):
    if source_platform != "codex":
        raise HTTPException(status_code=400, detail="Only codex source platform is supported in v1")

    if not is_supported(target_platform):
        raise HTTPException(status_code=400, detail=f"Unsupported target platform: {target_platform}")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            content = await file.read()
            skill_md = temp_path / "SKILL.md"
            skill_md.write_bytes(content)

            spec = parse_codex_skill(temp_path)
            spec.target_platform = target_platform
            validate_spec(spec)

            result = GENERATORS[target_platform](spec)

            output_dir = temp_path / "output"
            output_dir.mkdir()
            for file_info in result["output_files"]:
                out_file = output_dir / file_info["filename"]
                out_file.write_text(file_info["content"], encoding="utf-8")

            report_path = output_dir / "loss_report.json"
            report_path.write_text(
                __import__("json").dumps(result["loss_report"], indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

            zip_path = temp_path / "converted.zip"
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for item in output_dir.rglob("*"):
                    if item.is_file():
                        zf.write(item, item.relative_to(output_dir))

            return FileResponse(
                path=zip_path,
                filename=f"{spec.name}-converted.zip",
                media_type="application/zip",
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
