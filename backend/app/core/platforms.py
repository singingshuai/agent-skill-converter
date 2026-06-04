from enum import Enum


class Platform(str, Enum):
    CODEX = "codex"
    CLAUDE = "claude"
    CURSOR = "cursor"
    COPILOT = "copilot"
    MARKDOWN = "markdown"


SUPPORTED_PLATFORMS = {p.value for p in Platform}


def is_supported(platform: str) -> bool:
    return platform in SUPPORTED_PLATFORMS
