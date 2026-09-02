# Next.js 16 · Workers 운영 전환 절차

2026-09-03 실행 기록. **main 푸시·설정·운영 Worker 생성은 완료했지만 DNS 충돌로 전환은 중단했고, 기존 Pages 연결을 복구했다.** 대시보드에서 기존 www CNAME을 삭제하기 직전에 사용자 확인이 필요하다.
실제 어댑터는 vinext가 아니라 OpenNext다. Workers Free를 유지하고 D1·R2·Vectorize·AI 제공자는 바꾸지 않는다. 챗봇 재설계나 Paid 전환은 선행 조건이 아니다.

## 전환 전 상태와 복구 원천

| 항목 | 확인한 상태 |
| --- | --- |
| Pages project | `sw-blog` |
| Pages production deployment | `87ceefa2-05e4-477e-bc82-2f66cd80c914` |
| 운영 main | `a86aef43f3997c0dc0f32c0b98287f749515162f` |
| Pages 연결 도메인 | `sw-blog.pages.dev`, `www.seung-woo.me`, `seung-woo.me` |
| 실제 DNS | `www.seung-woo.me` CNAME → `sw-blog.pages.dev`, Proxied, TTL Automatic |
| 루트 DNS | `seung-woo.me` A/AAAA/CNAME 없음. Pages 연결 목록과 실제 DNS 상태는 다르다 |
| Pages 자동 빌드 | production 활성화, preview `all` (`*`) |
| 기존 읽기 전용 Preview | `sw-blog-preview`, version `7dd7df6d-fe72-4253-bd2f-987251412f58` |
| 새 운영 Worker | `sw-blog` 아직 없음. 운영 Custom Domain도 없음 |
| GitHub 설정 | CF account/token·ADMIN_PASSWORD secret 있음. 공개 지도 변수와 배포 활성화 변수는 없음 |

계정은 `72e20a4dda9ef3e8c2d24d6cc1646412`, zone은 `05986e7735b44a074a429e668347a338`이다.
전환 직전에 이 표를 다시 조회하고 DNS·Pages 도메인·자동 빌드 설정을 값이 아닌 설정 위주로 저장한다. Pages project와 마지막 성공 배포는 삭제하지 않는다.

## 준비한 배포 경로

- `wrangler.worker.jsonc` 기본 환경은 기존 Preview, `--env production`만 `sw-blog` 운영 환경이다. 운영 Custom Domain은 www·루트 두 개이며 workers.dev·version preview URL은 끈다.
- 운영 binding을 명시적으로 복제했다. `DB`는 `ccc1ea5a-cc5b-4507-b106-9b690908e540`, R2는 `sw-blog-media`, Vectorize는 `blog-search`·`rag-chunks`다. 새 데이터 저장소나 migration은 없다.
- `workers:build:production`은 정적 응답 생성 뒤 OpenNext 환경 파일에서 `NEXT_PUBLIC_*`만 남긴다. 공개/서버 산출물에 알려진 비공개 키 값이 남아 있으면 실패하며, 실패 로그에 값은 출력하지 않는다.
- `.open-next/release.json`은 BUILD_ID와 검색·RAG·코드 요약 파일의 SHA-256, 인덱스 건수를 기록한다. git에 커밋하지 않는다.
- `deploy-workers.yml`은 main의 `WORKERS_PRODUCTION_ENABLED=true`일 때만 실행된다. unset은 비활성이다. 최초 도메인 전환을 자동으로 수행하는 workflow가 아니다.
- 이후 배포는 verify → 공개 변수만으로 build → gzip 검사 → Pages 중지/도메인/secret 사전 검사 → deploy → 실제 release 검사 → 필요한 재인덱싱 순서다. 같은 concurrency group으로 배포와 재인덱싱을 직렬화한다.
- 재인덱싱은 공개 검색/RAG 입력이 달라졌거나 수동 workflow 실행인 경우에 한다. 두 POST 각각 직전에 실제 BUILD_ID·자산 hash·SSG·noindex를 검사하며, redirect를 따르지 않고 운영 www에만 관리자 헤더를 보낸다. 건수 불일치나 실패를 자동 재시도하지 않는다.
- deploy 이후 재인덱싱이 실패하면 **workflow_dispatch로 다시 실행**한다. 자동 다음 push만 기다리면 이미 배포된 입력과 같아서 재인덱싱을 생략할 수 있다. 실패가 해결될 때까지 다음 수동 배포도 하지 않는다.

