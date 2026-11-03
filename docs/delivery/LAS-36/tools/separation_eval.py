"""LAS-36 evaluation of feasible stem-separation approaches in this environment.

Usage:
  python separation_eval.py                       run the built-in synthetic evaluation (JSON to stdout)
  python separation_eval.py --export DIR          also write the synthetic truth stems, the mixture and
                                                  approach A's estimates as float WAVs into DIR
  python separation_eval.py --score TRUTH EST     score any separator: TRUTH and EST are folders with
                                                  vocals.wav, drums.wav, bass.wav, other.wav (same rate
                                                  and length); prints the same measurements
Requires numpy, scipy and soundfile.

Ground truth: a synthetic, generated stem set ("mps-stemset-1": vocals, drums, bass, other), built
from the same kinds of sources as the LAS-29 programme fixture. No recorded or copyrighted audio.
Candidates: two classical DSP separators (no machine learning), because every pretrained-model host
is unreachable from this environment (see the README). Prints JSON with the measurements.
"""
import json, resource, sys, time
import numpy as np
from scipy.ndimage import median_filter
from scipy.signal import stft, istft, butter, sosfiltfilt

RATE = 44100
SECONDS = 12


def stems(seed=11):
    n = np.arange(int(RATE * SECONDS))
    t = n / RATE
    rng = np.random.default_rng(seed)
    hiss = rng.uniform(-1, 1, n.size)
    beat = int(RATE * 0.5)
    chords = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 311.13]]
    bar = (n // (beat * 4)) % 4
    in_beat = (n % beat) / RATE
    roots = np.array([c[0] for c in chords])[bar]
    other = np.zeros(n.size)
    for k in range(3):
        f = np.array([c[k] for c in chords])[bar]
        other += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    other *= 0.06 * (0.7 + 0.3 * np.cos(2 * np.pi * 0.5 * t))
    bass = 0.22 * np.sin(2 * np.pi * (roots / 2) * t) * np.exp(-in_beat * 3)
    kick = np.where((n // beat) % 2 == 0, 0.5, 0) * np.sin(2 * np.pi * (60 + 90 * np.exp(-in_beat * 30)) * in_beat) * np.exp(-in_beat * 12)
    lp = np.zeros(n.size)
    acc = 0.0
    for i in range(n.size):  # one-pole low-pass, as in the fixture
        acc += 0.25 * (hiss[i] - acc)
        lp[i] = acc
    bright = hiss - lp
    snare = np.where((n // beat) % 2 == 1, 0.25, 0) * bright * np.exp(-in_beat * 18)
    hat = 0.05 * bright * np.exp(-((n % (beat // 2)) / RATE) * 60)
    pitch = 180 + 20 * np.sin(2 * np.pi * 0.3 * t)
    pulse = (np.cumsum(pitch) / RATE % 1 < 0.08).astype(float)
    bp1 = np.zeros(n.size); bp2 = np.zeros(n.size); a = b = 0.0
    for i in range(n.size):
        a += 0.12 * (pulse[i] - a); b += 0.3 * (a - b); bp1[i] = a; bp2[i] = b
    voice = 0.18 * (bp1 - bp2) * (0.6 + 0.4 * np.sin(2 * np.pi * 2 * t))
    # Stereo stems (left, right) with the fixture's panning.
    truth = {
        'vocals': np.stack([0.9 * voice, 0.9 * voice]),
        'drums': np.stack([kick + 0.8 * snare + 1.2 * hat, kick + 0.8 * snare + 0.6 * hat]),
        'bass': np.stack([bass, bass]),
        'other': np.stack([0.9 * other, 1.1 * other]),
    }
    return truth, kick


def spectrogram(x):
    _, _, Z = stft(x, fs=RATE, nperseg=4096, noverlap=3072)
    return Z


def inverse(Z, length):
    _, x = istft(Z, fs=RATE, nperseg=4096, noverlap=3072)
    return x[..., :length]


def lowpass(x, hz):
    return sosfiltfilt(butter(4, hz, 'low', fs=RATE, output='sos'), x, axis=-1)


def bandpass(x, lo, hi):
    return sosfiltfilt(butter(4, [lo, hi], 'band', fs=RATE, output='sos'), x, axis=-1)


def separate_hard(mix):
    """A: harmonic/percussive separation by median filtering (Fitzgerald 2010) with hard masks;
    drums = percussive; bass = harmonic below 120 Hz; vocals = harmonic mid channel 500 Hz–3 kHz;
    other = the remainder (so the four estimates always sum to the mixture)."""
    Z = spectrogram(mix)
    mag = np.abs(Z)
    harm = median_filter(mag, size=(1, 1, 17))
    perc = median_filter(mag, size=(1, 17, 1))
    drums = inverse(Z * (perc > harm), mix.shape[-1])
    harmonic = mix - drums
    bass = lowpass(harmonic, 120)
    mid = harmonic.mean(axis=0, keepdims=True)
    vocals = np.repeat(bandpass(mid, 500, 3000), 2, axis=0)
    other = mix - drums - bass - vocals
    return {'vocals': vocals, 'drums': drums, 'bass': bass, 'other': other}


def separate_soft(mix):
    """B: the same decomposition with soft (Wiener-style) masks, power 2, and the vocal estimate
    taken from the time-frequency bins where the mid channel dominates the side channel."""
    Z = spectrogram(mix)
    mag = np.abs(Z)
    harm = median_filter(mag, size=(1, 1, 17)) ** 2
    perc = median_filter(mag, size=(1, 17, 1)) ** 2
    drums = inverse(Z * perc / (harm + perc + 1e-12), mix.shape[-1])
    harmonic = mix - drums
    bass = lowpass(harmonic, 120)
    rest = harmonic - bass
    Zr = spectrogram(rest)
    midZ = (Zr[0] + Zr[1]) / 2
    sideZ = (Zr[0] - Zr[1]) / 2
    freqs = np.linspace(0, RATE / 2, Zr.shape[1])[:, None]
    band = ((freqs > 400) & (freqs < 4000)).astype(float)
    centre = np.abs(midZ) ** 2 / (np.abs(midZ) ** 2 + 30 * np.abs(sideZ) ** 2 + 1e-12)
    vocals = inverse(Zr * (centre * band)[None], mix.shape[-1])
    other = mix - drums - bass - vocals
    return {'vocals': vocals, 'drums': drums, 'bass': bass, 'other': other}


def si_sdr(estimate, reference):
    e, r = estimate.ravel(), reference.ravel()
    scale = np.dot(e, r) / (np.dot(r, r) + 1e-12)
    target = scale * r
    return 10 * np.log10(np.sum(target ** 2) / (np.sum((e - target) ** 2) + 1e-12))


def db(x):
    return 10 * np.log10(x + 1e-20)


def evaluate(name, separate, truth, mix, kick):
    started = time.perf_counter()
    estimates = separate(mix)
    seconds = time.perf_counter() - started
    result = {'approach': name, 'seconds': round(seconds, 2), 'realTimeFactor': round(SECONDS / seconds, 1), 'stems': {}}
    recombined = sum(estimates.values())
    result['recombinationResidualDb'] = round(db(np.sum((recombined - mix) ** 2)) - db(np.sum(mix ** 2)), 1)
    onsets = np.flatnonzero(np.diff((np.abs(kick) > 0.05).astype(int)) == 1)
    for stem, ref in truth.items():
        est = estimates[stem]
        # Bleed: energy of each other source projected into this estimate, relative to the estimate.
        bleed = {other: round(db(np.dot(est.ravel(), truth[other].ravel()) ** 2 / (np.sum(truth[other] ** 2) + 1e-12)) - db(np.sum(est ** 2)), 1)
                 for other in truth if other != stem}
        corr = lambda x: float(np.corrcoef(x[0], x[1])[0, 1]) if np.std(x[0]) > 0 and np.std(x[1]) > 0 else 1.0
        entry = {
            'siSdrDb': round(si_sdr(est, ref), 1),
            'bleedDb': bleed,
            'correlationEstimate': round(corr(est), 3),
            'correlationTruth': round(corr(ref), 3),
            'monoLossDb': round(db(np.sum(est.mean(axis=0) ** 2) * 2) - db(np.sum(est ** 2)), 2),
        }
        if stem == 'drums':
            # Transient damage: peak level in the 5 ms after each kick onset, estimate vs truth.
            win = int(0.005 * RATE)
            peaks = [(np.max(np.abs(est[:, o:o + win])), np.max(np.abs(ref[:, o:o + win]))) for o in onsets if o + win < est.shape[1]]
            entry['transientPeakRatioDb'] = round(float(np.mean([db(e ** 2) - db(r ** 2) for e, r in peaks])) / 1, 1)
        result['stems'][stem] = entry
    return result


def read_stems(folder):
    import soundfile
    out = {}
    for stem in ('vocals', 'drums', 'bass', 'other'):
        data, rate = soundfile.read(f'{folder}/{stem}.wav', dtype='float64', always_2d=True)
        if rate != RATE:
            raise SystemExit(f'{stem}.wav is {rate} Hz; this scorer expects {RATE} Hz.')
        out[stem] = data.T if data.shape[1] == 2 else np.repeat(data.T, 2, axis=0)
    return out


def score(truth_dir, estimate_dir):
    truth = read_stems(truth_dir)
    estimates = read_stems(estimate_dir)
    length = min(min(x.shape[1] for x in truth.values()), min(x.shape[1] for x in estimates.values()))
    truth = {k: v[:, :length] for k, v in truth.items()}
    estimates = {k: v[:, :length] for k, v in estimates.items()}
    mix = sum(truth.values())
    drums = truth['drums'].mean(axis=0)
    result = evaluate('external estimates', lambda _mix: estimates, truth, mix, drums)
    print(json.dumps(result, indent=1))


def export(folder, truth, mix):
    import os, soundfile
    os.makedirs(f'{folder}/truth', exist_ok=True)
    os.makedirs(f'{folder}/estimates-A', exist_ok=True)
    for stem, data in truth.items():
        soundfile.write(f'{folder}/truth/{stem}.wav', data.T, RATE, subtype='FLOAT')
    soundfile.write(f'{folder}/mixture.wav', mix.T, RATE, subtype='FLOAT')
    for stem, data in separate_hard(mix).items():
        soundfile.write(f'{folder}/estimates-A/{stem}.wav', data.T, RATE, subtype='FLOAT')


def main():
    if len(sys.argv) == 4 and sys.argv[1] == '--score':
        return score(sys.argv[2], sys.argv[3])
    truth, kick = stems()
    mix = sum(truth.values())
    report = {
        'stemSet': 'mps-stemset-1 (synthetic, generated)', 'rate': RATE, 'seconds': SECONDS,
        'python': sys.version.split()[0], 'numpy': np.__version__,
        'results': [evaluate('A: HPSS hard masks + band split', separate_hard, truth, mix, kick),
                    evaluate('B: HPSS soft masks + mid/side vocal mask', separate_soft, truth, mix, kick)],
        'peakMemoryMiB': round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024),
    }
    print(json.dumps(report, indent=1))
    if len(sys.argv) == 3 and sys.argv[1] == '--export':
        export(sys.argv[2], truth, mix)


if __name__ == '__main__':
    main()
