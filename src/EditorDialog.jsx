import React, { useEffect, useRef } from 'react';

// A non-modal editor panel (LAS-28): the transport and the Original/Processed switch stay usable
// while editing. Escape or × closes it and focus returns to the button that opened it.
export function EditorDialog({ title, open, onClose, children, headerExtra = null }) {
  const dialog = useRef(null);
  const opener = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) {
      opener.current = document.activeElement;
      element.show();
      element.querySelector('.dialog-close').focus();
    } else if (!open && element.open) {
      element.close();
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [open]);
  // Escape also works when focus fell back to the page (a button inside became disabled).
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      const focus = document.activeElement;
      if (event.key === 'Escape' && (focus === document.body || dialog.current.contains(focus))) {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <dialog ref={dialog} className="editor-dialog" aria-label={title}>
      <div className="account-heading">
        <h2>{title}</h2>
        <div className="editor-heading-tools">
          {headerExtra}
          <button className="dialog-close" onClick={onClose} aria-label={`Close ${title}`}>×</button>
        </div>
      </div>
      {open && children}
    </dialog>
  );
}
