import cozyWorkshopGif from '../assets/opengame-transition-scenes/opengame-cozy-workshop.gif';
import crystalLabGif from '../assets/opengame-transition-scenes/opengame-crystal-lab.gif';
import forestCampGif from '../assets/opengame-transition-scenes/opengame-forest-camp.gif';
import potionGardenGif from '../assets/opengame-transition-scenes/opengame-potion-garden.gif';
import rooftopStudioGif from '../assets/opengame-transition-scenes/opengame-rooftop-studio.gif';
import seasideArcadeGif from '../assets/opengame-transition-scenes/opengame-seaside-arcade.gif';
import skyDockGif from '../assets/opengame-transition-scenes/opengame-sky-dock.gif';
import snowCabinGif from '../assets/opengame-transition-scenes/opengame-snow-cabin.gif';
import starObservatoryGif from '../assets/opengame-transition-scenes/opengame-star-observatory.gif';

export const OPENGAME_TRANSITION_SCENES = [
  cozyWorkshopGif,
  crystalLabGif,
  forestCampGif,
  skyDockGif,
  seasideArcadeGif,
  snowCabinGif,
  starObservatoryGif,
  potionGardenGif,
  rooftopStudioGif,
] as const;

export const OPENGAME_TRANSITION_SCENE_COUNT = OPENGAME_TRANSITION_SCENES.length;

export function opengameTransitionSceneIndex(runId: number): number {
  if (!Number.isFinite(runId) || runId <= 1) return 0;
  return (Math.floor(runId) - 1) % OPENGAME_TRANSITION_SCENE_COUNT;
}

export function opengameTransitionSceneForRun(runId: number): string {
  return OPENGAME_TRANSITION_SCENES[opengameTransitionSceneIndex(runId)];
}
