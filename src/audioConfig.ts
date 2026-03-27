import { staticFile } from "remotion";

// Audio-driven scene timing (30fps)
// Durations = TTS length + 10 frame buffer
export const AUDIO_CONFIG = {
  fps: 30,
  scenes: [
    {
      id: "title",
      audioSrc: staticFile("audio/scene1.mp3"),
      durationInFrames: 171, // 5.37s × 30 + 10
      startFrame: 0,
    },
    {
      id: "copilot",
      audioSrc: staticFile("audio/scene2.mp3"),
      durationInFrames: 266, // 8.51s × 30 + 10
      startFrame: 171,
    },
    {
      id: "mcp",
      audioSrc: staticFile("audio/scene3.mp3"),
      durationInFrames: 268, // 8.58s × 30 + 10
      startFrame: 437,
    },
    {
      id: "work",
      audioSrc: staticFile("audio/scene4.mp3"),
      durationInFrames: 306, // 9.86s × 30 + 10
      startFrame: 705,
    },
  ],
  totalFrames: 1011,
  bgMusic: {
    src: staticFile("audio/bgmusic.mp3"),
    volume: 0.06,
  },
};
