# Article Video — Agent Guide

> **MANDATORY**: Read this file AND the rules below BEFORE making any plan.
> Agents that skip this step will produce wrong output.

---

## Read Order (required before any plan)

1. **This file** — project identity, team, invariants
2. **`.agents/rules/project.md`** — design tokens, scale, all dimensions, font size rules
3. **`.agents/rules/pipeline.md`** — 3-phase production SOP, QA rules, Scene Dev mandatory rules

---

## Project Identity

**What this is:** Daily AI knowledge explainer videos (~4–6 min), each covering 1–3 topics from that day's AI article. Published daily.

**Repo:** JamesAtMoGroup/article-video
**Location:** `/Users/jamesshih/Projects/article-video/`

**Inbox structure:**
```
inbox/YYYY-MM-DD/
  YYYY-MM-DD.wav (or .mp3 / .m4a)   <- raw audio (ALL formats need STS)
  ai-knowledge-YYYY-MM-DD.md         <- article
  ai-knowledge-YYYY-MM-DD_script.md  <- voiceover script
```

**Output:**
```
out/YYYY-MM-DD/
  {title}-YYYY-MM-DD.mp4     <- rendered video (title-first naming convention)
  {title}-YYYY-MM-DD.vtt     <- subtitle file
```

**Google Drive:** Uploaded to `gdrive:YYYY-MM-DD` subfolder via rclone.

---

## Scale & Dimensions

```ts
const S = 3;                    // scale factor
const W = 1280 * S;             // 3840px
const H = 720  * S;             // 2160px
const FPS = 30;
const NAV_H = 48 * S;           // 144px — progress bar at top
const SUBTITLE_SAFE = 80 * S;   // 240px — subtitle reserved zone at bottom
const CONTENT_H = 540 * S;      // 1620px — ContentColumn height
const CONTAINER_W = 640 * S;    // 1920px — content column width
const COL_LEFT = (W - CONTAINER_W) / 2;  // 960px
```

---

## Pipeline Overview (3 Phases)

```
inbox/YYYY-MM-DD/ (wav + md + script)
  |
  v
Phase 1: article-video-phase1.sh
  ElevenLabs STS (auto-split if >290s)
  -> processed.wav
  -> Whisper medium zh -> VTT
  -> opencc s2twp (Simplified -> Traditional)
  -> Manual error correction (Whisper mis-transcriptions)
  |
  v
Phase 2: article-video-phase2.sh
  claude -p Scene Dev (reads skill + reference TSX -> generates new TSX)
  -> TypeScript check (npx tsc --noEmit)
  -> Font size grep (all fontSize >= 18*S)
  -> VTT sync verification (Python script)
  |
  v
James previews in Remotion Studio -> approves
  |
  v
Phase 3: article-video-phase3.sh
  Remotion render -> mp4
  -> Rename to {title}-{date}.mp4
  -> rclone upload to Google Drive
  -> iMessage notification
```

---

## Team Structure

| Role | Responsibility |
|------|---------------|
| **Pipeline Director** | Orchestrates all 3 phases. Reads inbox, runs phase scripts, validates output between phases. |
| **Phase 1 (automated)** | STS + Whisper + opencc. Director manually corrects Whisper errors after. |
| **Phase 2: Scene Dev Agent** | `claude -p` generates full TSX composition with visual metaphor animations. Must read skill file + reference TSX first. |
| **Phase 2 QA (automated)** | TypeScript check + font size grep + VTT sync Python verification. All automated in phase2.sh. |
| **Phase 3 (automated)** | Render + rename + upload. Fully automated. |

**Key Rule:** James previews in Remotion Studio between Phase 2 and Phase 3. Never render without preview approval.

---

## Invariants (never override)

- **Background:** `#000000`
- **Primary accent:** `#7cffb2` neon green
- **Secondary accent:** `#ffd166` yellow
- **Fonts:** Noto Sans TC (body), Space Mono (labels/numbers/technical)
- **Output:** 4K 3840×2160, S=3, 30fps
- **Font size absolute minimum:** 18*S (54px) — ALL fontSize, no exceptions
- **ContentColumn:** `height` (not maxHeight) + `overflow:"hidden"` (not overflowY)
- **Entry animations:** Easing.bezier + interpolate only (no spring for fade-in/fade-up)
- **spring() only for:** ContentColumn scrollUp (damping:200), iMessage slide (damping:22,stiffness:130)
- **CSS transitions FORBIDDEN** — all animation via `useCurrentFrame()` + `interpolate()`
- **VTT-first:** Scene Dev cannot start until corrected VTT exists
- **SummaryScene required** at end of every episode
- **Audio:** BG music at volume 0.10 with fade in/out; NO denoise
- **Output naming:** `{title}-{date}.{ext}` (title first, then date)
- **ALL audio in inbox requires STS** regardless of filename (even "enhanced")
