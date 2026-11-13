import opengameCarrySprite from './assets/opengame-sprite-carry.png';
import opengameCelebrateSprite from './assets/opengame-sprite-celebrate.png';
import opengameIdleSprite from './assets/opengame-sprite-idle.png';
import opengamePaintSprite from './assets/opengame-sprite-paint.png';
import opengamePlaySprite from './assets/opengame-sprite-play.png';
import opengameRepairSprite from './assets/opengame-sprite-repair.png';
import opengameSleepSprite from './assets/opengame-sprite-sleep.png';
import opengameWalkASprite from './assets/opengame-sprite-walk-a.png';
import opengameWalkBSprite from './assets/opengame-sprite-walk-b.png';
import opengameWorkSprite from './assets/opengame-sprite-work.png';
import opengameCoffeeASprite from './assets/opengame-packs/classic/frames/sprite-coffee-a.png';
import opengameCoffeeBSprite from './assets/opengame-packs/classic/frames/sprite-coffee-b.png';
import opengameInspectASprite from './assets/opengame-packs/classic/frames/sprite-inspect-a.png';
import opengameInspectBSprite from './assets/opengame-packs/classic/frames/sprite-inspect-b.png';
import opengameStretchASprite from './assets/opengame-packs/classic/frames/sprite-stretch-a.png';
import opengameStretchBSprite from './assets/opengame-packs/classic/frames/sprite-stretch-b.png';
import opengameSweepASprite from './assets/opengame-packs/classic/frames/sprite-sweep-a.png';
import opengameSweepBSprite from './assets/opengame-packs/classic/frames/sprite-sweep-b.png';
import opengameTypeASprite from './assets/opengame-packs/classic/frames/sprite-type-a.png';
import opengameTypeBSprite from './assets/opengame-packs/classic/frames/sprite-type-b.png';
import type {
  OpenGameAnimation,
  OpenGameAnimationFrame,
  OpenGameSpriteManifest,
} from './opengameAnimation';

const frame = (src: string, durationMs: number): OpenGameAnimationFrame => ({ src, durationMs });

const singleFrame = (
  id: string,
  src: string,
  durationMs = 800,
): OpenGameAnimation => ({
  id,
  frames: [frame(src, durationMs)],
  loop: true,
  restFrame: 0,
});

const alternatingFrames = (
  id: string,
  frameA: string,
  frameB: string,
  durationMs = 220,
): OpenGameAnimation => ({
  id,
  frames: [
    frame(frameA, durationMs),
    frame(frameB, durationMs),
    frame(frameA, durationMs),
    frame(frameB, durationMs + 80),
  ],
  loop: true,
  restFrame: 0,
});

/**
 * Compatibility manifest for the original OpenGame sprite set.
 *
 * New character packs can replace this object with any number of authored
 * frames per pose. Keeping animation data outside the component means a pack
 * never needs pose-specific rendering code.
 */
export const CLASSIC_OPENGAME_SPRITE_MANIFEST: OpenGameSpriteManifest = {
  schemaVersion: 1,
  id: 'classic-opengame-v1',
  canvas: {
    width: 252,
    height: 336,
    pivot: { x: 126, y: 320 },
  },
  animations: {
    idle: singleFrame('classic-idle', opengameIdleSprite),
    think: singleFrame('classic-think', opengameIdleSprite),
    wait: singleFrame('classic-wait', opengameIdleSprite),
    walk: {
      id: 'classic-walk',
      frames: [
        frame(opengameWalkASprite, 150),
        frame(opengameWalkBSprite, 150),
        frame(opengameWalkASprite, 150),
        frame(opengameWalkBSprite, 150),
      ],
      loop: true,
      restFrame: 0,
    },
    work: singleFrame('classic-work', opengameWorkSprite),
    carry: singleFrame('classic-carry', opengameCarrySprite),
    paint: singleFrame('classic-paint', opengamePaintSprite),
    sleep: singleFrame('classic-sleep', opengameSleepSprite, 1_200),
    play: singleFrame('classic-play', opengamePlaySprite),
    repair: singleFrame('classic-repair', opengameRepairSprite),
    coffee: alternatingFrames('classic-coffee', opengameCoffeeASprite, opengameCoffeeBSprite, 360),
    stretch: alternatingFrames('classic-stretch', opengameStretchASprite, opengameStretchBSprite, 340),
    type: alternatingFrames('classic-type', opengameTypeASprite, opengameTypeBSprite, 150),
    inspect: alternatingFrames('classic-inspect', opengameInspectASprite, opengameInspectBSprite, 320),
    sweep: alternatingFrames('classic-sweep', opengameSweepASprite, opengameSweepBSprite, 240),
    celebrate: singleFrame('classic-celebrate', opengameCelebrateSprite),
  },
};
