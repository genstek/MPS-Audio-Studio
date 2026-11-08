import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { HelpTip } from './HelpTip.jsx';

// Processor editor windows (LAS-28 non-modal editors, made movable and concurrent in LAS-61/62).
// Each editor is its own non-modal <dialog> with a position and a stacking order held by the mixer,
// so several can be open at once, each stays where it was put, and the transport stays usable.
// - Drag the title bar (pointer or touch) to move a window; buttons in the bar keep working.
// - Pressing or focusing anything in a window brings it to the front.
// - The ⋮⋮ grip is a button: arrow keys move the window 16 px (Shift: 64 px), Home puts it back.
// - A window always stays inside the visible workspace; after a resize it is moved back in.
// - Escape closes the window that has focus (or the front window when focus is on the page);
//   focus returns to the button that opened it. Closing a window never changes processing.
export const WINDOW_MARGIN = 8;
// A window may sit low on the screen as long as this much of it (title bar and the first controls)
// stays visible; its height is limited to the space below its top and the rest scrolls inside it.
export const MIN_VISIBLE_HEIGHT = 160;
const KEY_STEP = 16;

// The position that keeps a window inside the viewport: fully across, and from its top down to at
// least MIN_VISIBLE_HEIGHT of its height.
export function clampPosition({ x, y }, { width, height }, viewport = { width: window.innerWidth, height: window.innerHeight }) {
  const maxX = Math.max(WINDOW_MARGIN, viewport.width - width - WINDOW_MARGIN);
  const maxY = Math.max(WINDOW_MARGIN, viewport.height - Math.min(height, MIN_VISIBLE_HEIGHT) - WINDOW_MARGIN);
  return { x: Math.round(Math.min(maxX, Math.max(WINDOW_MARGIN, x))), y: Math.round(Math.min(maxY, Math.max(WINDOW_MARGIN, y))) };
}

export function EditorDialog({ title, open, onClose, children, headerExtra = null, toolbar = null, position = null, z = 0, active = false, focusRequest = 0, onMove = () => {}, onFront = () => {}, onResetPosition = () => {} }) {
  const dialog = useRef(null);
  const opener = useRef(null);
  const drag = useRef(null);

  const size = () => {
    const box = dialog.current.getBoundingClientRect();
    return { width: box.width, height: box.height };
  };
  const moveTo = useCallback(next => onMove(clampPosition(next, size())), [onMove]);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) {
      opener.current = document.activeElement;
      element.show();
      element.querySelector('.dialog-close').focus();
    } else if (!open && element.open) {
      element.close();
      if (opener.current?.isConnected && !opener.current.closest('dialog:not([open])')) opener.current.focus();
    }
  }, [open]);

  // Opening an editor that is already open focuses it instead of adding another one.
  useEffect(() => {
    if (open && focusRequest) dialog.current.querySelector('.dialog-close').focus();
  }, [open, focusRequest]);

  // Keep the window inside the viewport when it opens, when its content changes size and when the
  // browser window is resized or rotated.
  useLayoutEffect(() => {
    if (!open || !position) return undefined;
    const keepInside = () => {
      const next = clampPosition(position, size());
      if (next.x !== position.x || next.y !== position.y) onMove(next);
    };
    keepInside();
    window.addEventListener('resize', keepInside);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(keepInside) : null;
    observer?.observe(dialog.current);
    return () => {
      window.removeEventListener('resize', keepInside);
      observer?.disconnect();
    };
  }, [open, position, onMove]);

  function keyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  }

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button, input, select, a, label, [role="radio"]')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
    onFront();
  }
  function dragMove(event) {
    if (!drag.current) return;
    moveTo({ x: event.clientX - drag.current.dx, y: event.clientY - drag.current.dy });
  }
  const endDrag = () => { drag.current = null; };

  function gripKey(event) {
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (event.key === 'Home') {
      event.preventDefault();
      onResetPosition();
      return;
    }
    if (!delta) return;
    event.preventDefault();
    moveTo({ x: position.x + delta[0], y: position.y + delta[1] });
  }

  const placed = position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto', zIndex: 20 + z, maxHeight: `calc(100dvh - ${position.y + WINDOW_MARGIN}px)` } : undefined;
  return (
    <dialog ref={dialog} className={`editor-dialog${active ? ' is-active' : ''}`} aria-label={title} style={placed}
      onKeyDown={keyDown} onPointerDownCapture={onFront} onFocusCapture={onFront}>
      <div className="account-heading editor-titlebar" onPointerDown={startDrag} onPointerMove={dragMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <button type="button" className="window-grip" aria-label={`Move ${title} window`} title="Drag the title bar, or use the arrow keys here (Home resets)" onKeyDown={gripKey}>⋮⋮</button>
        <HelpTip id="mixer.window" className="inline" />
        <h2>{title}</h2>
        <div className="editor-heading-tools">
          {headerExtra}
          <button className="dialog-close" onClick={onClose} aria-label={`Close ${title}`}>×</button>
        </div>
      </div>
      {open && toolbar}
      {open && children}
    </dialog>
  );
}
