# QA — v5 refinement

Static checks performed:
- JavaScript syntax checked with Node (`node --check app.js`).
- HTML parsed and all local `src` / document `href` references checked for missing files.
- CSS brace structure checked and balanced.
- No annotation-arrow glyphs remain outside the full-screen image viewer.
- Project image viewer uses `object-fit: contain` at full stage size.
- Collection entrance is one-time and no longer scroll-scrubbed; settled cards receive continuous subtle orbital motion.
- Music QR entrance is one-time and retains its completed state.
- Timeline remains pinned on desktop and translates to a linear sequence on mobile.
- Personal Profile photograph remains pending because no portrait asset was supplied in this revision.

Note: a reliable visual Chromium screenshot pass was not available in this container session, so browser/device visual QA should still be performed before publishing, especially Safari/iPhone.


## v6 timeline/index revision
- Index selected-work hairline removed; stack vertically centred between header and section divider.
- Section image reveal includes a slightly longer base delay.
- Timeline year is no longer scroll-scrubbed; it triggers only when a chapter is focused.
- Reverse chapter activation triggers reverse year transitions.
- Atelier Rebelo de Andrade added as a second 2026 chapter and intentionally replays the 2026 glyph animation.
- CURRENT CHAPTER label removed.
- Timeline uses the local Apple Garamond font request/fallback stack.
- Viewport blur is top/bottom only.
