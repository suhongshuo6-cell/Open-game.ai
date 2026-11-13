import {
  Box,
  Check,
  Code2,
  FileText,
  Flag,
  Image,
  LayoutTemplate,
  Map,
} from 'lucide-react';
import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  PIPELINE_STAGES,
  type AgentEvent,
  type PipelineStage,
  type ProjectStatus,
} from '../../shared/contracts';
import { EVENT_KIND_LABELS, PROJECT_STATUS_LABELS, stageProgress } from '../ui';

interface ProductionConsoleProps {
  stage: PipelineStage;
  status: ProjectStatus;
  events: readonly AgentEvent[];
}

const ICONS = {
  brief: FileText,
  scaffold: LayoutTemplate,
  gdd: Box,
  assets: Image,
  world: Map,
  code: Code2,
  verify: Check,
  complete: Flag,
} as const;

const RING_RADIUS = 38; // percent of the square stage

export interface ConsoleTelemetry {
  elapsedMs: number;
  events: number;
  tools: number;
  files: number;
}

/** Summarises the current Codex turn: everything after the latest user prompt. */
export function consoleTelemetry(events: readonly AgentEvent[], now: number): ConsoleTelemetry {
  let start = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]!.kind === 'user') {
      start = index;
      break;
    }
  }
  const turn = start >= 0 ? events.slice(start) : events;
  const first = turn[0] ? Date.parse(turn[0].timestamp) : now;
  const last = turn.at(-1) ? Date.parse(turn.at(-1)!.timestamp) : now;
  return {
    elapsedMs: Math.max(0, (Number.isFinite(first) ? Math.max(last, now) - first : 0)),
    events: turn.length,
    tools: turn.filter((event) => event.kind === 'tool').length,
    files: new Set(turn.filter((event) => event.kind === 'file').map((event) => event.title)).size,
  };
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ProductionConsole({ stage, status, events }: ProductionConsoleProps) {
  const running = status === 'running';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const progress = stageProgress(stage);
  const complete = stage === 'complete';
  const percent = complete ? 100 : Math.round(((progress + 0.5) / PIPELINE_STAGES.length) * 100);
  const current = PIPELINE_STAGES[progress] ?? PIPELINE_STAGES[0]!;
  const telemetry = useMemo(
    () => consoleTelemetry(events, running ? now : Date.parse(events.at(-1)?.timestamp ?? '') || now),
    [events, now, running],
  );
  const latest = [...events].reverse().find((event) => event.kind !== 'user');
  const tail = events.slice(-6);
  const circumference = 2 * Math.PI * RING_RADIUS;

  return (
    <div
      className={`production-console status-${status}${running ? ' is-running' : ''}`}
      role="img"
      aria-label={`制作控制台：${current.label}，${PROJECT_STATUS_LABELS[status]}`}
    >
      <div className="console-telemetry" aria-hidden="true">
        <div><small>elapsed</small><strong>{formatElapsed(telemetry.elapsedMs)}</strong></div>
        <div><small>events</small><strong>{telemetry.events}</strong></div>
        <div><small>tool calls</small><strong>{telemetry.tools}</strong></div>
        <div><small>files</small><strong>{telemetry.files}</strong></div>
      </div>

      <div className="console-stage" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="console-rings">
          <defs>
            <linearGradient id="console-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--nx-violet)" />
              <stop offset="100%" stopColor="var(--nx-cyan)" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" className="console-ring-outer" />
          <circle cx="50" cy="50" r={RING_RADIUS} className="console-ring-track" />
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            className="console-ring-progress"
            strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
            transform="rotate(-90 50 50)"
          />
          <circle cx="50" cy="50" r="27" className="console-ring-inner" />
        </svg>
        {running ? <i className="console-sweep" /> : null}

        {PIPELINE_STAGES.map((item, index) => {
          const Icon = ICONS[item.id];
          const angle = (index / PIPELINE_STAGES.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * RING_RADIUS;
          const y = 50 + Math.sin(angle) * RING_RADIUS;
          const done = index < progress || complete;
          const active = index === progress && !complete;
          return (
            <span
              key={item.id}
              className={`console-node${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                '--lx': Math.cos(angle).toFixed(3),
                '--ly': Math.sin(angle).toFixed(3),
              } as CSSProperties}
            >
              <Icon size={13} strokeWidth={2} />
              <em>{item.label}</em>
            </span>
          );
        })}

        <div className="console-core">
          <span className="console-core-glow" />
          <small>{complete ? 'shipped' : running ? 'agent at work' : 'standby'}</small>
          <strong>{percent}<sup>%</sup></strong>
          <span className="console-core-stage">{current.short} · {current.label}</span>
        </div>
      </div>

      <div className="console-now">
        <header>
          <span className={`console-kind kind-${latest?.kind ?? 'lifecycle'}`}>
            {latest ? EVENT_KIND_LABELS[latest.kind] : '状态'}
          </span>
          <strong>{latest?.title ?? (running ? '正在连接 Codex 线程…' : '等待下一条制作要求')}</strong>
          {running ? <i className="console-caret" /> : null}
        </header>
        <p>{latest?.message.split('\n')[0] ?? '发送要求后，这里会实时显示 Agent 正在做的事。'}</p>
      </div>

      <ol className="console-log" aria-hidden="true">
        {tail.map((event) => (
          <li key={event.id} className={`kind-${event.kind}`}>
            <time>
              {new Date(event.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </time>
            <span>{event.kind}</span>
            <code>{event.title}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}
