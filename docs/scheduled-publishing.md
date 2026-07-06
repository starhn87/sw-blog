# 예약 발행 (Scheduled Publishing) 설계 메모

> 상태: **보류** (2026-07-06). 1단계까지 구현했다가 인프라 부담으로 롤백했다.
> 이 문서는 나중에 재개할 때를 위한 참고용이다.

## 목표

글 frontmatter에 발행 예정 시각(`publishAt`)을 지정하면, 그 시각이 지난 뒤
자동으로 공개된다. 지정하지 않으면 지금처럼 즉시 발행.

## 왜 보류했나

현재 배포는 `@cloudflare/next-on-pages`(Cloudflare **Pages**)이고 완전 정적(SSG)이라,
예약 발행의 핵심은 "발행 시각에 사이트를 다시 빌드하는 것"이다. 그런데:

- **Pages는 Durable Object 클래스를 직접 정의·export할 수 없다**
  ([next-on-pages #458](https://github.com/cloudflare/next-on-pages/issues/458)).
  DO 바인딩은 `[[durable_objects.bindings]]`의 `script_name`으로 **별도 Worker**를
  가리키는 형태라, DO 클래스는 다른 Worker에 두고 배포해야 한다.
- OpenNext(Workers 어댑터)로 가면 custom worker로 DO export가 가능하지만
  ([OpenNext Custom Worker](https://opennext.js.org/cloudflare/howtos/custom-worker)),
  `next-on-pages → OpenNext`는 배포 인프라 전체(Pages→Workers, 빌드·wrangler·라우팅)를
  바꾸는 마이그레이션이고, DO를 구현한 Worker는 preview URL이 비활성된다.

→ 예약 발행 하나를 위해 별도 Worker나 OpenNext 마이그레이션까지 가는 건 과하다고
판단해 보류했다.

## 설계 (DO Alarm 방식, 원안)

```
글을 publishAt(미래)로 커밋·push → Cloudflare 빌드 (필터가 숨김)
  → admin에서 예약 등록 → DO에 setAlarm
      ⏰ publishAt 도달 (폴링 없이 딱 1회)
  → DO alarm() → Deploy Hook 호출 → 재빌드
  → 이제 publishAt ≤ now → 글 공개
```

구성 요소:

| # | 요소 | 역할 |
|---|------|------|
| 1 | `publishAt` frontmatter | 발행 예정 시각(ISO). 없으면 즉시 발행 |
| 2 | `isPublic()` 필터 | `published && (!publishAt \|\| publishAt ≤ now)` |
| 3 | `PublishScheduler` DO | 예약 큐(SQLite) + 가장 이른 시각에 `setAlarm` |
| 4 | Deploy Hook | DO가 호출하는 Pages 재빌드 URL |
| 5 | admin 예약 API/UI | 예약 등록 → DO에 스케줄 추가 |

DO 동작(단일 스케줄러 `idFromName("scheduler")`): `addSchedule`로 큐에 넣고 가장 이른
시각에 `setAlarm` → `alarm()`이 지난 예약을 처리하고 **Deploy Hook 1회 호출**(여러 글
동시 예약이어도 재빌드는 한 번) → 남은 것 중 가장 이른 시각으로 다시 `setAlarm`.

주의점: 숨긴 글이 URL·사이트맵·RSS·search-index로 새면 안 되므로, 필터를
`getAllPosts`·`getPostBySlug`(상세 404)·`generateStaticParams`·사이트맵·RSS·빌드
스크립트까지 **한 곳(`isPublic`)으로 통일**해야 한다.

## 재개 시 옵션

1. **GitHub Actions cron** (가장 단순): Worker/DO 없이, 매일 새벽 cron이 Deploy Hook을
   호출해 재빌드. 하루 단위 정밀도("그날 오전"). 무료 빌드 한도(월 500) 안전, 인프라 추가 0.
   → **예약 발행만이 목적이면 이게 가장 현실적.**
2. 별도 Worker + DO Alarm: 예약 시각에 정확히 1회 발화(정밀). DO용 Worker를 따로
   배포·관리해야 함.
3. OpenNext 마이그레이션 후 DO: 큰 작업. 단, OpenNext 이전 자체는 next-on-pages의
   제약들(위 DO 문제, 비ASCII 동적 라우트 404 등) 때문에 장기적으로 별도로 고려할 가치는 있음.

## 1단계 코드 (롤백됨, 재현용)

"미래 글 숨김"은 DO 없이도 된다. 롤백한 커밋(로컬 `6e708e8`, reflog)에 있던 내용:

- `PostFrontmatter`에 `publishAt?: string` 추가.
- 외부 의존 없는 순수 모듈 `src/lib/post-visibility.ts`:
  ```ts
  export function isPublic(post: { published: boolean; publishAt?: string }): boolean {
    return post.published && (!post.publishAt || new Date(post.publishAt) <= new Date());
  }
  ```
- `published` 체크를 `isPublic`으로 교체한 소비처: `getAllPosts`(mdx.ts), 상세
  페이지(`generateMetadata`·`notFound`), `PostLink`, `scripts/build-search-index.ts`,
  `scripts/build-rag-chunks.ts`.
  - 빌드 스크립트는 `@/` alias를 안 써서 `../src/lib/post-visibility` 상대 import +
    `data as { published: boolean; publishAt?: string }` 캐스팅이 필요했다.

이 1단계만 다시 얹으면 "미래 date 글 숨김"은 바로 동작한다. 자동 발행(재빌드 트리거)은
위 옵션 중 하나를 붙이면 된다.
