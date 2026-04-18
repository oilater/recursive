const ACTIVE_CLASS = "highlighted-line";
const CALLER_CLASS = "highlighted-caller";
const CALLER_BADGE_CLASS = "caller-badge";
const CALLER_BADGE_LABEL = "caller";

function findLineEl(root: Element, line: number | undefined): Element | null {
  return line === undefined ? null : root.querySelector(`[data-line="${line}"]`);
}

export function hasActiveHighlight(root: Element, line: number | undefined): boolean {
  if (line === undefined) return false;
  return !!root.querySelector(`[data-line="${line}"].${ACTIVE_CLASS}`);
}

export function hasCallerHighlight(root: Element, line: number | undefined): boolean {
  if (line === undefined) return false;
  return !!root.querySelector(`[data-line="${line}"].${CALLER_CLASS}`);
}

export function syncCallerHighlight(
  root: Element,
  prev: number | undefined,
  next: number | undefined,
): void {
  if (prev === next) return;
  if (prev !== undefined) {
    const oldEl = findLineEl(root, prev);
    oldEl?.classList.remove(CALLER_CLASS);
    oldEl?.querySelector(`.${CALLER_BADGE_CLASS}`)?.remove();
  }
  if (next !== undefined) {
    const nextEl = findLineEl(root, next);
    if (!nextEl) return;
    nextEl.classList.add(CALLER_CLASS);
    const badge = document.createElement("span");
    badge.className = CALLER_BADGE_CLASS;
    badge.textContent = CALLER_BADGE_LABEL;
    nextEl.appendChild(badge);
  }
}

export function syncActiveHighlight(
  root: Element,
  prev: number | undefined,
  next: number | undefined,
): void {
  if (prev === next) return;
  if (prev !== undefined) findLineEl(root, prev)?.classList.remove(ACTIVE_CLASS);
  if (next !== undefined) {
    const nextEl = findLineEl(root, next);
    if (!nextEl) return;
    nextEl.classList.add(ACTIVE_CLASS);
    nextEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}
