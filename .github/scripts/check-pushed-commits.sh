#!/usr/bin/env sh
# Checks the message of every commit a push brings in, with the same two tools the commit-msg
# hook runs locally, so a commit made with the hooks skipped is still caught.
#
# Usage: check-pushed-commits.sh <before-sha> <head-sha> <branch-name>
#
# A normal push checks before..head. A new branch has an all-zero "before" (and a force push can
# leave "before" unknown), so the commits checked are the ones no other remote branch already
# has; on the very first push that is the whole history.
set -eu

before="$1"
head="$2"
branch="$3"
no_commit=0000000000000000000000000000000000000000

if [ "$before" != "$no_commit" ] && git cat-file -e "$before^{commit}" 2>/dev/null; then
  commits=$(git rev-list "$before..$head")
else
  others=$(git for-each-ref --format='%(refname)' refs/remotes/origin |
    grep -v -x -e "refs/remotes/origin/$branch" -e 'refs/remotes/origin/HEAD' || true)
  # Word splitting is wanted here: each other branch is one argument after --not.
  # shellcheck disable=SC2086
  commits=$(git rev-list "$head" --not $others)
fi

if [ -z "$commits" ]; then
  echo "No new commits to check."
  exit 0
fi

message_file=$(mktemp)
trap 'rm -f "$message_file"' EXIT
failed=0

for sha in $commits; do
  echo "Checking commit $sha"
  git log -1 --format=%B "$sha" >"$message_file"
  pnpm exec commitlint --edit "$message_file" || failed=1
  pnpm run --silent guard commit-msg "$message_file" || failed=1
done

exit "$failed"
