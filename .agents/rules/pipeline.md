# Article Video — Production Pipeline SOP

> VTT must exist before Scene Dev. All checklists ✅ before Render. No exceptions.

---

## Sequential Execution Rule

**One episode at a time.** The watcher uses a global busy lock (`/tmp/article-video-pipeline.busy`).

- Episode starts → busy lock created → no other episode can start
- Episode succeeds → `.pipeline_done` written → busy lock removed → next episode triggers on next scan
- Episode fails → `.pipeline_failed` written → iMessage sent → busy lock removed → next episode triggers automatically
- To retry a failed episode: delete `.pipeline_failed` from its inbox folder

---

## Phase Order (strict — do not reorder)

```
━━━ Phase 1 — Parallel (independent) ━━━
  Audio Agent (Director runs ffmpeg directly — sub-agents have no Bash):
    → process audio, mix with BG music
    → save checklist-audio.md

  Script Agent:
    → verify article MD + voiceover script
    → save checklist-script.md

━━━ Phase 2 — Whisper (after processed audio) ━━━
  Transcription Agent:
    → python3 -m whisper (NOT whisper)
    → output VTT
    → save checklist-transcription.md

━━━ Phase 3 — QA VTT (after Whisper) ━━━
  Correct VTT text against script
  Common errors: 他/它, 的/得/地, number zh/en switching
  Save corrected VTT to out/YYYY-MM-DD/
  Save checklist-vtt-qa.md

━━━ Phase 4 — Scene Dev (after QA VTT) ━━━
  Visual Concept Agent → output visual-spec.json first
  Scene Dev Agent → write TSX based on visual-spec.json + VTT
  Save checklist-scene-dev.md

━━━ Phase 5 — Animation QA (after Scene Dev) ━━━
  Director spawns QA Agent AUTOMATICALLY
  QA Agent verifies every VTT cue has correct visual timing
  Outputs animation timing report
  iMessage report → wait "通過"
  Any ❌ → Fix Agent → redo QA
  Save checklist-animation-qa.md

━━━ Phase 6 — Render (after all checklists ✅) ━━━
  npx remotion render ArticleVideo-YYYY-MM-DD \
    "out/YYYY-MM-DD/YYYY-MM-DD.mp4" --codec=h264
  # Add --gl=angle ONLY if ThreeCanvas is used
```

---

## ElevenLabs STS — 300s Limit Rule

**ElevenLabs STS has a hard 300s limit.** Any audio file > 290s is automatically split.

```
if duration > 290s:
  split into Part A (first half) + Part B (second half) → saved to /tmp/article-video-DATE/
  STS Part A → /tmp/article-video-DATE/partA_sts.mp3
  STS Part B → /tmp/article-video-DATE/partB_sts.mp3
  ffmpeg concat → /tmp/article-video-DATE/merged_sts.mp3
else:
  STS directly → /tmp/article-video-DATE/filename_sts.mp3
```

**All intermediate files go to `/tmp/article-video-DATE/`.** The `trap EXIT` in pipeline.sh cleans this up automatically on completion or failure.

**inbox is sacred** — only original source files live there. Never write intermediate files to inbox.

This is handled automatically by `article-video-pipeline.sh`. Agents do NOT need to handle STS splitting manually.

---

## Audio Processing

```bash
# Target: -20 LUFS, Peak -2 dBFS
# NO anlmdn (denoise) — breaks audio quality
# BG music MUST use -stream_loop -1 (otherwise silent after 60s)

ffmpeg -i narrator.wav \
  -stream_loop -1 -i public/audio/course_bgmusic.wav \
  -filter_complex "
    [0:a]highpass=f=80[hp];
    [hp]equalizer=f=120:width_type=o:width=2:gain=2,
        equalizer=f=3000:width_type=o:width=1.5:gain=1.5[eq];
    [eq]acompressor=threshold=0.06:ratio=4:attack=5:release=100:makeup=4[comp];
    [comp]loudnorm=I=-20:LRA=5:TP=-2[loud];
    [1:a]volume=0.08[bg];
    [loud][bg]amix=inputs=2:duration=first:dropout_transition=3[out]
  " -map "[out]" -ar 44100 -ac 2 \
  public/audio/ai-knowledge-YYYY-MM-DD-processed.wav -y
```

**Reference audio target:**
- Integrated: -20 LUFS
- Peak: -2 dBFS
- RMS: -23 dB
- Crest factor: ~11

---

## Whisper Transcription

```bash
# Use python3 -m whisper (NOT whisper — PATH issue)
python3 -m whisper public/audio/ai-knowledge-YYYY-MM-DD-processed.wav \
  --model medium --language zh --output_format vtt \
  --output_dir out/YYYY-MM-DD/

# Rename output:
# ai-knowledge-YYYY-MM-DD-processed.vtt → ai-knowledge-YYYY-MM-DD.vtt
```

---

## Visual Concept Agent Spec

Output `ai-knowledge-YYYY-MM-DD/visual-spec.json`:

```json
{
  "cues": [
    {
      "vtt_seconds": 3.5,
      "frame": 105,
      "local_frame": 105,
      "sentence_type": "definition",
      "visual": {
        "element": "TokenBlocksRow",
        "animation": "spring stagger in, 3 blocks"
      }
    }
  ]
}
```

Every cue must include: `vtt_seconds`, `frame`, `local_frame`, `sentence_type`, `visual.element`, `visual.animation`.

---

## Scene Dev Rules

### Frame calculation
```
global_frame = vtt_seconds × 30
local_frame  = global_frame - scene_start_frame (from CHAPTERS/Sequence.from)
```

### Subtitle safe zone
```ts
// SUBTITLE_SAFE = 120*S = 360px
// Any element's bottom edge must be ≤ H - SUBTITLE_SAFE = 1800px
// ContentColumn maxHeight = 1590px
```

### Scroll rule
```ts
// When Phase B elements total height > 1590px:
// Add scrollUp prop to ContentColumn
// scrollUp.amount = overflowPx + 20
// scrollUp.at = trigger frame (VTT-aligned)
// Implement as spring translateY in ContentColumn
```

### Animation rules
- All animations via `useCurrentFrame()` — CSS transitions FORBIDDEN
- Write durations as `seconds * fps`
- Every VTT cue = one visual element appearing at that frame
- No scene can go 30s without a new visual element
- SummaryScene required at end of every episode

### What NOT to do
- Never start Scene Dev before QA VTT exists
- Never guess frame numbers — always derive from VTT
- Never set AnalogyBox delay ≥ scene duration
- Never render before all checklists ✅
- Never use CSS `transition:` or Tailwind animation classes

---

## QA Checklist Template

Save as `ai-knowledge-YYYY-MM-DD/checklist-[agent].md`:

```markdown
# Checklist — [Agent Name] — YYYY-MM-DD

- [x] Phase completed
- [x] Output file saved to correct path
- [x] No QA failures
- [x] Handed off to Director
```

---

## Episode Progress Tracking

After each phase, update `progress.md`:
- Mark phase ✅ or ⏳
- Note blockers
- Note VTT correction decisions

Director reads `progress.md` on startup — do not assume state from memory.
