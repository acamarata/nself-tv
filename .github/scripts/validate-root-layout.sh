#!/usr/bin/env bash
set -euo pipefail

repo_root="${1:-.}"
cd "${repo_root}"

required_entries=(
  ".claude"
  ".codex"
  ".github"
  ".wiki"
  "backend"
  "frontend"
  "README.md"
  ".gitignore"
)

allowed_entries=(
  ".git"
  ".claude"
  ".codex"
  ".github"
  ".wiki"
  "backend"
  "frontend"
  "README.md"
  ".gitignore"
  "LICENSE"
)

root_entries="$(find . -mindepth 1 -maxdepth 1 -exec basename {} \; | sort)"

has_entry() {
  local needle="$1"
  shift
  local entry
  for entry in "$@"; do
    if [[ "${entry}" == "${needle}" ]]; then
      return 0
    fi
  done
  return 1
}

failed=0

for required in "${required_entries[@]}"; do
  if [[ ! -e "${required}" ]]; then
    echo "Missing required root entry: ${required}"
    failed=1
  fi
done

for entry in ${root_entries}; do
  if ! has_entry "${entry}" "${allowed_entries[@]}"; then
    echo "Disallowed root entry: ${entry}"
    failed=1
  fi
done

if [[ "${failed}" -ne 0 ]]; then
  echo "Root layout validation failed."
  exit 1
fi

echo "Root layout validation passed."
