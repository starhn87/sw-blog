#!/bin/bash
# PostToolUse hook: 편집된 .ts/.tsx는 eslint, .mdx는 alt 검사를 돌린다.
# 실패하면 additionalContext로 Claude에 피드백해 자가수정을 유도한다(exit 0 유지).
input=$(cat)
file_path=$(printf '%s' "$input" | python3 -c "import json,sys;print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)
[ -z "$file_path" ] && exit 0
[ -n "$CLAUDE_PROJECT_DIR" ] && cd "$CLAUDE_PROJECT_DIR" 2>/dev/null

emit() {
  python3 -c "import json,sys;print(json.dumps({'hookSpecificOutput':{'hookEventName':'PostToolUse','additionalContext':sys.argv[1]}}))" "$1"
}

case "$file_path" in
  *.ts|*.tsx)
    if ! out=$(npx eslint "$file_path" --max-warnings=0 2>&1); then
      emit "eslint failed for ${file_path}:
${out}

Fix the lint errors before continuing."
    fi
    ;;
  *.mdx)
    if ! out=$(npx tsx scripts/check-mdx-alt.ts 2>&1); then
      emit "mdx alt-text check failed:
${out}"
    fi
    ;;
esac
exit 0
