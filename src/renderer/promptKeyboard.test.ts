import { describe, expect, it } from 'vitest';
import { shouldSubmitPromptKey } from './promptKeyboard';

describe('prompt keyboard', () => {
  it('submits on Enter and keeps Shift+Enter for a newline', () => {
    const enter = { key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 };
    expect(shouldSubmitPromptKey(enter)).toBe(true);
    expect(shouldSubmitPromptKey({ ...enter, shiftKey: true })).toBe(false);
    expect(shouldSubmitPromptKey({ ...enter, key: 'a' })).toBe(false);
  });

  it('does not submit while confirming Chinese IME text', () => {
    const enter = { key: 'Enter', shiftKey: false, isComposing: true, keyCode: 13 };
    expect(shouldSubmitPromptKey(enter)).toBe(false);
    expect(shouldSubmitPromptKey({ ...enter, isComposing: false, keyCode: 229 })).toBe(false);
  });
});
