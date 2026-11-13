import {
  CornerDownLeft,
  FolderOpen,
  Gamepad2,
  House,
  KeyRound,
  Moon,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { ProjectRecord } from '../../shared/contracts';
import { formatRelative, PROJECT_STATUS_LABELS } from '../ui';

export interface CommandItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  projects: readonly ProjectRecord[];
  theme: 'dark' | 'light';
  onClose: () => void;
  onHome: () => void;
  onCreate: () => void;
  onOpenProject: (project: ProjectRecord) => void;
  onToggleTheme: () => void;
  onOpenSettings: (section?: 'account' | 'environment' | 'media') => void;
  onRevealProject?: () => void;
}

/** Scores a fuzzy subsequence match; higher is better, -1 means no match. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct >= 0) return 1000 - direct;
  let score = 0;
  let cursor = 0;
  let streak = 0;
  for (const char of q) {
    const found = t.indexOf(char, cursor);
    if (found < 0) return -1;
    streak = found === cursor ? streak + 1 : 0;
    score += 10 + streak * 5 - (found - cursor);
    cursor = found + 1;
  }
  return score;
}

export function CommandPalette({
  open,
  projects,
  theme,
  onClose,
  onHome,
  onCreate,
  onOpenProject,
  onToggleTheme,
  onOpenSettings,
  onRevealProject,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      { id: 'create', group: '操作', label: '新建游戏', hint: '从一句创意开始', keywords: 'new create game xinjian', icon: Plus, run: onCreate },
      { id: 'home', group: '操作', label: '回到首页', keywords: 'home dashboard shouye', icon: House, run: onHome },
      {
        id: 'theme',
        group: '操作',
        label: theme === 'dark' ? '切换到浅色外观' : '切换到深色外观',
        keywords: 'theme dark light appearance zhuti',
        icon: theme === 'dark' ? Sun : Moon,
        run: onToggleTheme,
      },
    ];
    if (onRevealProject) {
      items.push({ id: 'reveal', group: '操作', label: '在 Finder 中显示当前项目', keywords: 'finder reveal folder', icon: FolderOpen, run: onRevealProject });
    }
    items.push(
      { id: 'settings-account', group: '设置', label: 'Codex 账户与模型', keywords: 'settings account login codex', icon: KeyRound, run: () => onOpenSettings('account') },
      { id: 'settings-media', group: '设置', label: '媒体 API 与素材路由', keywords: 'settings media image audio api', icon: SlidersHorizontal, run: () => onOpenSettings('media') },
      { id: 'settings-env', group: '设置', label: '运行环境 · Node / Codex / Godot', keywords: 'settings environment godot node', icon: Wrench, run: () => onOpenSettings('environment') },
      { id: 'settings', group: '设置', label: '打开全部设置', keywords: 'settings preferences', icon: Settings, run: () => onOpenSettings() },
    );
    for (const project of projects) {
      items.push({
        id: `project-${project.id}`,
        group: '游戏',
        label: project.name,
        hint: `${project.engine === 'godot' ? 'Godot 4' : 'Web'} · ${PROJECT_STATUS_LABELS[project.status]} · ${formatRelative(project.updatedAt)}`,
        keywords: `${project.idea} ${project.root}`,
        icon: Gamepad2,
        run: () => onOpenProject(project),
      });
    }
    return items;
  }, [onCreate, onHome, onOpenProject, onOpenSettings, onRevealProject, onToggleTheme, projects, theme]);

  const results = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((item) => {
        const labelScore = fuzzyScore(query, item.label);
        return {
          item,
          score: Math.max(
            labelScore < 0 ? -1 : labelScore + 50,
            fuzzyScore(query, `${item.keywords ?? ''} ${item.hint ?? ''}`),
          ),
        };
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  function choose(item: CommandItem | undefined) {
    if (!item) return;
    onClose();
    item.run();
  }

  let lastGroup = '';

  return (
    <div className="command-palette-layer" role="presentation" onMouseDown={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <label className="command-palette-search">
          <Search size={17} strokeWidth={1.8} />
          <input
            ref={inputRef}
            value={query}
            placeholder="搜索游戏、操作或设置…"
            aria-label="搜索命令"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={results[cursor] ? `command-${results[cursor]!.id}` : undefined}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCursor((value) => Math.min(results.length - 1, value + 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setCursor((value) => Math.max(0, value - 1));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                choose(results[cursor]);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              }
            }}
          />
          <kbd>esc</kbd>
        </label>
        <div className="command-palette-list" id="command-palette-list" role="listbox" ref={listRef}>
          {results.length === 0 ? (
            <div className="command-palette-empty">没有匹配「{query}」的结果</div>
          ) : results.map((item, index) => {
            const heading = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {heading ? <div className="command-palette-group">{heading}</div> : null}
                <button
                  id={`command-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
                  data-index={index}
                  className={index === cursor ? 'is-active' : ''}
                  onMouseMove={() => setCursor(index)}
                  onClick={() => choose(item)}
                >
                  <span className="command-palette-icon"><Icon size={15} strokeWidth={1.8} /></span>
                  <span className="command-palette-label">{item.label}</span>
                  {item.hint ? <small>{item.hint}</small> : null}
                  {index === cursor ? <CornerDownLeft className="command-palette-enter" size={13} /> : null}
                </button>
              </div>
            );
          })}
        </div>
        <footer className="command-palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>↵</kbd> 执行</span>
          <span className="command-palette-brand">open-game://command</span>
        </footer>
      </div>
    </div>
  );
}
