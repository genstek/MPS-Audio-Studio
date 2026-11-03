# Mastering chain characterisation (LAS-27)

Generated 2026-10-29T23:19:06.443Z with Node v22.22.0.

## EQ: measured impulse response vs transfer function
| rate | type | frequency | gain | q | largestDeviationDb |
| --- | --- | --- | --- | --- | --- |
| 44100 | bell | 1000 | 9 | 1.4 | 0 |
| 44100 | bell | 12000 | -12 | 4 | 0 |
| 44100 | low-shelf | 150 | -6 | 0.707 | 0 |
| 44100 | high-shelf | 8000 | 4 | 0.707 | 0 |
| 44100 | high-pass | 80 | 0 | 0.707 | 0 |
| 44100 | low-pass | 15000 | 0 | 2 | 0 |
| 48000 | bell | 1000 | 9 | 1.4 | 0 |
| 48000 | bell | 12000 | -12 | 4 | 0 |
| 48000 | low-shelf | 150 | -6 | 0.707 | 0 |
| 48000 | high-shelf | 8000 | 4 | 0.707 | 0 |
| 48000 | high-pass | 80 | 0 | 0.707 | 0 |
| 48000 | low-pass | 15000 | 0 | 2 | 0 |
| 96000 | bell | 1000 | 9 | 1.4 | 0 |
| 96000 | bell | 12000 | -12 | 4 | 0 |
| 96000 | low-shelf | 150 | -6 | 0.707 | 0 |
| 96000 | high-shelf | 8000 | 4 | 0.707 | 0 |
| 96000 | high-pass | 80 | 0 | 0.707 | 0 |
| 96000 | low-pass | 15000 | 0 | 2 | 0 |

## Compressor static curve (threshold −20 dBFS, ratio 4:1)
| inputDbfs | kneeDb | expectedGainDb | measuredGainDb |
| --- | --- | --- | --- |
| -40 | 0 | 0 | 0 |
| -40 | 6 | 0 | 0 |
| -30 | 0 | 0 | 0 |
| -30 | 6 | 0 | 0 |
| -24 | 0 | 0 | 0 |
| -24 | 6 | 0 | 0 |
| -20 | 0 | 0 | 0 |
| -20 | 6 | -0.563 | -0.561 |
| -16 | 0 | -3 | -2.992 |
| -16 | 6 | -3 | -2.992 |
| -10 | 0 | -7.5 | -7.486 |
| -10 | 6 | -7.5 | -7.486 |
| -4 | 0 | -12 | -11.983 |
| -4 | 6 | -12 | -11.983 |

## Compressor timing (63 % of a 30 dB step)
| attackMs | measured63PercentAttackMs | releaseMs | measured63PercentReleaseMs |
| --- | --- | --- | --- |
| 1 | 0.98 | 50 | 49.98 |
| 10 | 9.98 | 100 | 99.96 |
| 50 | 49.98 | 500 | 499.81 |

