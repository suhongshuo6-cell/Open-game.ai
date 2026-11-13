import React, { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import type { ProductionAssistantPose } from '../productionAssistantState';
import {
  advanceOpenGameFrame,
  opengameManifestSources,
  opengameRestFrameIndex,
  normalizedOpenGameFrameDuration,
  type OpenGameSpriteManifest,
} from '../opengameAnimation';

interface OpenGameAnimatedSpriteProps {
  pose: ProductionAssistantPose;
  manifest: OpenGameSpriteManifest;
  playbackKey?: string;
  mini?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
}

const preloadedSources = new Set<string>();

export function OpenGameAnimatedSprite({
  pose,
  manifest,
  playbackKey = pose,
  mini = false,
  paused = false,
  reducedMotion = false,
}: OpenGameAnimatedSpriteProps) {
  const animation = manifest.animations[pose];
  const [frameIndex, setFrameIndex] = useState(() => (
    reducedMotion ? opengameRestFrameIndex(animation) : 0
  ));
  const [finished, setFinished] = useState(false);
  const safeFrameIndex = Math.min(Math.max(0, frameIndex), Math.max(0, animation.frames.length - 1));
  const pivotStyle = useMemo(() => ({
    '--opengame-pivot-x': `${(manifest.canvas.pivot.x / manifest.canvas.width) * 100}%`,
    '--opengame-pivot-y': `${(manifest.canvas.pivot.y / manifest.canvas.height) * 100}%`,
  } as CSSProperties), [manifest.canvas]);

  useEffect(() => {
    if (typeof Image === 'undefined') return;
    for (const src of opengameManifestSources(manifest)) {
      if (preloadedSources.has(src)) continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      preloadedSources.add(src);
    }
  }, [manifest]);

  useEffect(() => {
    setFrameIndex(reducedMotion ? opengameRestFrameIndex(animation) : 0);
    setFinished(false);
  }, [animation, manifest.id, playbackKey, reducedMotion]);

  useEffect(() => {
    if (paused || reducedMotion || finished || animation.frames.length <= 1) return undefined;
    const activeFrame = animation.frames[safeFrameIndex];
    if (!activeFrame) return undefined;

    const timer = window.setTimeout(() => {
      const next = advanceOpenGameFrame(animation, safeFrameIndex);
      setFrameIndex(next.frameIndex);
      setFinished(next.finished);
    }, normalizedOpenGameFrameDuration(activeFrame));
    return () => window.clearTimeout(timer);
  }, [animation, finished, paused, reducedMotion, safeFrameIndex]);

  return (
    <span
      className={`opengame-pixel-sprite${mini ? ' is-mini' : ''}`}
      data-manifest={manifest.id}
      data-pose={pose}
      data-frame-index={safeFrameIndex}
      data-frame-count={animation.frames.length}
      style={pivotStyle}
      role="presentation"
    >
      {animation.frames.map((frameItem, index) => (
        <img
          key={`${animation.id}:${index}:${frameItem.src}`}
          className="opengame-sprite-frame"
          data-active={index === safeFrameIndex ? 'true' : 'false'}
          src={frameItem.src}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
