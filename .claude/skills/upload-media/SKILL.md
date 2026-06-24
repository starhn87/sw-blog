---
name: upload-media
description: 블로그 이미지/미디어를 운영 R2에 업로드할 때. /api/media에 ADMIN_PASSWORD로 직접 업로드하고 mdx에 URL을 반영한다.
---

# 미디어 업로드

블로그 이미지는 운영 `/api/media`(Cloudflare R2)에 직접 업로드한다. 로컬 R2와 동기화는 불필요하다.

## 업로드

`.env.local`의 `ADMIN_PASSWORD`로 인증한다:

```bash
PW=$(grep '^ADMIN_PASSWORD=' .env.local | cut -d= -f2- | tr -d '"')
curl -sf -X POST https://www.seung-woo.me/api/media \
  -H "x-admin-password: $PW" \
  -F "files=@/path/to/image.png"
```

- 파일명은 의미 있게 둔다. key가 `{timestamp}-{파일명}` 형식이라 그대로 노출된다.
- 응답 `{ items: [{ key, url }] }`의 key로 전체 URL을 조립한다:
  `https://www.seung-woo.me/api/media?key={key}`

## mdx에 반영

- `thumbnail`, `ogImage`, 본문 `<img src>`에 위 URL을 쓴다
- 16:9에 가까우면 thumbnail/ogImage를 공유해도 된다
- 모든 `<img>`에는 alt를 붙인다 (`pnpm verify`가 검사)

## 교체

같은 파일을 다시 올리면 **새 key**가 생긴다(덮어쓰기가 아님). 교체할 때는 mdx의 URL 3곳(thumbnail/ogImage/본문 img)을 모두 새 key로 바꾼다. 기존 파일은 R2에 남으므로 필요하면 따로 정리한다.
