# Workers 전환: 실제 연동 검증

검증일: 2026-09-02. 코드 기준 `151c8d4` / 원격 Preview 코드 `caf8212`.

## 결론

검색·Claude streaming·원격 D1/R2·벡터 쓰기는 동작했고 현재 요청량에도 여유가 있다.
챗봇과 D1 혼합 구간의 CPU 10 ms 초과 표본만으로 Free 전환 불가를 판정하지 않는다.
후속 운영 Pages 비교에서도 전체 Functions CPU P99 51.516 ms와 errors 0이 함께 관측됐다.
챗봇만의 통계는 아니며 장기 안정성을 보장하지도 않는다. 챗봇 재설계는 전환 선행 조건에서
제외하고, 실제 전환 후 기존 운영 대비 실패·지연·CPU를 비교한다. 네이버 지도는 운영 정상,
Preview 인증 실패다. 실제 기기 푸시 수신도 남아 있다. 2026-09-03 배포/재인덱싱 준비와
최신 순서는 [전환 절차](./next16-workers-cutover.md)를 따른다.

애플리케이션 코드를 수정하거나 운영으로 전환하지 않았다. 이 문서는 검증 결과이며
요금제 변경·도메인 전환·운영 데이터 변경을 승인한 문서가 아니다.
마지막 `pnpm verify`도 lint·typecheck·307개 테스트·MDX 26개 이미지 alt 검사를 통과했다.

## 환경과 격리

- 기존 `sw-blog-preview`는 읽기 전용, noindex, secret 없음 상태를 유지했다.
- 별도 `sw-blog-verify-20260902` Worker에 같은 앱과 인증용 테스트 진입점을 배포했다.
  gzip 1,702.53 KiB, startup 39 ms였다. startup 시간은 요청 CPU와 다른 지표다.
- 새 D1에 기존 7개 migration을 적용하고 새 R2와 1,024차원 Vectorize index를 사용했다.
  기존 검색/RAG index는 조회만 허용하고 두 `/api/*/index` 경로는 403으로 차단했다.
- 임의의 테스트 인증 토큰으로 정적 파일을 포함한 모든 요청을 보호했다. 테스트용
  관리자 비밀번호는 운영 비밀번호와 다르며, 런타임 비공개 키는 Worker secret으로만
  주입했다. 배포 번들·정적 산출물에 키 값이 없는 것도 검사했다.
- 테스트 Cache API key는 별도 hostname을 사용해 운영 통계 캐시와 분리했다.
- 실제 Claude 질문은 공개 게시글 관련 5회, Preview 검색은 3회로 제한했다.
  Workers Free와 별개인 외부 AI/API 사용량이 발생하며 비용이 0원이라는 판정은 아니다.

## 최근 요청량

Cloudflare GraphQL에서 최근 완료된 UTC 7일, 2026-08-26~09-01을 조회했다.
블로그 도메인의 HTTP 요청은 방문자 수나 페이지뷰가 아니라 이미지·봇 등을 포함한다.
Workers/Pages 수치는 adaptive 집계의 요청 추정치이며 결제 명세가 아니다.

| UTC 날짜 | 블로그 도메인 전체 HTTP | 운영 Pages Functions | 계정의 다른 Workers | Functions + Workers |
| --- | ---: | ---: | ---: | ---: |
| 08-26 | 911 | 764 | 692 | 1,456 |
| 08-27 | 807 | 639 | 94 | 733 |
| 08-28 | 866 | 542 | 109 | 651 |
| 08-29 | 568 | 437 | 99 | 536 |
| 08-30 | 1,042 | 621 | 1,647 | 2,268 |
| 08-31 | 653 | 505 | 139 | 644 |
| 09-01 | 436 | 644 | 95 | 739 |

사용한 데이터셋은 `httpRequests1dGroups`, `pagesFunctionsInvocationsAdaptiveGroups`,
`workersInvocationsAdaptive`다. 08-31 Pages 505건 중 1건은 `clientDisconnected`이며,
조회된 Functions/Workers의 `sum.errors`는 모두 0이었다. 서로 다른 집계 범위와
샘플링을 사용하므로 도메인 HTTP와 Functions 수치를 일대일로 대응시키지 않는다.

