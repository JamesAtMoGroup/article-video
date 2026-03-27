# article-video — Progress Log

## Project Overview

Remotion project that turns daily AI knowledge articles into short explainer videos (~33s).
Each video covers 4 scenes driven by TTS audio, rendered at 1280×720 30fps.

**Skill:** `SKILL.md` (daily-knowledge-scrape) — auto-searches and writes daily AI article to this folder
**Output:** `out/video.mp4` via `npm run build`

---

## Current Status: First Video ✅ Buildable

### What's Done

| Task | Status | Notes |
|------|--------|-------|
| Remotion project scaffold | ✅ Done | `package.json`, `remotion.config.ts`, `tsconfig.json` |
| `VideoComposition.tsx` | ✅ Done | 4-scene layout: title, copilot, mcp, work |
| `CharacterPip.tsx` | ✅ Done | Lottie character, bottom-right PiP |
| `audioConfig.ts` | ✅ Done | TTS audio wiring, 1011 frames total (~33s) |
| Glassmorphism design system | ✅ Done | BG `#0d0d1a`, ORANGE `#FF6B35`, TEAL `#20D9BA`, YELLOW `#FFD60A` |
| TTS audio (scenes 1–4) | ✅ Done | `public/audio/scene1–4.mp3` |
| Background music | ✅ Done | `bgmusic.mp3`, volume 0.06 |
| Lottie characters | ✅ Done | `public/lottie/character1.json`, `character2.json` |
| Daily scrape skill | ✅ Done | `SKILL.md` + `daily-knowledge-scrape.skill` |

### Daily Articles Generated

| Date | File | Status |
|------|------|--------|
| 2026-03-24 | `ai-knowledge-2026-03-24.md` | ✅ Done |
| 2026-03-25 | `ai-knowledge-2026-03-25.md` + `每日AI知識庫_2026-03-25.md` | ✅ Done |
| 2026-03-26 | `ai-knowledge-2026-03-26.md` | ✅ Done |

### Scene Structure (audioConfig.ts)

| Scene | ID | Frames | Duration |
|-------|----|--------|----------|
| 1 | title | 0–171 | 5.7s |
| 2 | copilot | 171–437 | 8.9s |
| 3 | mcp | 437–705 | 8.9s |
| 4 | work | 705–1011 | 10.2s |
| **Total** | | **1011** | **~33s** |

### Design System

```ts
BG = "#0d0d1a"
ORANGE = "#FF6B35"
TEAL = "#20D9BA"
YELLOW = "#FFD60A"
glass = { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", borderRadius: 20 }
```

---

## Pending

- [ ] Render first full video to `out/video.mp4`
- [ ] Automate: article → TTS → replace scene audio → re-render pipeline
- [ ] Template the video scenes to pull text from the daily article `.md` file dynamically
- [ ] Add more character Lottie animations

---

## File Map

```
article-video/
  src/
    Root.tsx             — Remotion composition entry
    VideoComposition.tsx — All 4 scenes + particles + CharacterPip
    CharacterPip.tsx     — Lottie character PiP component
    audioConfig.ts       — Scene timing + audio sources
    index.ts             — Remotion entry
  public/
    audio/
      scene1–4.mp3       — TTS narration per scene
      bgmusic.mp3        — background music (0.06 volume)
      bgmusic.wav        — source WAV
    lottie/
      character1.json    — animated character A
      character2.json    — animated character B
  SKILL.md               — daily-knowledge-scrape skill
  daily-knowledge-scrape.skill
  ai-knowledge-YYYY-MM-DD.md   — daily articles
```
