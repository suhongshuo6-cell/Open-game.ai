import { Check, MonitorPlay } from 'lucide-react';
import React, { type KeyboardEvent } from 'react';

import type {
  OpenGamePackId,
  OpenGameSceneId,
} from '../../shared/contracts';
import collaborationScene from '../assets/opengame-packs/collaboration/scene.png';
import {
  OPENGAME_PACK_OPTIONS,
  opengamePackGridColumnCount,
} from './OpenGamePackPicker';

export interface OpenGameSceneOption<Id extends string = string> {
  id: Id;
  eyebrow: string;
  name: string;
  description: string;
  image: string;
  badges: readonly string[];
  animated: boolean;
}

export const OPENGAME_SOLO_SCENE_OPTIONS: readonly OpenGameSceneOption<OpenGamePackId>[] =
  OPENGAME_PACK_OPTIONS.map((option) => ({
    id: option.id,
    eyebrow: option.eyebrow,
    name: option.name,
    description: option.sceneDescription,
    image: option.sceneImage,
    badges: ['单人工作室', '角色独立选择'],
    animated: false,
  }));

export const OPENGAME_SCENE_OPTIONS: readonly OpenGameSceneOption<OpenGameSceneId>[] = [
  {
    id: 'collaboration',
    eyebrow: 'COLLABORATION WORKSHOP',
    name: '协作工坊',
    description: '伙伴会按照岗位在策划、美术、工程与测试工位之间协作。',
    image: collaborationScene,
    badges: ['多人场景', '按编队渲染'],
    animated: false,
  },
] as const satisfies readonly OpenGameSceneOption<OpenGameSceneId>[];

interface PickerShellProps<Id extends string> {
  value: Id | null;
  options: readonly OpenGameSceneOption<Id>[];
  variant: 'solo' | 'multiplayer';
  disabled: boolean;
  busy: boolean;
  onChange: (sceneId: Id) => void;
}

interface OpenGameSoloScenePickerProps {
  value: OpenGamePackId;
  disabled?: boolean;
  busy?: boolean;
  onChange: (sceneId: OpenGamePackId) => void;
}

export function OpenGameSoloScenePicker({
  value,
  disabled = false,
  busy = false,
  onChange,
}: OpenGameSoloScenePickerProps) {
  return (
    <OpenGameScenePickerShell
      value={value}
      options={OPENGAME_SOLO_SCENE_OPTIONS}
      variant="solo"
      disabled={disabled}
      busy={busy}
      onChange={onChange}
    />
  );
}

interface OpenGameScenePickerProps {
  value: OpenGameSceneId | null;
  disabled?: boolean;
  busy?: boolean;
  onChange: (sceneId: OpenGameSceneId) => void;
}

export function OpenGameScenePicker({
  value,
  disabled = false,
  busy = false,
  onChange,
}: OpenGameScenePickerProps) {
  return (
    <OpenGameScenePickerShell
      value={value}
      options={OPENGAME_SCENE_OPTIONS}
      variant="multiplayer"
      disabled={disabled}
      busy={busy}
      onChange={onChange}
    />
  );
}

function OpenGameScenePickerShell<Id extends string>({
  value,
  options,
  variant,
  disabled,
  busy,
  onChange,
}: PickerShellProps<Id>) {
  function selectAt(index: number) {
    const option = options[index];
    if (option) onChange(option.id);
  }

  function handleArrowKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const container = event.currentTarget.parentElement;
    const columnCount = opengamePackGridColumnCount(container);
    let nextIndex = index;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = options.length - 1;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + options.length) % options.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % options.length;
    if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - columnCount);
    if (event.key === 'ArrowDown') nextIndex = Math.min(options.length - 1, index + columnCount);
    const nextButton = container?.querySelector<HTMLButtonElement>(
      `button[data-scene-index="${nextIndex}"]`,
    );
    nextButton?.focus();
    selectAt(nextIndex);
  }

  const solo = variant === 'solo';

  return (
    <section
      className={`opengame-scene-picker variant-${variant}`}
      data-scene-kind={variant}
      aria-label={solo ? 'Open game.ai 单人工作室' : 'Open game.ai 多人运行背景'}
      aria-busy={busy}
    >
      <header className="opengame-scene-heading">
        <span className="opengame-scene-heading-icon" aria-hidden="true"><MonitorPlay size={18} /></span>
        <div>
          <small>{solo ? '02 / SOLO WORKSPACE' : 'MULTIPLAYER STAGE'}</small>
          <strong>{solo ? '再选择一个单人工作室' : '最后选择多人工作的舞台'}</strong>
          <p>{solo
            ? '场景与角色互相独立；任何角色都可以进入任意一个工作室。'
            : '选择这里的任一舞台后，运行预览才会切换为多人模式。'}</p>
        </div>
      </header>

      <div
        className="opengame-scene-grid"
        role="radiogroup"
        aria-label={solo ? '选择单人工作室' : '选择多人运行背景'}
      >
        {options.map((option, index) => {
          const selected = option.id === value;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${option.name}：${option.description}；${option.badges.join('，')}`}
              className={`opengame-pack-card opengame-scene-card${selected ? ' is-selected' : ''}`}
              data-scene-id={option.id}
              data-scene-index={index}
              data-scene-kind={variant}
              data-motion={option.animated ? 'animated' : 'static'}
              disabled={disabled || busy}
              tabIndex={selected || (value === null && index === 0) ? 0 : -1}
              key={option.id}
              onKeyDown={(event) => handleArrowKey(event, index)}
              onClick={() => onChange(option.id)}
            >
              <span className="opengame-pack-preview opengame-scene-preview" aria-hidden="true">
                <img
                  className="opengame-pack-scene-image"
                  src={option.image}
                  alt=""
                  draggable={false}
                />
                <span className="opengame-scene-live-badge">
                  <i /> {solo ? 'SOLO MAP' : option.animated ? 'LIVE LOOP' : 'CREW MAP'}
                </span>
              </span>
              <span className="opengame-pack-card-copy opengame-scene-card-copy">
                <small>{option.eyebrow}</small>
                <strong>{option.name}</strong>
                <span>{option.description}</span>
                <span className="opengame-scene-card-meta" aria-hidden="true">
                  {option.badges.map((badge) => <em key={badge}>{badge}</em>)}
                </span>
              </span>
              <span className="opengame-pack-check" aria-hidden="true"><Check size={13} /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
