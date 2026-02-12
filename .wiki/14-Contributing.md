# 14 - Contributing Workflow

## Contribution Principles

- architecture-aware changes only
- documentation updated with every behavioral change
- no silent breaking changes
- keep root layout strict; avoid adding new root entries unless approved in policy

## Branch and PR Practices

- one clear objective per change
- include migration notes when schema changes
- include rollout and rollback notes for operational changes
- include structure impact notes if folders/files are moved

## Documentation Contract

Every meaningful code change should update:

- affected app `README.md` if onboarding changes
- affected app `docs/` if architecture/contract changes
- `.wiki/` pages if cross-app behavior changes

## Planning/Temp Files Policy

- planning artifacts and run notes go under `.claude/` or `.codex/` only
- temporary files should use `.claude/tmp/` or `.codex/tmp/` (or system tmp dirs)
- do not add ad-hoc planning or temp folders at repository root

## Review Checklist

1. Security and policy implications reviewed.
2. Data model changes are backward-compatible or clearly versioned.
3. Operational impact and monitoring requirements identified.
4. Tests and validation strategy documented.