## 승인 후 사전 설정

1. GitHub repository variables에 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`를 기존 운영과 동일하게 설정한다. 이 둘은 클라이언트에 공개되는 키이며 지도 제공자의 도메인 제한은 유지한다.
2. `production` GitHub environment를 만들고 배포 권한/보호 설정을 확인한다. `WORKERS_PRODUCTION_ENABLED`는 **repository variable**로 마지막 단계에서만 켠다.
3. GitHub `CLOUDFLARE_API_TOKEN`의 Workers 배포·Custom Domain·binding 사용 권한을 확인한다. 기존 Pages 토큰 이름만으로 권한을 보장할 수 없다. 사전 검사용 Pages project 조회 권한도 필요하다. 대상 account/zone에 한정하고, 부족한 권한은 공식 Workers 토큰 템플릿과 실제 API 오류를 기준으로 보충한다. 토큰을 대화나 로그에 붙이지 않는다.
4. Worker runtime secret은 `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` 네 개다. 기존 값을 그대로 사용하고 build step에는 전달하지 않는다. VAPID 공개 키는 `src/lib/push.ts`·`PushSubscribeButton.tsx`의 기존 상수이며 교체하지 않는다. GitHub ADMIN_PASSWORD도 같은 값이어야 한다.
5. Pages production 자동 배포를 끄고 preview 설정을 `none`으로 바꾼다. 기존 배포는 계속 서비스한다. **이 확인 전에는 마이그레이션 main 병합/푸시를 하지 않는다.** 브랜치 push의 마지막 커밋 제목에는 전환 전까지 `[CF-Pages-Skip]`을 유지한다.
6. 승인된 commit을 main에 반영한 뒤 checkout SHA·GitHub main SHA를 대조한다. 새 workflow의 배포 활성화 변수는 아직 끈 상태다.

## 첫 운영 배포와 도메인 이전

전환 중 수동 배포·콘텐츠 변경·재인덱싱을 병행하지 않는다. 아래 명령은 **전환 승인 후에만** 실행한다.

```bash
pnpm install --frozen-lockfile
pnpm rebuild esbuild sharp workerd
pnpm verify
pnpm workers:build:production
pnpm workers:check:production
```

1. **새 Worker에는 `versions upload`를 사용할 수 없다.** production 설정을 복제한 임시 bootstrap 설정에서 `routes: []`, `workers_dev: false`, `preview_urls: false`를 지정한다. 저장소 밖 설정이면 main·assets 경로를 절대 경로로 변환한다. secret 네 개만 포함한 권한 `0600` 임시 JSON 파일을 별도로 만들고 `wrangler deploy --config <bootstrap-설정> --tag <승인한-SHA> --secrets-file <임시-secret-파일>`로 최초 생성한다. 값은 환경에서 읽고 출력하지 않으며 secret 파일은 사용 직후 제거한다.
2. 이 bootstrap 배포는 기존 Pages 도메인을 이전하지 않는다. 반환된 version ID와 build ID를 기록하고 운영 Worker의 네 secret 이름·다섯 데이터 binding을 확인한다. 원격 runtime secret 값은 조회/기록하지 않는다. 재개 시 이미 생성한 `sw-blog`를 중복 생성하거나 secret을 다시 교체하지 않는다.
3. 먼저 기존 www CNAME 삭제 수단과 필요한 승인을 확보한 다음, www·루트 도메인을 Pages에서 해제하고 **www CNAME 하나만** 제거한다. Wrangler OAuth에는 DNS 편집 권한이 없고 대시보드 삭제는 실행 직전 별도 확인이 필요하다. `domains/changeset`의 충돌 목록이 비어 있어도 외부 관리 CNAME을 덮어쓸 수 있다는 뜻은 아니다. 실제 deploy는 `100117`로 거부됐으므로 자동 교체를 가정하지 않는다.
4. 같은 빌드 산출물로 `wrangler deploy --config wrangler.worker.jsonc --env production --tag <승인한-SHA>`를 실행해 Custom Domain과 workers.dev 비활성 설정까지 반영한다. 여기서 재빌드하지 않는다. 도메인·인증서가 active인지 확인한다. 해제와 재연결 사이에 짧은 공백이 생길 수 있으며, 실패하면 아래 복구 절차를 바로 실행한다.
5. `pnpm workers:verify-release`를 실행한다. 운영 www의 BUILD_ID·세 자산 hash·홈 SSG HIT·noindex 부재가 로컬 manifest와 맞아야 한다. 아래 사용자 경로도 확인한다.
6. `ADMIN_PASSWORD`를 해당 프로세스에만 전달해 `node scripts/reindex-worker.mjs`를 한 번 실행한다. 기존 Vectorize에 쓰는 단계다. 성공 건수와 검색/RAG 결과를 확인한다.
7. `node scripts/check-workers-cutover.mjs`를 GitHub에서 사용할 CF account/token으로 실행한다. 통과 후에만 repository variable `WORKERS_PRODUCTION_ENABLED=true`를 설정하고 `Deploy Workers`를 main에서 수동 실행해 **CI를 통한 실제 배포·재인덱싱도** 검증한다.

`versions deploy`만으로 routes/Custom Domain은 갱신되지 않는다. 첫 전환의 마지막 `deploy`를 생략하지 않는다. 이 명령들이 새 Worker에 실제로 적용되는지는 승인 후 원격 단계에서 확인한다. dry-run은 권한·인증서·실제 secret 사용까지 증명하지 않는다.

## 전환 직후 확인

- www 홈·목록·글 상세·태그: 본문과 링크, HTML/RSC 이동, 라이트/다크, 히어로·본문 이미지.
- 루트 도메인: 새 DNS와 HTTPS 응답 확인. 기존 Cloudflare redirect 규칙도 확인한다. 코드의 canonical은 www이며, 현재 Worker 자체에는 루트→www redirect가 없으므로 자동 301을 가정하지 않는다.
- `robots.txt`, `sitemap.xml`, RSS, OG/canonical: www 유지, 운영 noindex 없음. 기존 Preview는 noindex·mutation 403 유지.
- 조회/좋아요/댓글 집계, 실제 검색, 챗봇 응답. 데이터와 기존 쿠키 도메인이 유지되는지 확인한다. 공개 댓글/좋아요 테스트가 필요하면 승인 범위에서 가역적으로 실행하고 정리한다.
- Google·네이버 지도: 운영 www에서 실지도·마커 확인. 네이버의 workers.dev 인증 실패를 해결하려고 공개 키 제한을 해제하지 않는다.
- admin 로그인·미디어 목록·기존 파일 조회. 실제 기기 푸시 수신은 별도 기기 확인 항목이다. VAPID 키는 변경하지 않는다.
- Weekly Report/Cloudflare 대시보드: 실제 Worker service는 `sw-blog`, Preview는 `sw-blog-preview`로 구분한다. 기존 도메인 집계는 유지하고 Pages Functions 전용 필터가 있으면 전환 후 실제 지표에 맞춰 갱신한다.

## 실패 시 복구

1. `WORKERS_PRODUCTION_ENABLED=false`로 바꾸고 진행 중인 Workers workflow를 중단한다. 이것만으로 이미 실행 중인 배포가 취소되지는 않으므로 작업 종료도 확인한다.
2. www·루트의 Worker Custom Domain을 제거하고 Pages에 원래 두 custom domain 연결을 복구한다. www CNAME → `sw-blog.pages.dev`, Proxied, TTL Automatic을 복원한다.
3. Pages의 **기존 성공 deployment**가 production인지 확인한다. 변경됐다면 기록한 Pages 배포를 rollback한다. 새 Next16 main을 Pages에서 다시 빌드하지 않는다.
4. 전환 전 루트 DNS는 없었다. 완전한 원상복구라면 새 루트 Worker DNS도 제거하되, Pages 재연결이 만든 레코드를 포함해 실제 상태를 확인한다. 루트 접근성을 새로 유지하는 것은 원상복구와 별도 결정이다.
5. www 실제 응답·API·이미지·검색을 확인한다. D1/R2/Vectorize 리소스를 삭제하거나 과거 데이터 snapshot으로 덮어쓰지 않는다. 도메인 rollback은 전환 이후의 댓글·좋아요를 되돌리는 작업이 아니다.
6. 재인덱싱 후 콘텐츠 버전까지 바뀌었다면 Pages가 제공하는 **복구된 인덱스 입력**을 확인한 뒤 그 버전으로 검색/RAG를 재인덱싱한다. 실패한 Workers release manifest를 그대로 쓰지 않는다.
7. Pages 자동 빌드는 일단 꺼 둔다. main을 Pages 호환 코드로 복원하고 검증하기 전에는 자동 빌드를 재활성화하지 않는다.

## 관찰 기준

2026-08-26~09-01 운영 Pages Functions의 후속 조회는 success 4,151건, clientDisconnected 1건, errors 0, exceededCpu 관측 0이었다. CPU P50 6.516 ms, P95 31.994 ms, P99 51.516 ms였다. **챗봇만의 통계가 아니라 전체 Functions 표본**이다.

10 ms를 넘는 표본 하나를 전환 실패로 판정하지 않는다. 전환 후 실제 `exceededCpu`·5xx·응답 실패·체감 지연과 요청/CPU 분포를 기존 운영 대비 확인한다. 일시 초과 여유가 장기 안정성을 보장하지도 않는다. 연동 테스트의 인증용 wrapper 비용도 실제 앱 수치와 구분한다. 오류 증가나 핵심 기능 실패가 지속되면 원인을 분리하고 필요하면 Pages로 복구한다. 7일 비교를 권장하지만 자동 모니터링 작업을 생성한 것은 아니다.

## 로컬 준비 검증

- lint·TypeScript·329개 테스트·26개 MDX 이미지 alt 통과.
- 운영 build·환경 파일 비공개 값 제거·배포 dry-run 통과.
- gzip 1,701.88 KiB / Free 3,072 KiB, 정적 페이지 47개 / 직접 제공 응답 35개.
- 아래 실행 결과를 제외한 최종 도메인 전환·재인덱싱·Workers 자동 배포 검증은 아직 완료하지 않았다.

## 2026-09-03 실행 결과와 재개 지점

- `7869dd2a7dd2c2816a5d1decaa06ac7d0ac646c7`까지 migration 브랜치와 main을 push했다. GitHub CI `33648110819`는 성공했고 `Deploy Workers`는 비활성 변수 때문에 의도대로 skipped됐다.
- Pages production/preview 자동 빌드를 중지했다. 지도 public variable 두 개를 등록하고 GitHub `production` environment를 main branch로 제한했다. `WORKERS_PRODUCTION_ENABLED=false`를 유지한다.
- 로컬 production build·329개 테스트·dry-run 통과. 실제 업로드 gzip 1,701.89 KiB. 임시 bootstrap 설정으로 `sw-blog` 최초 생성과 secret 네 개 주입에 성공했다. 사용한 임시 secret 파일은 제거했다.
- 최초 version `bb9d8cb0-577d-4f74-96c5-5f35eb13982c`, 도메인 연결 시도 후 code version `21ddf4ea-b356-4930-86a8-023c643eb0e2`, BUILD_ID `akwmftksD8-ELTvFVRr_Z`. 운영 Worker의 Custom Domain은 아직 없다. 기존 Preview는 변경하지 않았다.
- Pages 도메인을 해제한 뒤 deploy했지만 기존 www CNAME 때문에 API 오류 `100117`이 발생했다. 즉시 두 Pages 도메인을 재등록했고, 재연결 중 HTTP 522 이후 www 홈 200·pages.dev 301 복구를 확인했다. Pages production deployment는 기존 `87ceefa2-05e4-477e-bc82-2f66cd80c914`다.
- DNS 레코드 삭제는 아직 하지 않았다. 대시보드에서 www CNAME 삭제를 승인받은 후 DNS/Pages 연결 상태를 다시 확인하고 전환을 재개한다. Pages가 현재 운영 중인 상태에서 준비 없이 도메인만 먼저 해제하지 않는다.
- 실제 Workers 운영 확인, 검색/RAG 재인덱싱, GitHub CF 토큰의 Workers 권한과 Actions 배포, 브라우저/지도/챗봇 검증은 다음 단계다. D1/R2/Vectorize 사용자 데이터에는 쓰지 않았다.

근거: [Pages→Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/), [Custom Domain 제약](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [버전과 배포 분리](https://developers.cloudflare.com/workers/versions-and-deployments/), [CPU 한도 설명](https://developers.cloudflare.com/workers/platform/limits/#cpu-time).
