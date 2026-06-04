import requests
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Read the SKILL.md file
with open("examples/datax-json-generator/SKILL.md", "r", encoding="utf-8") as f:
    content = f.read()

response = requests.post(
    "http://localhost:8000/api/convert",
    json={
        "source_platform": "codex",
        "target_platform": "claude",
        "input_type": "markdown",
        "content": content
    }
)

print("Status Code:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2, ensure_ascii=False))