## Limiter true-peak ceiling
| rate | signal | ceilingDbtp | inputTruePeakDbtp | outputTruePeakDbtp | overCeilingDb | maxGainReductionDb |
| --- | --- | --- | --- | --- | --- | --- |
| 44100 | noise +12 dB over full scale | -1 | 17.28 | -0.974 | 0.026 | 18.28 |
| 44100 | noise +12 dB over full scale | -0.1 | 17.28 | -0.074 | 0.026 | 17.38 |
| 44100 | noise +12 dB over full scale | -6 | 17.28 | -5.974 | 0.026 | 23.28 |
| 44100 | fs/4 sine at 45°, 0 dBTP | -1 | 0.1 | -0.996 | 0.004 | 1.1 |
| 44100 | fs/4 sine at 45°, 0 dBTP | -0.1 | 0.1 | -0.098 | 0.002 | 0.2 |
| 44100 | fs/4 sine at 45°, 0 dBTP | -6 | 0.1 | -5.999 | 0.001 | 6.1 |
| 44100 | 3 kHz bursts at +5 dBFS | -1 | 5.15 | -0.995 | 0.005 | 6.15 |
| 44100 | 3 kHz bursts at +5 dBFS | -0.1 | 5.15 | -0.096 | 0.004 | 5.25 |
| 44100 | 3 kHz bursts at +5 dBFS | -6 | 5.15 | -5.993 | 0.007 | 11.15 |
| 44100 | 18 kHz sine +6 dB | -1 | 6.12 | -0.987 | 0.013 | 7.12 |
| 44100 | 18 kHz sine +6 dB | -0.1 | 6.12 | -0.087 | 0.013 | 6.22 |
| 44100 | 18 kHz sine +6 dB | -6 | 6.12 | -5.987 | 0.013 | 12.12 |
| 48000 | noise +12 dB over full scale | -1 | 17.32 | -0.977 | 0.023 | 18.32 |
| 48000 | noise +12 dB over full scale | -0.1 | 17.32 | -0.077 | 0.023 | 17.42 |
| 48000 | noise +12 dB over full scale | -6 | 17.32 | -5.977 | 0.023 | 23.32 |
| 48000 | fs/4 sine at 45°, 0 dBTP | -1 | 0.1 | -0.997 | 0.003 | 1.1 |
| 48000 | fs/4 sine at 45°, 0 dBTP | -0.1 | 0.1 | -0.099 | 0.001 | 0.2 |
| 48000 | fs/4 sine at 45°, 0 dBTP | -6 | 0.1 | -5.999 | 0.001 | 6.1 |
| 48000 | 3 kHz bursts at +5 dBFS | -1 | 5.11 | -1 | 0 | 6.11 |
| 48000 | 3 kHz bursts at +5 dBFS | -0.1 | 5.11 | -0.1 | 0 | 5.21 |
| 48000 | 3 kHz bursts at +5 dBFS | -6 | 5.11 | -5.999 | 0.001 | 11.11 |
| 48000 | 18 kHz sine +6 dB | -1 | 6.29 | -0.994 | 0.006 | 7.29 |
| 48000 | 18 kHz sine +6 dB | -0.1 | 6.29 | -0.094 | 0.006 | 6.39 |
| 48000 | 18 kHz sine +6 dB | -6 | 6.29 | -5.994 | 0.006 | 12.29 |
| 96000 | noise +12 dB over full scale | -1 | 17.52 | -0.991 | 0.009 | 18.52 |
| 96000 | noise +12 dB over full scale | -0.1 | 17.52 | -0.091 | 0.009 | 17.62 |
| 96000 | noise +12 dB over full scale | -6 | 17.52 | -5.991 | 0.009 | 23.52 |
| 96000 | fs/4 sine at 45°, 0 dBTP | -1 | 0.1 | -0.998 | 0.002 | 1.1 |
| 96000 | fs/4 sine at 45°, 0 dBTP | -0.1 | 0.1 | -0.099 | 0.001 | 0.2 |
| 96000 | fs/4 sine at 45°, 0 dBTP | -6 | 0.1 | -6 | 0 | 6.1 |
| 96000 | 3 kHz bursts at +5 dBFS | -1 | 5.11 | -1 | 0 | 6.11 |
| 96000 | 3 kHz bursts at +5 dBFS | -0.1 | 5.11 | -0.1 | 0 | 5.21 |
| 96000 | 3 kHz bursts at +5 dBFS | -6 | 5.11 | -6 | 0 | 11.11 |
| 96000 | 18 kHz sine +6 dB | -1 | 6.35 | -0.994 | 0.006 | 7.35 |
| 96000 | 18 kHz sine +6 dB | -0.1 | 6.35 | -0.094 | 0.006 | 6.45 |
| 96000 | 18 kHz sine +6 dB | -6 | 6.35 | -5.994 | 0.006 | 12.35 |

## Latency
| rate | samples | ms |
| --- | --- | --- |
| 44100 | 77 | 1.746 |
| 48000 | 83 | 1.729 |
| 96000 | 155 | 1.615 |

## Throughput
| audioSeconds | sampleRate | channels | enabledBands | processingSeconds | realTimeFactor |
| --- | --- | --- | --- | --- | --- |
| 20 | 48000 | 2 | 48 | 0.74 | 27.2 |
