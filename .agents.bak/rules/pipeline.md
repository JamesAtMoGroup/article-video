# Article Video — Production Pipeline SOP

> 3-phase automated pipeline. VTT must exist before Scene Dev. James previews before Render.

---

## Pipeline Scripts

```
~/.claude/scripts/article-video-phase1.sh YYYY-MM-DD   # STS + Whisper
~/.claude/scripts/article-video-phase2.sh YYYY-MM-DD   # Scene Dev + QA checks
~/.claude/scripts/article-video-phase3.sh YYYY-MM-DD   # Render + Upload
```

**Phase markers** (written to `inbox/YYYY-MM-DD/`):
- `.phase1_done` -> `.phase2_done` -> `.phase3_done`

---

## Phase 1 — STS + Whisper (automated)

```
Input:  inbox/YYYY-MM-DD/*.wav (or .mp3/.m4a)
Output: public/audio/YYYY-MM-DD-processed.wav + out/YYYY-MM-DD/YYYY-MM-DD.vtt
```

1. **ElevenLabs STS** — Voice changer on ALL inbox audio (even "enhanced" files)
   - If duration <= 290s: direct STS
   - If duration > 290s: auto-split at silence midpoint, STS each half, concat
   - Voice ID: `9lHjugDhwqoxA5MhX0az`
2. **Whisper** — `whisper medium --language zh` -> VTT
3. **Post-processing by Director:**
   - `opencc s2twp` (Simplified -> Traditional Chinese)
   - Manual error correction (common Whisper mistakes: 釋窗->視窗, Clawed->Claude, GBT->GPT, etc.)

---

## Phase 2 — Scene Dev + QA (semi-automated)

```
Input:  VTT + script + skill file + reference TSX
Output: src/VideoComposition_YYYY_MM_DD.tsx + Root.tsx update + package.json update
```

### Step 1: Claude Scene Dev (`claude -p`)
Generates full Remotion TSX composition with:
- TitleScene + 2-4 content scenes + SummaryScene
- 3-5 visual metaphor animations (not text cards)
- All timing from VTT (never guessed)

### Step 2: Automated QA (all must pass)
- `npx tsc --noEmit` — zero TypeScript errors
- Font size grep — all `fontSize` >= 18*S
- Bottom positioning check — warn if near subtitle zone
- VTT sync verification — Python script validates all triggerLocalFrame values

---

## Phase 3 — Render + Upload (automated, after James preview)

```
Input:  TSX composition (James-approved)
Output: out/YYYY-MM-DD/{title}-YYYY-MM-DD.mp4
```

1. `npm run build:YYYY-MM-DD` -> mp4
2. Rename: `{title}-{date}.mp4` and `.vtt`
3. `rclone copy` to Google Drive subfolder
4. iMessage notification

---

## Scene Dev Mandatory Rules

### Rule 0a — Scene boundaries = next topic's first VTT timestamp

```
scene_N.to = Math.round(next_topic_first_sentence_vtt_seconds * 30)
```

Example: "第二件..." starts at VTT 02:01.52 -> scene1.to = Math.round(121.52 * 30) = 3646

**FORBIDDEN:** Using "last sentence of current scene finished" as scene.to (causes late switching).

### Rule 0b — Phase A->B transition must complete before Phase B first sentence

```
A_FADE_START = Phase_B_first_vtt * 30 - scene_start - 80   (80f for fade)
A_REMOVE     = Phase_B_first_vtt * 30 - scene_start
B_SHOW_AT    = A_REMOVE
First Phase B element useFadeUp = B_SHOW_AT
```

**FORBIDDEN:** B_SHOW_AT = A_REMOVE + any positive offset (causes blank screen).

### Rule 1 — triggerLocalFrame from VTT, never guessed

```
triggerLocalFrame = Math.round(vtt_seconds * 30) - scene_start_frame
```

Trigger = when speaker says the concept's first sentence.

### Rule 2 — DURATION covers until last related sentence + 90f buffer

```
DURATION = (last_topic_vtt_seconds * 30 - scene_start_frame - triggerLocalFrame) + 90
```

### Rule 3 — Step delays aligned to VTT

```
step_delay = Math.round(step_vtt_seconds * 30) - scene_start_frame - triggerLocalFrame
```

**FORBIDDEN:** Fixed small stagger (30/70/110/150) unless VTT is truly uniform.

### Rule 4 — Phase A content height estimation

If total height > CONTENT_H (1620px), use element fade-out:
```tsx
const EARLY_FADE_START = LATE_CARD_AT - 120;
const EARLY_REMOVE     = LATE_CARD_AT - 10;
const showEarly = frame < EARLY_REMOVE;
const earlyOpacity = frame > EARLY_FADE_START
  ? interpolate(frame, [EARLY_FADE_START, EARLY_REMOVE], [1, 0], clamp) : 1;
```

Include useFadeUp offset (22*S = 66px) in height estimation.

### Rule 5 — VTT sync verification table (mandatory output)

```
Animation | trigger(local) | trigger VTT | Speaker text | DURATION | Covers to VTT
```

---

## ElevenLabs STS — 300s Limit

Audio > 290s is auto-split at silence midpoint:
```
split at silence near midpoint -> STS Part A + STS Part B -> ffmpeg concat
```

All intermediate files in `/tmp/article-video-YYYY-MM-DD/` (auto-cleaned on exit).
Inbox is sacred — never write intermediate files there.

---

## Background Music

```tsx
<Audio src={staticFile("audio/course_background_music.wav")}
  volume={(f) => {
    const v = 0.10;
    const fi = interpolate(f, [0, 45], [0, v], {extrapolateRight: "clamp"});
    const fo = interpolate(f, [TOTAL_FRAMES - 150, TOTAL_FRAMES], [v, 0],
      {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
    return Math.min(fi, fo);
  }}
  loop />
```

---

## Common Whisper Errors (correct after Phase 1)

| Whisper output | Correct |
|---|---|
| 釋窗 | 視窗 |
| 程式馬 | 程式碼 |
| Clawed | Claude |
| GBT/GPD | GPT |
| 擋鍵盤 | 擋箭牌 |
| 不抱怨 | 播報員 |
| 開心對話 | 新對話 |
| 通懶 | 通覽 |
| 待勞 | 代勞 |