조회된 계정 Functions + Workers 최대치는 하루 약 2,268건이다. Free의 계정 단위
일일 100,000건에 비해 약 2.3%다. 현재로서는 요청량보다 요청당 CPU가 더 중요한
제약이다. 향후 트래픽·봇 증가, 다른 Worker의 증가까지 보장하는 수치는 아니다.
공식 기준: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

## 실제 연동 결과

| 항목 | 결과와 검증 범위 |
| --- | --- |
| 의미 검색 | PostGIS 키워드와 지구 곡률/브라우저 알림에 관한 문장형 검색 모두 관련 글 반환. 문장형 검색 최상위 점수 0.541, 0.591 |
| Claude | 5개 질문 모두 스트리밍 응답 성공. PostGIS 답변의 관련 글 링크와 작성자 기술 질문의 출처 헤더 확인 |
| D1 | 좋아요 등록/취소, 댓글/답글 작성, 비밀번호 오류 거부, 댓글 수정/좋아요, 부모 댓글 삭제 시 답글·좋아요 삭제 확인 |
| 통계 | 조회수 2회 증가, 일일 방문과 참여 이벤트 중복 제거, `no-cache` 조회의 BYPASS와 최신 좋아요 수 확인 |
| R2 | 파일·포스터 업로드, 원본 바이트와 Range 206, 파일명/폴더명 변경, 포스터와 정렬 정보 유지, 이전 key 404, 삭제 후 빈 목록 확인 |
| Vectorize | 실제 Workers AI로 1,024차원 생성, 격리 index에 1건 upsert, 유사도 0.9999991 조회, 삭제 후 검색 결과 0건 확인 |
| 푸시 구독 API | 관리자 인증, 필수 값 검증, 등록, 같은 endpoint 갱신 시 1건 유지, 삭제 후 0건 확인. 외부 알림은 보내지 않음 |
| Google Maps | Preview 삿포로 1편에서 지도·마커·클러스터 표시. 가라쿠 마커 클릭 시 주소와 외부 Google Maps 링크 확인 |
| NAVER Maps | Preview 평창·강릉 1편에서 화면에 인증 실패, SDK console에 500. 같은 운영 글에서는 지도 타일 21개와 마커 정상 |

R2 검사는 합성 바이트를 사용했다. 실제 동영상 디코딩/재생까지 확인한 검사가 아니다.
벡터 저장·조회 자체를 검증했으며 전체 게시글 재인덱싱 API는 호출하지 않았다.
푸시 구독의 임시 endpoint는 예약된 `.invalid` 도메인이었고 구독이 있는 동안
활동 알림을 발생시키지 않았다. 실제 Push service 전달·서비스 워커 처리·기기 수신은 미검증이다.

네이버 지도는 **Preview hostname의 인증/허용 도메인 설정을 먼저 확인할 사안**이다.
운영 정상과 Preview 실패를 비교했지만 공급자 콘솔의 허용 목록은 확인하지 않았으므로
도메인 제한을 확정 원인으로 단정하지 않는다. 운영 페이지 비교 시 `/api/*` 요청을
차단해 조회수·참여 이벤트를 기록하지 않았다. Google Maps의 기존 legacy Marker
deprecated 경고는 남아 있으며 지도 기능 실패나 새 마이그레이션 회귀와 구분한다.

## 원격 CPU

2026-09-02 14:49~14:51 UTC 구간을 실행한 뒤 14:55:48 UTC에 조회한 GraphQL 값이다.
API의 마이크로초를 ms로 환산했다. 아래 표는 장기 분포가 아니라 짧은 검증 표본이다.

| 구간 | 집계 requests 추정치 | CPU P50 | CPU P99 |
| --- | ---: | ---: | ---: |
| 기존 Preview 실제 검색 3회 | 3 | 2.506 ms | 4.859 ms |
| 최초 챗봇 2회 구간 | 1 | 519.841 ms | 519.841 ms |
| 추가 챗봇 요청 1 | 1 | 298.226 ms | 298.226 ms |
| 추가 챗봇 요청 2 | 1 | 13.879 ms | 13.879 ms |
| 추가 챗봇 요청 3 | 1 | 14.266 ms | 14.266 ms |
| D1 읽기/쓰기 혼합 | 18 | 6.127 ms | 16.393 ms |
| R2 CRUD와 상태 확인 혼합 | 21 | 6.964 ms | 7.736 ms |

