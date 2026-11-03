import React, { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HELP, HELP_SECTIONS, helpAnchor } from './help-content.js';

// Contextual help (LAS-73/74). There is no help icon: the help attaches to the real control or its label.
// - Hovering the control/label for 3 seconds opens a small non-modal popover; leaving earlier cancels it.
//   Ordinary clicking, dragging and typing are never delayed, and a press on the control dismisses the
//   popover and suppresses it until the pointer is released (no tooltip during a drag).
// - Keyboard: focus the control and press F1 (opens at once). Escape closes and keeps focus on the control.
// - Touch: hover does not apply and long-press is left to the control; the Help button in the header
//   opens Studio help, which lists every function.
// - The pointer can move from the control onto the popover (to use the link); leaving both closes it
//   after a short grace.
// - Ownership is per mounted instance (not per help id): exactly one popover exists in the whole page,
//   anchored to the instance that was hovered, even when several editors contain identical controls.
// - The control carries aria-describedby with the short text, so screen readers get it without the popover.
// Target: a <WithHelp> wrapper, or for an inline <HelpTip> the element just before it (the label or
// control), falling back to its parent.
export const HOVER_DELAY_MS = 3000;
const LEAVE_GRACE_MS = 250;
const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]';

// One open popover in the whole page (the owning instance token), and the Help view's open/anchor state.
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
  const instance = useId();
  const open = state.open === instance;
  const popoverId = `${instance}-pop`;
  const describeId = `${instance}-desc`;
  const marker = useRef(null);
  const target = useRef(null);
  const popover = useRef(null);
  const hover = useRef(null);
  const leave = useRef(null);
  const pressed = useRef(false);
  const [place, setPlace] = useState(null);
  const clear = () => { clearTimeout(hover.current); clearTimeout(leave.current); hover.current = null; leave.current = null; };
  const isOpen = () => store.get().open === instance;
  const close = () => { clear(); if (isOpen()) store.set({ open: null }); };
  useEffect(() => { if (!open) clear(); }, [open]);

  // Attach to the real control/label.
  useEffect(() => {
    const own = marker.current;
    if (!own || !entry) return undefined;
    const el = className.split(' ').includes('inline') ? (own.previousElementSibling || own.parentElement) : own.parentElement;
    if (!el) return undefined;
    target.current = el;
    const previousDescribed = el.getAttribute('aria-describedby');
    el.setAttribute('aria-describedby', previousDescribed ? `${previousDescribed} ${describeId}` : describeId);
    el.dataset.help = id;
    const enter = event => {
      if (event.pointerType === 'touch' || pressed.current) return;
      clearTimeout(leave.current);
      if (isOpen() || hover.current) return;
      if (el.querySelector('[data-help]:hover')) return; // a nested control owns the hover
      if (store.get().open) store.set({ open: null }); // moving between controls: the other one closes
      hover.current = setTimeout(() => { hover.current = null; store.set({ open: instance }); }, HOVER_DELAY_MS);
    };
    const exit = () => {
      clearTimeout(hover.current);
      hover.current = null;
      if (isOpen()) leave.current = setTimeout(() => { if (isOpen()) store.set({ open: null }); }, LEAVE_GRACE_MS);
    };
    const down = event => {
      if (popover.current?.contains(event.target)) return; // the popover can be a DOM child of the target
      pressed.current = true;
      close();
    };
    const up = () => { pressed.current = false; };
    const key = event => {
      if (event.key !== 'F1' || event.defaultPrevented) return;
      event.preventDefault();
      clear();
      store.set({ open: instance });
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', exit);
    el.addEventListener('pointerdown', down);
    el.addEventListener('keydown', key);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', exit);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('keydown', key);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      const rest = (el.getAttribute('aria-describedby') || '').split(' ').filter(token => token && token !== describeId).join(' ');
      if (rest) el.setAttribute('aria-describedby', rest); else el.removeAttribute('aria-describedby');
      delete el.dataset.help;
      clear();
      if (isOpen()) store.set({ open: null });
      target.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, id, className, instance, describeId]);

  // Placement inside the viewport, anchored to this instance's target: below, or above when there is no room.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const position = () => {
      const anchor = target.current?.getBoundingClientRect();
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
      const el = target.current;
      const inside = popover.current?.contains(document.activeElement) || el?.contains(document.activeElement);
      store.set({ open: null });
      if (inside && el?.isConnected) (el.matches(FOCUSABLE) ? el : el.querySelector(FOCUSABLE))?.focus();
    };
    const outside = event => {
      if (!popover.current?.contains(event.target) && !target.current?.contains(event.target)) store.set({ open: null });
    };
    document.addEventListener('keydown', key, true);
    document.addEventListener('pointerdown', outside, true);
    return () => { document.removeEventListener('keydown', key, true); document.removeEventListener('pointerdown', outside, true); };
  }, [open]);

  if (!entry) return null;
  return (
    <>
      <span ref={marker} hidden className="help-anchor" />
      <span id={describeId} hidden>{entry.name}: {entry.short}</span>
      {open && (
        <div ref={popover} id={popoverId} className="help-popover" role="dialog" aria-modal="false" aria-labelledby={`${popoverId}-title`}
          style={place ? { top: place.top, left: place.left } : { visibility: 'hidden', top: 0, left: 0 }}
          onPointerEnter={() => clearTimeout(leave.current)} onPointerLeave={() => { leave.current = setTimeout(close, LEAVE_GRACE_MS); }}>
          <strong id={`${popoverId}-title`}>{entry.name}</strong>
          <p>{entry.short}</p>
          <a href={`#${helpAnchor(id)}`} onClick={event => { event.preventDefault(); openHelpView(id, target.current); }}>More about {entry.name} →</a>
        </div>
      )}
    </>
  );
}

// Wraps a control; hovering the control (or a label inside) shows its help. No icon is added.
export function WithHelp({ id, children, className = '' }) {
  return <span className={`with-help ${className}`}>{children}<HelpTip id={id} /></span>;
}

// The in-app Help view: every entry, by chapter, with an anchor per function. It is a dialog over
// the studio; playback, the project and all settings stay as they are. Closing returns to the control.
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
      // After the dialog has closed (its own focus restoration has run), go back to the control or button.
      const back = returnTo.current;
      if (back?.isConnected) (back.matches(FOCUSABLE) ? back : back.querySelector(FOCUSABLE))?.focus();
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
      <p className="fine-print">Hover a control for 3 seconds, or focus it and press F1, for a short explanation. Playback and your settings continue while help is open. Close (×, Escape) returns you to where you were.</p>
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
