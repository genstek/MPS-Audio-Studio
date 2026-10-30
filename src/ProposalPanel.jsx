import React, { useState } from 'react';
import { api } from './account-api.js';
import { startRender } from './render-client.js';
import { evaluate } from './proposal.js';
import { composeChain, defaultPreferences, PREFERENCE_BOUNDS } from './presets.js';
import { matchLevels } from './reference-comparison.js';

const number = (v, digits = 1) => {
  const text = v.toFixed(digits);
  return Number(text) === 0 ? text.replace('-', '') : text.replace('-', '−');
};
const signedValue = (v, unit) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${number(v)} ${unit}`);

function Module({ module }) {
  const id = `proposal-${module.module.toLowerCase()}`;
  const entries = [['Measured reason', module.reasons], ['Proposed values', module.values], ['Supported range', [module.range]], ['Guards', module.guardNotes], ['Uncertainty', module.uncertainty]];
  return (
    <article className="proposal-module" aria-labelledby={id}>
      <h4 id={id}>{module.module} <span className={`proposal-status ${module.status === 'proposed' ? 'is-proposed' : ''}`}>{module.status}</span></h4>
      <dl>
        {entries.filter(([, items]) => items.length).map(([term, items]) => (
          <div key={term}><dt>{term}</dt>{items.map(item => <dd key={item}>{item}</dd>)}</div>
        ))}
      </dl>
    </article>
  );
}

// Explicit preferences (LAS-33), shown apart from the reference-derived modules.
function Preferences({ preferences, onChange, onSave, onReset, signedIn, saved }) {
  const slider = (key, label, unit, step) => (
    <label className="proposal-strength">{label}
      <input type="range" min={PREFERENCE_BOUNDS[key][0]} max={PREFERENCE_BOUNDS[key][1]} step={step} value={preferences[key]} aria-valuetext={`${preferences[key]} ${unit}`} onChange={e => onChange({ ...preferences, [key]: Number(e.target.value) })} />
      <output>{preferences[key] > 0 && unit === 'dB' ? '+' : ''}{String(preferences[key]).replace('-', '−')} {unit}</output>
    </label>
  );
  return (
    <article className="proposal-module" aria-labelledby="proposal-preferences">
      <h4 id="proposal-preferences">Your preferences <span className="proposal-status">{saved ? 'saved' : signedIn ? 'not saved' : 'this session'}</span></h4>
      <p className="fine-print">Your own adjustments, applied on top of the reference targets and kept apart from them: a low shelf at 120 Hz, a high shelf at 8 kHz (±4 dB) and the strength a new proposal starts at. Only these numbers are stored, in your account, when you save them.</p>
      {slider('lowShelfDb', 'Low shelf (120 Hz)', 'dB', 0.5)}
      {slider('highShelfDb', 'High shelf (8 kHz)', 'dB', 0.5)}
      {slider('strength', 'Starting strength', '%', 5)}
      <div className="proposal-buttons">
        <button type="button" onClick={onSave} disabled={!signedIn}>Save my preferences</button>
        <button type="button" onClick={onReset}>Reset my preferences</button>
      </div>
      {!signedIn && <p className="fine-print">Sign in (Account) to keep preferences; they apply for this session now.</p>}
    </article>
  );
}

// Reference-guided proposal (LAS-32) for one comparison: propose, preview at a strength, check it
// numerically, apply as one undo step, or reject. Nothing changes the settings before Apply.
// LAS-33: explicit preferences on top (either part can be switched off or reset), an opt-in record
// of the decision, and saving the result as a preset.
export function ProposalPanel({ file, result, chain, jobs, onCheckedGains }) {
  const [proposal, setProposal] = useState(null);
  const [strength, setStrength] = useState(100);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [check, setCheck] = useState(null); // { strength, evaluation }
  const [applied, setApplied] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences());
  const [account, setAccount] = useState({ signedIn: false, saved: false });
  const [use, setUse] = useState({ reference: true, preferences: true });
  const [remember, setRemember] = useState(false);
  const [rating, setRating] = useState('');
  const [presetName, setPresetName] = useState(`Proposal for ${result.reference.label}`.slice(0, 100));

  const paramsAt = (s = strength, prefs = preferences, parts = use) => composeChain(proposal.params, prefs, { strength: s, useReference: parts.reference, usePreferences: parts.preferences });
  // Keeps a running preview in step with every change of strength, preferences or parts.
  const replay = (s, prefs, parts) => { if (chain.previewing) chain.setPreview(paramsAt(s, prefs, parts)); };
  const run = job => { jobs.current.push(job); return job.result; };

  async function propose() {
    setError('');
    setMessage('');
    setBusy('Proposing: rendering and measuring the section…');
    try {
      const stored = await api('/preferences');
      const prefs = stored.ok ? stored.data.preferences : defaultPreferences();
      setAccount({ signedIn: Boolean(stored.ok), saved: Boolean(stored.ok && stored.data.saved) });
      setPreferences(prefs);
      const { report } = await run(startRender(file, { mode: 'propose', segment: result.sections.mix, reference: result.reference.report }, ({ stage }) => setBusy(stage)));
      setProposal(report);
      setStrength(prefs.strength);
      setCheck(prefs.strength === 100 && (prefs.lowShelfDb === 0 && prefs.highShelfDb === 0) ? { strength: 100, label: '100 %, reference targets', evaluation: report.evaluation } : null);
      setBusy('');
    } catch (failure) {
      setBusy('');
      if (failure.name !== 'AbortError') setError(failure.message);
    }
  }

  function changeStrength(value) {
    setStrength(value);
    replay(value, preferences, use);
  }

  function changePreferences(next) {
    setPreferences(next);
    setAccount(a => ({ ...a, saved: false }));
    replay(strength, next, use);
  }

  function changeUse(next) {
    setUse(next);
    replay(strength, preferences, next);
  }

  async function savePreferences() {
    const saved = await api('/preferences', { method: 'PUT', body: preferences });
    if (saved.ok) { setAccount(a => ({ ...a, saved: true })); setMessage('Preferences saved to your account.'); } else setError(saved.data?.message ?? 'Preferences could not be saved.');
  }

  async function resetPreferences() {
    const neutral = defaultPreferences();
    if (account.signedIn) await api('/preferences', { method: 'DELETE' });
    setPreferences(neutral);
    setAccount(a => ({ ...a, saved: false }));
    replay(strength, neutral, use);
    setMessage('Preferences reset; the reference targets are unchanged.');
  }

  // The decision is stored only when the owner ticked "Remember my decision" (settings only).
  async function rememberDecision(decision) {
    if (!remember || !account.signedIn) return '';
    const body = {
      decision, rating: rating ? Number(rating) : null, strength, proposalVersion: proposal.version, referenceProfileId: result.reference.profileId ?? null,
      summary: { modules: proposal.modules.map(({ module, status, values }) => ({ module, status, values })), preferences, useReference: use.reference, usePreferences: use.preferences },
    };
    const saved = await api('/decisions', { method: 'POST', body });
    return saved.ok ? ' Decision remembered.' : ' The decision could not be remembered.';
  }

  async function saveAsPreset() {
    const saved = await api('/presets', { method: 'POST', body: { name: presetName, chain: paramsAt(), origin: 'proposal', analysisVersion: result.reference.report.version, proposalVersion: proposal.version, strength, referenceProfileId: result.reference.profileId ?? null } });
    if (saved.ok) setMessage(`Saved the preset “${saved.data.name}” (Settings… → My presets).`);
    else setError(saved.unavailable ? 'Accounts are unavailable right now.' : saved.status === 401 ? 'Sign in (Account) to save presets.' : saved.data?.message ?? 'The preset could not be saved.');
  }

  function togglePreview() {
    chain.setPreview(chain.previewing ? null : paramsAt());
    setMessage(chain.previewing ? 'Preview off: your own settings play again.' : `Previewing the proposal at ${strength} %. Use the monitor's Processed mix to hear it against the reference.`);
  }

  async function checkStrength() {
    const at = strength;
    setError('');
    setBusy(`Checking the proposal at ${at} %…`);
    try {
      const { report } = await run(startRender(file, { mode: 'compare', params: paramsAt(at), segment: result.sections.mix }));
      setCheck({ strength: at, label: `${at} %${use.reference ? '' : ', without reference targets'}${use.preferences && (preferences.lowShelfDb || preferences.highShelfDb) ? ', with your preferences' : ''}`, evaluation: evaluate(result.reference.report, report.original, { report: report.processed, meters: report.meters }) });
      // While the preview plays this strength, the monitor matches its measured loudness.
      if (chain.previewing) onCheckedGains(matchLevels({ processedDb: report.processed.loudness.integratedLufs, originalDb: report.original.loudness.integratedLufs, referenceDb: result.reference.report.loudness.integratedLufs }));
      setBusy('');
    } catch (failure) {
      setBusy('');
      if (failure.name !== 'AbortError') setError(failure.message);
    }
  }

  async function apply() {
    chain.replace(paramsAt());
    chain.setPreview(null);
    setApplied(true);
    setMessage(`Applied at ${strength} %. Undo in the mixer restores your previous settings; every module stays editable.${await rememberDecision('accepted')}`);
  }

  async function reject() {
    chain.setPreview(null);
    const note = await rememberDecision('rejected');
    setProposal(null);
    setCheck(null);
    setMessage(`Proposal rejected; your settings are unchanged.${note}`);
  }

  return (
    <section className="proposal" aria-labelledby="proposal-title">
      <h3 id="proposal-title">Proposal from this comparison</h3>
      <p className="fine-print">Builds EQ, compressor and limiter settings from these measurements, within documented guards, by rendering and measuring your mix section. Nothing changes until you press Apply.</p>
      <p className="fine-print" aria-live="polite">{busy || message}</p>
      {error && <p className="account-error" role="alert">{error}</p>}
      {!proposal && <button type="button" onClick={propose} disabled={Boolean(busy)}>Propose settings</button>}
      {proposal && (
        <>
          <p className="analysis-note">{proposal.note}</p>
          <div className="proposal-modules">
            {proposal.modules.map(module => <Module key={module.module} module={module} />)}
            <Preferences preferences={preferences} onChange={changePreferences} onSave={savePreferences} onReset={resetPreferences} signedIn={account.signedIn} saved={account.saved} />
          </div>
          {!applied && (
            <div className="proposal-controls">
              <fieldset className="proposal-parts">
                <legend>Play and apply</legend>
                <label><input type="checkbox" checked={use.reference} onChange={e => changeUse({ ...use, reference: e.target.checked })} />Use reference targets</label>
                <label><input type="checkbox" checked={use.preferences} onChange={e => changeUse({ ...use, preferences: e.target.checked })} />Use my preferences</label>
              </fieldset>
              <label className="proposal-strength">Proposal strength
                <input type="range" min="0" max="100" step="5" value={strength} aria-valuetext={`${strength} %`} onChange={e => changeStrength(Number(e.target.value))} />
                <output>{strength} %</output>
              </label>
              <div className="proposal-buttons">
                <button type="button" aria-pressed={chain.previewing} onClick={togglePreview}>Preview proposal</button>
                <button type="button" onClick={checkStrength} disabled={Boolean(busy)}>Check at this strength</button>
                <button type="button" className="primary" onClick={apply}>Apply proposal</button>
                <button type="button" onClick={reject}>Reject proposal</button>
              </div>
              <div className="proposal-remember">
                <label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={!account.signedIn} />Remember my decision</label>
                <label>Rating
                  <select value={rating} onChange={e => setRating(e.target.value)} disabled={!remember}>
                    <option value="">none</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <span className="fine-print">Off by default. When on, Apply or Reject stores the decision, the settings and your rating in your account (no audio); Settings… lists and forgets them.</span>
              </div>
            </div>
          )}
          <div className="proposal-save">
            <label>Preset name<input value={presetName} maxLength={100} onChange={e => setPresetName(e.target.value)} /></label>
            <button type="button" onClick={saveAsPreset} disabled={!account.signedIn}>Save as preset</button>
          </div>
          {check && (
            <table className="analysis-table proposal-check">
              <caption>Numerical check at {check.label} (distance to the reference, rendered and measured)</caption>
              <thead><tr><th scope="col">Measure</th><th scope="col">Mix − reference</th><th scope="col">Proposal − reference</th></tr></thead>
              <tbody>
                {check.evaluation.rows.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{signedValue(row.before, row.unit)}</td><td>{signedValue(row.after, row.unit)}</td></tr>)}
                <tr><th scope="row">True peak of the result</th><td>—</td><td>{number(check.evaluation.truePeakDbtp, 2)} dBTP</td></tr>
                <tr><th scope="row">Largest gain reduction (compressor / limiter)</th><td>—</td><td>{number(check.evaluation.compressorReductionDb)} / {number(check.evaluation.limiterReductionDb)} dB</td></tr>
              </tbody>
            </table>
          )}
          <p className="fine-print">A smaller distance is a measurement, not proof that it sounds better: judge it with the level-matched monitor.</p>
        </>
      )}
    </section>
  );
}
