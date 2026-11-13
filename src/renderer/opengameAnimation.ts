import type { ProductionAssistantPose } from './productionAssistantState';

export interface OpenGameAnimationFrame {
  src: string;
  durationMs: number;
}

export interface OpenGameAnimation {
  id: string;
  frames: readonly OpenGameAnimationFrame[];
  loop: boolean;
  /** Frame displayed while reduced motion is enabled or after a non-looping clip ends. */
  restFrame: number;
}

export interface OpenGameSpriteCanvas {
  width: number;
  height: number;
  pivot: {
    x: number;
    y: number;
  };
}

export interface OpenGameSpriteManifest {
  schemaVersion: 1;
  id: string;
  canvas: OpenGameSpriteCanvas;
  animations: Readonly<Record<ProductionAssistantPose, OpenGameAnimation>>;
}

export interface OpenGameFrameAdvance {
  frameIndex: number;
  finished: boolean;
}

const MINIMUM_FRAME_DURATION_MS = 40;

export function normalizedOpenGameFrameDuration(frame: OpenGameAnimationFrame): number {
  if (!Number.isFinite(frame.durationMs)) return MINIMUM_FRAME_DURATION_MS;
  return Math.max(MINIMUM_FRAME_DURATION_MS, Math.round(frame.durationMs));
}

export function opengameRestFrameIndex(animation: OpenGameAnimation): number {
  if (animation.frames.length === 0) return 0;
  if (!Number.isFinite(animation.restFrame)) return 0;
  return Math.min(animation.frames.length - 1, Math.max(0, Math.round(animation.restFrame)));
}

export function advanceOpenGameFrame(
  animation: OpenGameAnimation,
  currentFrameIndex: number,
): OpenGameFrameAdvance {
  if (animation.frames.length <= 1) {
    return { frameIndex: opengameRestFrameIndex(animation), finished: true };
  }

  const safeIndex = Math.min(
    animation.frames.length - 1,
    Math.max(0, Math.round(currentFrameIndex)),
  );
  const nextIndex = safeIndex + 1;
  if (nextIndex < animation.frames.length) {
    return { frameIndex: nextIndex, finished: false };
  }
  if (animation.loop) {
    return { frameIndex: 0, finished: false };
  }
  return { frameIndex: opengameRestFrameIndex(animation), finished: true };
}

export function opengameFrameAtElapsed(
  animation: OpenGameAnimation,
  elapsedMs: number,
): number {
  if (animation.frames.length <= 1 || elapsedMs <= 0 || !Number.isFinite(elapsedMs)) {
    return animation.frames.length === 0 ? 0 : 0;
  }

  const durations = animation.frames.map(normalizedOpenGameFrameDuration);
  const totalDuration = durations.reduce((total, duration) => total + duration, 0);
  if (!animation.loop && elapsedMs >= totalDuration) return opengameRestFrameIndex(animation);

  let remaining = animation.loop ? elapsedMs % totalDuration : elapsedMs;
  for (let index = 0; index < durations.length; index += 1) {
    if (remaining < durations[index]!) return index;
    remaining -= durations[index]!;
  }
  return opengameRestFrameIndex(animation);
}

export function opengameManifestSources(manifest: OpenGameSpriteManifest): string[] {
  return Array.from(new Set(
    Object.values(manifest.animations)
      .flatMap((animation) => animation.frames)
      .map((frame) => frame.src)
      .filter(Boolean),
  ));
}
