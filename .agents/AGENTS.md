# Article Video — Agent Guide

> **MANDATORY**: Read this file AND the rules below BEFORE making any plan.
> Agents that skip this step will produce wrong output.

---

## Read Order (required before any plan)

1. **This file** — project identity, team, invariants
2. **`.agents/rules/project.md`** — design tokens, scale, all dimensions
3. **`.agents/rules/pipeline.md`** — production SOP, phase order, QA gate
4. **`/Users/jamesshih/Projects/vibe-coding-video/.agents/skills/remotion-best-practices/SKILL.md`** — then load the specific rule files relevant to your task

> The Remotion skill lives in the vibe-coding-video project. Both projects share the same skill.

---

## Project Identity

**What this is:** Daily AI knowledge explainer videos (~34s), each covering 3 topics from that day's AI article. Published daily.

**Repo:** JamesAtMoGroup/article-video
**Location:** `/Users/jamesshih/Projects/article-video/`
**Progress file:** `progress.md` — single source of truth for daily episode state

**Episode structure:**
```
ai-knowledge-YYYY-MM-DD/
  ai-knowledge-YYYY-MM-DD.md          ← article
  ai-knowledge-YYYY-MM-DD_script.md   ← voiceover script
  ai-knowledge-YYYY-MM-DD.vtt         ← corrected VTT (required before Scene Dev)
  checklist-[agent].md                ← QA checklists per agent
```

**Output:**
```
out/YYYY-MM-DD/YYYY-MM-DD.mp4
out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt
```

---

## Scale & Dimensions

```ts
const S = 3;                    // scale factor — multiply ALL px values
const W = 1280 * S;             // 3840px
const H = 720  * S;             // 2160px
const NAV_H = 50 * S;           // 150px — progress bar at top
const SUBTITLE_SAFE = 120 * S;  // 360px — subtitle safe zone at bottom
const CONTAINER_W = 640 * S;    // 1920px — content column
const COL_LEFT = (W - CONTAINER_W) / 2;  // 960px

// Content viewport:
// H - NAV_H - SUBTITLE_SAFE = 2160 - 150 - 360 = 1650px
// ContentColumn maxHeight = 1590px (H - NAV_H - 20*S - SUBTITLE_SAFE)
```

---

## Team Structure

| Role | Job |
|------|-----|
| **Director** | Read AGENTS.md + rules + progress.md first. Dispatch sub-agents. Enforce QA gate. Verify all checklists ✅ before next phase. |
| **Audio Agent** | ffmpeg normalize (-20 LUFS, Peak -2 dBFS). Mix with BG music. Director runs ffmpeg directly (sub-agents have no Bash). |
| **Transcription Agent** | Whisper VTT + cross-ref with article MD. Save corrected VTT. |
| **Visual Concept Agent** | Output `visual-spec.json` with per-VTT-cue animation decisions. Cannot start until VTT exists. |
| **Scene Dev Agent** | Write/edit Remotion TSX. Must read rules/project.md. Cannot start until QA VTT exists. |
| **QA Agent** | Checklist verification per agent. Report to Director. iMessage report. Wait "通過". |
| **Render Agent** | Only after all QA checklists ✅. |

### Per-Agent Checklist Rule

Every agent saves `ai-knowledge-YYYY-MM-DD/checklist-[agent].md` when done.
Director verifies all `[x]` before proceeding to next phase.

### QA Gate (mandatory, Director enforces)

```
Scene Dev complete
  ↓
Director IMMEDIATELY spawns QA Agent (no James signal needed)
  ↓
QA all ✅ → iMessage report → wait "通過" → Render Agent
QA has ❌ → Director assigns Fix Agent → redo QA → all ✅ then notify
```

**FORBIDDEN:** Notify James "完成了" or show preview BEFORE QA passes.

---

## ElevenLabs STS Rule

**300s hard limit.** Any audio > 290s is automatically split, STS'd, then concat'd.
All intermediate files go to `/tmp/article-video-DATE/` — cleaned up automatically after pipeline ends.
**inbox only contains original source files.** Never write intermediate files there.
This is automated in `article-video-pipeline.sh` — agents don't need to handle it manually.

---

## Invariants (never override)

- **Background:** `#000000`
- **Primary accent:** `#7cffb2` neon green
- **Secondary accent:** `#ffd166` yellow
- **Fonts:** Noto Sans TC (body), Space Mono (labels/numbers/technical)
- **Output:** 4K 3840×2160, S=3
- **No emoji** in main content cards, section badges, progress bar
- **No timestamp** (mm:ss) in progress bar
- **iMessage callouts:** macOS dark frosted-glass, top-right stacking push-down
- **CSS transitions FORBIDDEN** — all animation via `useCurrentFrame()` + `spring()` / `interpolate()`
- **Tailwind animation classes FORBIDDEN**
- **VTT-first:** Scene Dev cannot start until corrected VTT exists
- **Every VTT cue = a visual decision** — elements appear at `vtt_seconds × 30`
- **SummaryScene required** — last ~30s has dedicated SummaryScene with 3 recap cards
- **No 30s gaps** — every scene needs new visual element within 30s
- **Audio:** -20 LUFS, Peak -2 dBFS; NO denoise (anlmdn); BG music -stream_loop -1
- **Render flag:** `--gl=angle` only when ThreeCanvas is used

---

## Current Episode State

See `progress.md` for live state. Do not assume from memory — always read the file.
