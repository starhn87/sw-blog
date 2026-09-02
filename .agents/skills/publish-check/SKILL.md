---
name: publish-check
description: 글 발행이나 코드 배포 전 검증할 때. verify 통과를 확인하고 재인덱싱 흐름을 점검한다.
---

# 배포 전 검증

## 1. 변경 검증

```bash
pnpm verify   # lint + typecheck + test + mdx alt
```

통과한 것만 커밋한다. 실패하면 고치고 다시 돌린다(검증 루프).

## 2. 배포 대상 확인

현재 전환 단계는 `docs/next16-workers-cutover.md`를 확인한다. 운영이 Pages인 동안 Next16 브랜치를 Pages로 배포하지 않는다. 전환 전 브랜치 push는 마지막 커밋 제목의 `[CF-Pages-Skip]`으로 기존 Pages 자동 빌드를 생략한다. 운영 전환·main 병합 승인과 일반 push 승인을 구분한다.

Workers 전환 후 main push는 `.github/workflows/deploy-workers.yml`이 처리한다. `WORKERS_PRODUCTION_ENABLED=true`가 없으면 배포되지 않는다. 확인 없이 변수를 켜지 않는다.

1. verify → 운영 build → Free 번들 검사 → 도메인/secret 사전 검사 → deploy
2. 실제 BUILD_ID·자산 hash·SSG·noindex 검사
3. 검색/RAG 입력이 변경됐을 때만 두 인덱스 POST 실행(수동 workflow 실행은 항상 재인덱싱)

push 후 `Deploy Workers` 전체 성공을 확인한다. 배포만 성공하고 재인덱싱이 실패했다면 완료로 보고하지 않는다. 원인을 해결하고 main에서 workflow_dispatch로 재실행한다. mutation을 무조건 반복하거나 이전 Pages polling workflow를 호출하지 않는다.

## 3. 빌드 산출물

`public/search-index.json`, `public/rag-chunks.json`, `public/codebase-summary.txt`는 build가 생성하며 gitignore된다. `workers:build`/`workers:build:production`이 비공개 build 변수 제거와 `.open-next/release.json` 생성까지 수행한다. 생성물을 수동 커밋하지 않는다. runtime secret을 build 환경에 추가하지 않는다.

## 주의

발행/배포는 사용자가 명시적으로 지시한 글만 진행한다. "푸시 진행해" 같은 말을 임의로 확장하지 않는다.
