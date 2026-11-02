import React, { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HELP, HELP_SECTIONS, helpAnchor } from './help-content.js';

// Contextual help (LAS-70): an ⓘ button next to a control. Hovering it for 3 seconds opens a small
// non-modal popover (leaving earlier cancels); a click, tap, Enter or Space opens it at once. The
// popover names the function, explains it in a sentence or two and links to the detailed help in the
// in-app Help view. It is a focusable dialog, not a native title tooltip, because it has a link.
// - The pointer can move from the icon onto the popover; leaving both closes it after a short grace.
// - Escape closes it and returns focus to the icon; a click outside closes it. Nothing else changes.
// - Only one popover is open at a time; timers are cancelled when the icon goes away.
// - The icon is its own button, never part of the control: using it does not press, move or toggle
//   the control next to it.
export const HOVER_DELAY_MS = 3000;
const LEAVE_GRACE_MS = 250;

// One open popover in the whole page, and the Help view's open/anchor state.
const store = (() => {
  let state = { open: null, view: null };
  const listeners = new Set();
  const set = next => { state = { ...state, ...next }; listeners.forEach(l => l()); };
  return { subscribe: l => { listeners.add(l); return () => listeners.delete(l); }, get: () => state, set };
})();
const useHelpState = () => useSyncExternalStore(store.subscribe, store.get);
export const openHelpView = (id = null, returnFocus = null) => store.set({ open: null, view: { id, returnFocus } });

export function HelpTip({ id, className = '' }) {
  const entry = HELP[id];
  const state = useHelpState();
  const open = state.open === id;
  const popoverId = useId();
  const icon = useRef(null);
  const popover = useRef(null);
  const hover = useRef(null);
  const leave = useRef(null);
  const [place, setPlace] = useState(null);
  const clear = () => { clearTimeout(hover.current); clearTimeout(leave.current); hover.current = null; leave.current = null; };
  useEffect(() => clear, []);
  useEffect(() => { if (!open) clear(); }, [open]);

  // Placement inside the viewport: below the icon, or above when there is no room; never off-screen.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const position = () => {
      const anchor = icon.current?.getBoundingClientRect();
      const box = popover.current?.getBoundingClientRect();
      if (!anchor || !box) return;
      const margin = 8;
      const below = anchor.bottom + 6;
      const top = below + box.height + margin <= window.innerHeight ? below : Math.max(margin, anchor.top - 6 - box.height);
      const left = Math.min(Math.max(margin, anchor.left + anchor.width / 2 - box.width / 2), window.innerWidth - box.width - margin);
      setPlace({ top: Math.round(top), left: Math.round(Math.max(margin, left)) });
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);

  // Escape and clicks outside close it.
  useEffect(() => {
    if (!open) return undefined;
    const key = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      const inside = popover.current?.contains(document.activeElement) || document.activeElement === icon.current;
      store.set({ open: null });
      if (inside) icon.current?.focus();
    };
    const outside = event => {
      if (!popover.current?.contains(event.target) && !icon.current?.contains(event.target)) store.set({ open: null });
    };
    document.addEventListener('keydown', key, true);
    document.addEventListener('pointerdown', outside, true);
    return () => { document.removeEventListener('keydown', key, true); document.removeEventListener('pointerdown', outside, true); };
  }, [open]);

  if (!entry) return null;
  const show = () => { clear(); store.set({ open: id }); };
  const startHover = () => {
    clearTimeout(leave.current);
    if (open || hover.current) return;
    hover.current = setTimeout(() => { hover.current = null; store.set({ open: id }); }, HOVER_DELAY_MS);
  };
  const endHover = () => {
    clearTimeout(hover.current);
    hover.current = null;
    if (open) leave.current = setTimeout(() => { if (store.get().open === id) store.set({ open: null }); }, LEAVE_GRACE_MS);
  };
  return (
    <>
      <button ref={icon} type="button" className={`help-tip ${className}`} aria-label={`Help for ${entry.name}`} aria-expanded={open} aria-controls={open ? popoverId : undefined}
        onPointerEnter={startHover} onPointerLeave={endHover}
        onClick={event => { event.preventDefault(); event.stopPropagation(); if (open) store.set({ open: null }); else show(); }}>i</button>
      {open && (
        <div ref={popover} id={popoverId} className="help-popover" role="dialog" aria-modal="false" aria-labelledby={`${popoverId}-title`}
          style={place ? { top: place.top, left: place.left } : { visibility: 'hidden', top: 0, left: 0 }}
          onPointerEnter={() => clearTimeout(leave.current)} onPointerLeave={endHover}>
          <strong id={`${popoverId}-title`}>{entry.name}</strong>
          <p>{entry.short}</p>
          <a href={`#${helpAnchor(id)}`} onClick={event => { event.preventDefault(); openHelpView(id, icon.current); }}>More about {entry.name} →</a>
        </div>
      )}
    </>
  );
}

// A control with its help icon placed beside it (no change to the control itself).
export function WithHelp({ id, children, className = '' }) {
  return <span className={`with-help ${className}`}>{children}<HelpTip id={id} /></span>;
}

// The in-app Help view: every entry, by chapter, with an anchor per function. It is a dialog over
// the studio; playback, the project and all settings stay as they are. Closing returns to the ⓘ.
export function HelpView() {
  const { view } = useHelpState();
  const dialog = useRef(null);
  const returnTo = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (view) returnTo.current = view.returnFocus;
    if (view && !element.open) element.showModal();
    if (!view && element.open) {
      element.close();
      // After the dialog has closed (its own focus restoration has run), go back to the ⓘ or button.
      if (returnTo.current?.isConnected) returnTo.current.focus();
      returnTo.current = null;
    }
    if (view?.id) {
      const target = element.querySelector(`#${helpAnchor(view.id)}`);
      target?.scrollIntoView({ block: 'start' });
      target?.focus({ preventScroll: true });
    }
  }, [view]);
  const close = () => store.set({ view: null });
  return (
    <dialog ref={dialog} className="analysis-dialog help-view" aria-labelledby="help-view-title" onCancel={event => { event.preventDefault(); close(); }}>
      <div className="account-heading">
        <h2 id="help-view-title">Studio help</h2>
        <button className="dialog-close" onClick={close} aria-label="Close help">×</button>
      </div>
      <p className="fine-print">Playback and your settings continue while help is open. Close (×, Escape) returns you to where you were.</p>
      {HELP_SECTIONS.map(([section, title]) => (
        <section key={section} aria-labelledby={`help-section-${section}`}>
          <h3 id={`help-section-${section}`}>{title}</h3>
          {Object.values(HELP).filter(entry => entry.section === section).map(entry => (
            <article key={entry.id} id={helpAnchor(entry.id)} tabIndex={-1} className="help-article">
              <h4>{entry.name}</h4>
              <p>{entry.long}</p>
            </article>
          ))}
        </section>
      ))}
    </dialog>
  );
}

export function HelpButton() {
  return <button type="button" className="account-button" onClick={event => openHelpView(null, event.currentTarget)}>Help</button>;
}
