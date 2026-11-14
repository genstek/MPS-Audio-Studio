import { describe, expect, test, vi } from 'vitest';
import { STEM_POLL_MS, createStemStore } from '../../src/stem-store.js';

// A stand-in for the engine's stem session: the store must only publish what the session holds.
function fakeEngine() {
  const stems = [{ id: 1, name: 'Kick', gainDb: 0, pan: 0, mute: false, solo: false }];
  let playing = false, position = 0;
  const session = {
    stems: () => stems.map(s => ({ ...s })),
    playing: () => playing,
    position: () => position,
    duration: () => 4,
    setGain: (id, db) => { stems.find(s => s.id === id).gainDb = db; },
    setMute: (id, mute) => { stems.find(s => s.id === id).mute = mute; },
    pause: () => { playing = false; },
    stop: () => { playing = false; position = 0; },
  };
  let open = true;
  return {
    engine: {
      stemSession: () => (open ? session : null),
      sampleRate: () => 48000,
      stemLevels: vi.fn(() => ({ stems: [{ id: 1, peakDb: -6, rmsDb: -9 }], master: { peakDb: -3 } })),
      playStems: async () => { playing = true; return true; },
    },
    advance: seconds => { position += seconds; },
    end: () => { playing = false; position = 0; },
    close: () => { open = false; },
  };
}
function timers() {
  const active = new Map();
  let next = 1;
  return { setTimer: (fn, ms) => { active.set(next, { fn, ms }); return next++; }, clearTimer: id => active.delete(id), active, tick: () => [...active.values()].forEach(t => t.fn()) };
}
function setup() {
  const fake = fakeEngine(), clockwork = timers();
  const store = createStemStore(clockwork);
  store.attach(() => fake.engine);
  return { fake, clockwork, store };
}

describe('LAS-45 Stage 2: shared stem store', () => {
  test('is empty and inert before an engine or session exists', () => {
    const store = createStemStore(timers());
    expect(store.get()).toEqual({ stems: [], playing: false, duration: 0, rate: null });
    expect(store.act('setGain', 1, -3)).toBe(false);
    store.refresh();
    expect(store.getStems()).toEqual([]);
  });

  test('an edit goes to the session and every listener sees the same new snapshot', () => {
    const { store } = setup();
    const a = vi.fn(), b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.refresh();
    const before = store.getStems();
    expect(store.getStems()).toBe(before); // stable between changes (useSyncExternalStore)
    expect(store.act('setGain', 1, -6)).toBe(true);
    expect(store.getStems()[0].gainDb).toBe(-6);
    expect(store.getStems()).not.toBe(before);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    store.act('setMute', 1, true);
    expect(store.getStems()[0].mute).toBe(true);
  });

  test('one polling timer runs only while the stems play, however many components listen', async () => {
    const { store, clockwork, fake } = setup();
    for (let i = 0; i < 5; i++) store.subscribeLive(() => {});
    store.refresh();
    expect(clockwork.active.size).toBe(0);
    expect(await store.play()).toBe(true);
    expect(store.get().playing).toBe(true);
    expect(clockwork.active.size).toBe(1);
    expect([...clockwork.active.values()][0].ms).toBe(STEM_POLL_MS);
    store.refresh();
    store.refresh();
    expect(clockwork.active.size).toBe(1);
    fake.advance(0.5);
    clockwork.tick();
    expect(store.getLive()).toEqual({ position: 0.5, levels: { stems: [{ id: 1, peakDb: -6, rmsDb: -9 }], master: { peakDb: -3 } } });
    expect(fake.engine.stemLevels).toHaveBeenCalledTimes(1);
    store.act('pause');
    expect(clockwork.active.size).toBe(0);
    expect(store.getLive().levels).toEqual({ stems: [], master: null }); // no stale meter reading
    expect(store.getLive().position).toBe(0.5); // pause keeps the position
  });

  test('the end of playback is noticed by the poll and stops the timer', async () => {
    const { store, clockwork, fake } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    await store.play();
    fake.end();
    clockwork.tick();
    expect(store.get().playing).toBe(false);
    expect(clockwork.active.size).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('a cleared session empties the store; dispose stops the timer', async () => {
    const { store, clockwork, fake } = setup();
    await store.play();
    fake.close();
    store.refresh();
    expect(store.get()).toEqual({ stems: [], playing: false, duration: 0, rate: null });
    expect(clockwork.active.size).toBe(0);
    const again = setup();
    await again.store.play();
    again.store.dispose();
    expect(again.clockwork.active.size).toBe(0);
  });
});
