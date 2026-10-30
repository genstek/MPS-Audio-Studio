import { processStandIn } from './plugins.js';

// One plugin instance per host process (LAS-37 prototype). The bridge talks to it over IPC; if the
// plugin crashes or hangs, only this process is lost and the bridge kills or replaces it.
process.on('message', ({ id, pluginId, parameters, channels, sampleRate }) => {
  try {
    const output = processStandIn(pluginId, parameters, channels, sampleRate);
    process.send({ id, ok: true, channels: output });
  } catch (error) {
    process.send({ id, ok: false, message: String(error?.message ?? error) });
  }
});