- 최초 챗봇 2회 중 집계에서 1건만 관측됐다. 어느 요청인지, 새 isolate의 cold start인지
  확정하지 않았다. 1건의 P99는 통계적으로 안정적인 tail latency가 아니다.
- 검색 외 항목은 테스트 토큰 해시 검사 등 인증용 진입점의 CPU도 포함한다.
  운영 CPU의 정확한 값으로 간주하지 않으며, 실행 지역과 새 저장소의 차이도 있다.
- D1/R2는 여러 API·검사용 상태 조회가 섞인 구간이다. 개별 endpoint의 CPU나
  DB 자체 처리 시간으로 해석하지 않는다. `waitUntil` 후속 작업도 CPU에 포함될 수 있다.
- adaptive 집계의 requests는 실제 호출 수와 다를 수 있다. 위 관측 row의 상태는
  모두 `success`, errors는 0이지만 **응답 성공은 CPU 10 ms 기준 통과와 다르다.**
- 요청 완료까지의 경과 시간과 CPU는 다르다. 최초 두 Claude 요청의 전체 경과 시간은
  약 5.3초/2.0초였고, 이 값을 CPU 시간으로 사용하지 않았다.
- 푸시 구독은 기능만 확인했다. Worker 삭제 뒤 같은 CPU 질의에서 해당 Worker가
  조회되지 않아 추가 CPU 판정은 하지 않았다. 위 수치는 삭제 전 확인한 기록이다.

Free는 CPU 10 ms/요청이며 일시적인 여유가 있더라도 지속 초과 시 실패할 수 있다.
이번 성공만으로 Free 안정성을 확정하지 않는다. 반대로 짧은 테스트만으로 Paid가
필수라고 단정하지도 않는다. [공식 CPU 설명](https://developers.cloudflare.com/workers/platform/limits/#cpu-time).

## 정리와 남은 순서

테스트 Worker와 그 secret, 새 D1/R2/Vectorize를 삭제했다. R2는 삭제 전에 빈 버킷,
벡터와 구독은 각각 0건이었다. 테스트 DB의 합성 조회/참여 기록도 DB와 함께 삭제돼
복구 대상으로 보존하지 않았다. 로컬 임시 secret 파일과 테스트 진입점도 제거했다.
삭제 후 API 조회에서 Worker/D1/R2는 404, Vectorize는 `index.deleted` 410을 확인했다.

운영 Pages deployment `87ceefa2-05e4-477e-bc82-2f66cd80c914`, main `a86aef4`,
운영 도메인과 HTTP 200/Pages hostname 301은 그대로다. 기존 Preview version
`7dd7df6d-fe72-4253-bd2f-987251412f58`와 여섯 binding, no custom domain, secret 없음도
그대로다. 앱 수정·main 병합·운영 배포·요금제 변경·운영 index 쓰기는 하지 않았다.

1. 준비한 GitHub Actions 배포/재인덱싱과 운영 설정을 승인 후 적용한다. 실제 실행·도메인 이전·rollback 체크는 [전환 절차](./next16-workers-cutover.md)를 따른다.
2. 전환된 운영 www에서 두 지도와 기존 데이터·검색·챗봇을 확인한다. 실제 기기 푸시 수신은 기기에서 별도 확인한다.
3. 기존 Pages 성공 배포를 보존하고 운영 실패·CPU·사용량·SEO를 비교한다. 챗봇/D1 세부 CPU 분해와 예약 문자·UTF-8 fallback 최적화는 관측에 따른 후속 작업이다.

비공개 키를 제외한 로컬 실행 기록은 `/tmp/sw-blog-live-verify.EeqweF/`에 있다.
임시 디렉터리는 영구 보존을 보장하지 않으므로 핵심 판정과 수치는 이 문서에 기록했다.
