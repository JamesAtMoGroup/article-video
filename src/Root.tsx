import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import { AUDIO_CONFIG } from "./audioConfig";
import React from "react";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ArticleVideo"
      component={VideoComposition}
      durationInFrames={AUDIO_CONFIG.totalFrames}
      fps={AUDIO_CONFIG.fps}
      width={1280}
      height={720}
    />
  );
};
