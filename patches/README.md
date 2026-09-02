# Workers 빌드 호환성 패치

`pnpm-workspace.yaml`의 `patchedDependencies`와 lockfile로 정확한 버전에 적용한다.
의존성을 올릴 때 패치를 그대로 옮기지 말고 upstream 수정 여부부터 확인한다.

| 패키지 | 필요한 이유 | 회귀 검사 |
| --- | --- | --- |
| `@opennextjs/cloudflare@1.20.6` | `exports: "./index.js"` 형태에 `in` 연산자를 적용해 MDX 의존성 복사에 실패한다. 문자열 export는 그대로 보존한다. | `src/lib/openNextBuild.test.ts`, Workers 빌드의 `Failed to copy` 로그 |
| `gray-matter@4.0.3` | 사용하지 않는 JavaScript frontmatter 엔진의 `eval`을 번들에서 제거한다. YAML/JSON frontmatter는 유지하고 JS 형식은 거부한다. | `src/lib/frontmatter.test.ts`, 전체 글 빌드 |
| `oniguruma-to-es@4.3.6` | ESM 옵션의 object spread를 Turbopack이 펼치면서 중복 key 경고가 생긴다. `Object.assign`으로 동일한 덮어쓰기 순서를 유지한다. | `src/lib/shiki.test.ts`의 코드 블록 235개·양쪽 테마 토큰 비교, Workers 번들 경고 |

패치 추가·갱신·제거 후 `pnpm install --frozen-lockfile`, `pnpm verify`,
`pnpm workers:build`, `pnpm workers:check`를 실행한다. 정적 캐시는
`pnpm workers:preview`가 준비하므로, 로컬 실행 검증에 `wrangler dev`만 직접 사용하지 않는다.
