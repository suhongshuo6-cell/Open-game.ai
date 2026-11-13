import React from 'react';

export type LaunchTransitionPhase = 'running' | 'leaving';

interface LaunchTransitionProps {
  phase: LaunchTransitionPhase;
}

const BOOT_LINES = [
  'resolve workspace',
  'import references',
  'advise engine',
  'spawn planner',
] as const;

export function LaunchTransition({ phase }: LaunchTransitionProps) {
  return (
    <div
      className={`launch-transition is-${phase}`}
      role="status"
      aria-live="polite"
      aria-label="正在进入游戏制作工作台"
    >
      <div className="launch-transition-card">
        <div className="launch-transition-orb" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="launch-transition-copy">
          <strong>正在建立新游戏</strong>
          <span>把创意编译进制作工作台</span>
        </div>
        <ol className="launch-transition-log" aria-hidden="true">
          {BOOT_LINES.map((line, index) => (
            <li key={line} style={{ animationDelay: `${180 + index * 260}ms` }}>
              <span>›</span> {line}
              <em>ok</em>
            </li>
          ))}
        </ol>
        <div className="launch-transition-track" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
