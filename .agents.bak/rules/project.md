# Article Video — Design Tokens & Dimensions

> All values are at S=3 (4K). Raw px values are base * S.

---

## Scale Factor

```ts
const S = 3;
```

---

## Canvas

```ts
const W = 1280 * S;   // 3840px
const H = 720  * S;   // 2160px
const FPS = 30;
```

---

## Layout Zones

```ts
const NAV_H        = 48  * S;   // 144px  — top progress bar
const SUBTITLE_SAFE = 80  * S;  // 240px  — subtitle reserved zone (bottom)
const CONTENT_H    = 540 * S;   // 1620px — ContentColumn height
const CONTAINER_W  = 640 * S;   // 1920px — content column width
const COL_LEFT     = (W - CONTAINER_W) / 2;  // 960px

// Content safe zone: top 144px to bottom 1840px (H - SUBTITLE_SAFE - NAV_H offset)
// ContentColumn: top: NAV_H + 16*S = 192px, height: CONTENT_H = 1620px
// Bottom of ContentColumn: 192 + 1620 = 1812px (within safe zone)
```

---

## Color Tokens

```ts
const C = {
  bg:            "#000000",
  surface:       "#0d0d0d",
  primary:       "#7cffb2",              // neon green
  primaryLight:  "rgba(124,255,178,0.07)",
  primaryBorder: "rgba(124,255,178,0.14)",
  text:          "#ffffff",
  muted:         "#888888",
  yellow:        "#ffd166",
  yellowLight:   "rgba(255,209,102,0.1)",
  yellowBorder:  "rgba(255,209,102,0.2)",
  red:           "#ff6b6b",
};
```

---

## Typography — Font Size Rules (Updated 2026-04-21)

**Absolute minimum: 18*S (54px) for ALL fontSize values. No exceptions.**

| Use | Font | Minimum size |
|-----|------|-------------|
| Absolute bottom | Any | 18*S = 54px |
| Space Mono badge/label | Space Mono | 18*S = 54px |
| Body text | Noto Sans TC | 18*S = 54px |
| Labels, captions, tags | Space Mono | 20*S = 60px |
| Featured/highlight text | Noto Sans TC | 20*S = 60px |
| Section heading | Noto Sans TC | 22*S = 66px |

**Mandatory QA grep (run before done):**
```bash
grep -n "fontSize: [0-9]\{1,2\} \* S" src/VideoComposition_*.tsx
# Any result with value < 18 = FAIL. Fix all before proceeding.
```

### SVG text inside viewBox-scaled SVG

When writing `<text>` inside an `<svg>` that uses `viewBox`, the coordinate space is already scaled:
```
SVG fontSize = target_screen_px / S
```
- `fontSize={28}` -> 56px screen (label)
- `fontSize={40}` -> 80px screen (key result)
- Never use string attribute `fontSize="N"` — always JSX number

---

## Scene Structure (typical)

| Scene | Description |
|-------|-------------|
| TitleScene | AbsoluteFill centered (flex center), Badge "每日 AI 知識庫", paddingBottom: SUBTITLE_SAFE |
| Scene 1–3 | ContentColumn with Phase A/B, SectionBadge, cards, Motion graphic animations |
| SummaryScene | 3 recap cards |

### ContentColumn spec
- Uses `height` (NOT maxHeight) + `overflow: "hidden"` (NOT overflowY)
- Max content: CONTENT_H = 1620px
- If Phase A content exceeds 1620px -> use element fade-out pattern
- useFadeUp starts at translateY(22*S = 66px) — include this 66px in height estimation

### Motion Graphics placement
- Position: outside content column (x 960-2880)
- Right side: `right: 40*S`, Left side: `left: 40*S`
- Never use `left: "50%"` or any centered positioning
- No two animations on same side at same time (overlap check required)
