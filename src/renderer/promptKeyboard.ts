/** Enter submits; Shift+Enter inserts a line break. Never submit during IME composition. */
export function shouldSubmitPromptKey(event: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
}): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229;
}
