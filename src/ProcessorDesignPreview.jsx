import React from 'react';

// Always-visible layout chooser (LAS-75/76). Skin changes never touch audio, project parameters or undo history.
export function ProcessorDesignPreview({ skin, onChange }) {
  return (
    <div className="processor-design-toolbar" role="group" aria-label="Processor layout">
      <span><strong title="Layouts change presentation only, never sound. They are prototype skins.">Layout (prototype)</strong><small>Open EQ, Dynamics or Limiter below.</small></span>
      <div className="design-choices">
        <button type="button" aria-pressed={skin === 'rack'} onClick={() => onChange('rack')}>A · Graphite rack</button>
        <button type="button" aria-pressed={skin === 'console'} onClick={() => onChange('console')}>B · Warm console</button>
      </div>
      <span className="design-note">Live controls · layouts are prototype skins</span>
    </div>
  );
}
