import argparse
import json
import sys
import io
from pathlib import Path
from .parsers.codex_parser import parse_codex_skill
from .generators.claude_generator import generate_claude
from .generators.cursor_generator import generate_cursor
from .generators.markdown_generator import generate_markdown
from .core.validator import validate_spec, ValidationError

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

GENERATORS = {
    "claude": generate_claude,
    "cursor": generate_cursor,
    "markdown": generate_markdown,
}


def main():
    parser = argparse.ArgumentParser(description="Agent Skill Converter")
    subparsers = parser.add_subparsers(dest="command", required=True)

    convert_parser = subparsers.add_parser("convert", help="Convert skill to target platform")
    convert_parser.add_argument("--from", dest="source", required=True, help="Source platform")
    convert_parser.add_argument("--to", dest="target", required=True, help="Target platform")
    convert_parser.add_argument("--input", required=True, help="Input directory")
    convert_parser.add_argument("--output", required=True, help="Output directory")

    inspect_parser = subparsers.add_parser("inspect", help="Inspect skill intermediate JSON")
    inspect_parser.add_argument("--from", dest="source", required=True, help="Source platform")
    inspect_parser.add_argument("--input", required=True, help="Input directory")

    args = parser.parse_args()

    if args.command == "convert":
        handle_convert(args)
    elif args.command == "inspect":
        handle_inspect(args)


def handle_convert(args):
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input path does not exist: {args.input}", file=sys.stderr)
        sys.exit(1)

    if args.source != "codex":
        print(f"Error: Only codex source is supported in v1", file=sys.stderr)
        sys.exit(1)

    if args.target not in GENERATORS:
        print(f"Error: Unsupported target platform: {args.target}", file=sys.stderr)
        sys.exit(1)

    try:
        spec = parse_codex_skill(input_path)
        spec.target_platform = args.target
        validate_spec(spec)
        result = GENERATORS[args.target](spec)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValidationError as e:
        print(f"Validation failed: {'; '.join(e.errors)}", file=sys.stderr)
        sys.exit(1)

    output_path.mkdir(parents=True, exist_ok=True)
    for file_info in result["output_files"]:
        out_file = output_path / file_info["filename"]
        out_file.write_text(file_info["content"], encoding="utf-8")

    report_path = output_path / "loss_report.json"
    report_path.write_text(json.dumps(result["loss_report"], indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Conversion complete. Output written to {output_path}")
    print(f"Loss report: {report_path}")


def handle_inspect(args):
    input_path = Path(args.input)

    if not input_path.exists():
        print(f"Error: Input path does not exist: {args.input}", file=sys.stderr)
        sys.exit(1)

    if args.source != "codex":
        print(f"Error: Only codex source is supported in v1", file=sys.stderr)
        sys.exit(1)

    try:
        spec = parse_codex_skill(input_path)
        validate_spec(spec)
        print(json.dumps(spec.model_dump(), indent=2, ensure_ascii=False))
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValidationError as e:
        print(f"Validation failed: {'; '.join(e.errors)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
