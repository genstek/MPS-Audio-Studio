import React, { useState } from 'react';
import { startRender } from './render-client.js';
import { atStrength, evaluate } from './proposal.js';
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

// Reference-guided proposal (LAS-32) for one comparison: propose, preview at a strength, check it
// numerically, apply as one undo step, or reject. Nothing changes the settings before Apply.
export function ProposalPanel({ file, result, chain, jobs, onCheckedGains }) {
  const [proposal, setProposal] = useState(null);
  const [strength, setStrength] = useState(100);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [check, setCheck] = useState(null); // { strength, evaluation }
  const [applied, setApplied] = useState(false);

  const paramsAt = (s = strength) => atStrength(proposal.params, s / 100);
  const run = job => { jobs.current.push(job); return job.result; };

  async function propose() {
    setError('');
    setMessage('');
    setBusy('Proposing: rendering and measuring the section…');
    try {
      const { report } = await run(startRender(file, { mode: 'propose', segment: result.sections.mix, reference: result.reference.report }, ({ stage }) => setBusy(stage)));
      setProposal(report);
      setStrength(100);
      setCheck({ strength: 100, evaluation: report.evaluation });
      setBusy('');
    } catch (failure) {
      setBusy('');
      if (failure.name !== 'AbortError') setError(failure.message);
    }
  }

  function changeStrength(value) {
    setStrength(value);
    if (chain.previewing) chain.setPreview(paramsAt(value));
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
      setCheck({ strength: at, evaluation: evaluate(result.reference.report, report.original, { report: report.processed, meters: report.meters }) });
      // While the preview plays this strength, the monitor matches its measured loudness.
      if (chain.previewing) onCheckedGains(matchLevels({ processedDb: report.processed.loudness.integratedLufs, originalDb: report.original.loudness.integratedLufs, referenceDb: result.reference.report.loudness.integratedLufs }));
      setBusy('');
    } catch (failure) {
      setBusy('');
      if (failure.name !== 'AbortError') setError(failure.message);
    }
  }

  function apply() {
    chain.replace(paramsAt());
    chain.setPreview(null);
    setApplied(true);
    setMessage(`Applied at ${strength} %. Undo in the mixer restores your previous settings; every module stays editable.`);
  }

  function reject() {
    chain.setPreview(null);
    setProposal(null);
    setCheck(null);
    setMessage('Proposal rejected; your settings are unchanged.');
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
          <div className="proposal-modules">{proposal.modules.map(module => <Module key={module.module} module={module} />)}</div>
          {!applied && (
            <div className="proposal-controls">
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
            </div>
          )}
          {check && (
            <table className="analysis-table proposal-check">
              <caption>Numerical check at {check.strength} % (distance to the reference, rendered and measured)</caption>
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
