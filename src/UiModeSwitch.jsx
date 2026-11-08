import React from 'react';

// Visible, query-free switch between the standard interface and the processor preview (LAS-58/75/76).
// Presentation only: it never touches audio, project parameters, presets or undo history.
// A compact select keeps the masthead on one row in short windows (LAS-51); the title carries the build id.
export function UiModeSwitch({ mode, onChange }) {
  return (
    <div className="ui-mode-switch" title={'Build ' + __MPS_BUILD__ + ': compare with git rev-parse --short HEAD'}>
      <select aria-label="Interface mode" data-mode={mode} value={mode} onChange={event => onChange(event.target.value)}>
        <option value="normal">Normal</option>
        <option value="processors">Processor Preview</option>
      </select>
    </div>
  );
}
