# Resource Skill

A skill with external resource files.

## When to Use

Use when processing configuration files.

## Workflow

1. Load config template
2. Apply transformations
3. Save output

## Constraints

- Do not modify original templates
- Always backup before changes

## Resources

- templates/config.yaml: Configuration template
- scripts/transform.py: Transformation script

## Examples

- Transform database config
- Transform API config
