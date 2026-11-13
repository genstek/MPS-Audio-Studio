import React from 'react';
import { LAYOUTS } from './studio-layout.js';

// Native select: keyboard accessible, available from the main toolbar at every viewport size.
export function LayoutSwitcher({ value, onChange }) {
  return (
    <label className="layout-switcher">
      <span>Studio Layout</span>
      <select value={value} onChange={event => onChange(event.target.value)} aria-label="Studio Layout">
        {LAYOUTS.map(layout => <option key={layout.id} value={layout.id}>{layout.label}</option>)}
      </select>
    </label>
  );
}
