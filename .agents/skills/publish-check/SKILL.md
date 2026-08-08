---
name: publish-check
description: 글 발행이나 코드 배포 전 검증할 때. verify 통과를 확인하고 재인덱싱 흐름을 점검한다.
---

# 배포 전 검증

## 1. 변경 검증

```bash
pnpm verify   # lint + typecheck + mdx alt
```

통과한 것만 커밋한다. 실패하면 고치고 다시 돌린다(검증 루프).

## 2. 발행 글 push

`content/posts/**` 변경을 main에 push하면 `.github/workflows/reindex.yml`이 자동 실행된다:

1. Cloudflare Pages 배포 완료까지 폴링 (최대 10분)
2. `POST /api/search/index` — 검색 벡터 재인덱싱
3. `POST /api/chat/index` — RAG 청크 재인덱싱

push 후 GitHub Actions 탭에서 reindex 워크플로우 성공 여부만 확인하면 된다.

## 3. 빌드 산출물

`public/search-index.json`, `public/rag-chunks.json`, `public/codebase-summary.txt`는 gitignore된다. `pages:build`가 생성하므로 수동 커밋이 필요 없다. 글 변경 시 `content/posts`만 커밋한다.

## 주의

발행/배포는 사용자가 명시적으로 지시한 글만 진행한다. "푸시 진행해" 같은 말을 임의로 확장하지 않는다.
