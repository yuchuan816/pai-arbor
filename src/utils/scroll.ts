export const TOP_THRESHOLD = 80;

export const BOTTOM_THRESHOLD = 80;

export function isAtBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
}
