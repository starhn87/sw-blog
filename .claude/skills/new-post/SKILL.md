---
name: new-post
description: 새 블로그 글(content/posts/*.mdx)을 작성·발행할 때. frontmatter 스캐폴딩, 글쓰기 규칙, 검증/발행 절차를 안내한다.
---

# 새 블로그 글 작성

`content/posts/<slug>.mdx`로 새 글을 만든다. slug가 곧 URL이 된다.

## frontmatter (필수)

```yaml
---
title: "글 제목"
description: "한 줄 설명 (해요체)"
date: "YYYY-MM-DD"
tags: ["Tag1", "Tag2"]
published: false   # 작성 중엔 false, 발행 시 true
thumbnail: "https://www.seung-woo.me/api/media?key=..."   # 16:9 권장
ogImage: "https://www.seung-woo.me/api/media?key=..."     # thumbnail과 같아도 됨
---
```

상단 대표 이미지의 `<img>`에는 **alt 필수**다. 없으면 `pnpm verify`가 실패한다.

```jsx
<img
  src="https://www.seung-woo.me/api/media?key=..."
  alt="이미지를 설명하는 텍스트"
  className="w-full rounded-xl object-cover aspect-[16/9] mb-8"
  priority
/>
```

## 글쓰기 규칙

- 해요체, 친근한 1인칭. 솔직한 경험 위주
- em dash(—) 금지 → hyphen(-) 사용 (글/코드/UI/메타데이터 전부)
- "그냥" 지양, 불필요한 쉼표 최소화 (접속어 뒤 쉼표 제거, 긴 복문은 두 문장으로)
- 강제 3항목 리스트·완벽한 병렬 구조·가짜 격언 지양
- 거친 동사(박다/터졌다/벗겨내다) 지양, 예의 있는 톤
- 크기 단위는 px 또는 rem (em 금지)
- 이미지 그리드는 최대 2열 (3장이면 1장 단독 figure + 2장 grid)
- 섹션 간격은 `mt-12 md:mt-16`, 빈 placeholder는 `py-6 md:py-10`
- 새 단락을 추가하면 기존 단락과 결론이 충돌하지 않는지 점검한다

## 이미지

이미지 업로드는 `upload-media` 스킬을 따른다.

## 발행

1. `published: true`로 변경
2. `pnpm verify` 통과 확인 (`publish-check` 스킬)
3. `content/posts/<slug>.mdx` 커밋 & push
4. `reindex.yml`이 검색/RAG를 자동 재인덱싱한다

발행/배포는 사용자가 명시적으로 지시한 글만 진행한다.
