# Mastering chain characterisation (LAS-27)

Generated 2026-10-29T23:58:33.548Z with Node v22.22.0.

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

## Limiter true-peak ceiling (4× BS.1770 meter and 32× reference meter; the limiter detects at 8×)
| rate | signal | ceilingDbtp | inputTruePeakDbtp | outputTruePeakDbtp | overCeilingDb | output32xPeakDbtp | over32xDb | maxGainReductionDb |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 44100 | noise +12 dB over full scale | -1 | 17.28 | -0.974 | 0.026 | -0.91 | 0.09 | 18.28 |
| 44100 | noise +12 dB over full scale | -0.1 | 17.28 | -0.074 | 0.026 | -0.01 | 0.09 | 17.38 |
| 44100 | noise +12 dB over full scale | -6 | 17.28 | -5.974 | 0.026 | -5.91 | 0.09 | 23.28 |
| 44100 | fs/4 sine at 45°, 0 dBTP | -1 | 0.1 | -0.996 | 0.004 | -0.996 | 0.004 | 1.1 |
| 44100 | fs/4 sine at 45°, 0 dBTP | -0.1 | 0.1 | -0.098 | 0.002 | -0.098 | 0.002 | 0.2 |
| 44100 | fs/4 sine at 45°, 0 dBTP | -6 | 0.1 | -5.999 | 0.001 | -5.999 | 0.001 | 6.1 |
| 44100 | 3 kHz bursts at +5 dBFS | -1 | 5.15 | -1.01 | 0 | -0.996 | 0.004 | 6.16 |
| 44100 | 3 kHz bursts at +5 dBFS | -0.1 | 5.15 | -0.111 | 0 | -0.097 | 0.003 | 5.26 |
| 44100 | 3 kHz bursts at +5 dBFS | -6 | 5.15 | -6.007 | 0 | -5.994 | 0.006 | 11.16 |
| 44100 | 18 kHz sine +6 dB | -1 | 6.12 | -1.301 | 0 | -0.99 | 0.01 | 7.44 |
| 44100 | 18 kHz sine +6 dB | -0.1 | 6.12 | -0.401 | 0 | -0.09 | 0.01 | 6.54 |
| 44100 | 18 kHz sine +6 dB | -6 | 6.12 | -6.301 | 0 | -5.99 | 0.01 | 12.44 |
| 48000 | noise +12 dB over full scale | -1 | 17.32 | -0.977 | 0.023 | -0.912 | 0.088 | 18.32 |
| 48000 | noise +12 dB over full scale | -0.1 | 17.32 | -0.077 | 0.023 | -0.012 | 0.088 | 17.42 |
| 48000 | noise +12 dB over full scale | -6 | 17.32 | -5.977 | 0.023 | -5.912 | 0.088 | 23.32 |
| 48000 | fs/4 sine at 45°, 0 dBTP | -1 | 0.1 | -0.997 | 0.003 | -0.997 | 0.003 | 1.1 |
| 48000 | fs/4 sine at 45°, 0 dBTP | -0.1 | 0.1 | -0.099 | 0.001 | -0.099 | 0.001 | 0.2 |
| 48000 | fs/4 sine at 45°, 0 dBTP | -6 | 0.1 | -5.999 | 0.001 | -5.999 | 0.001 | 6.1 |
| 48000 | 3 kHz bursts at +5 dBFS | -1 | 5.11 | -1.004 | 0 | -0.999 | 0.001 | 6.12 |
| 48000 | 3 kHz bursts at +5 dBFS | -0.1 | 5.11 | -0.104 | 0 | -0.099 | 0.001 | 5.22 |
| 48000 | 3 kHz bursts at +5 dBFS | -6 | 5.11 | -6.004 | 0 | -5.998 | 0.002 | 11.12 |
| 48000 | 18 kHz sine +6 dB | -1 | 6.29 | -1 | 0 | -0.971 | 0.029 | 7.52 |
| 48000 | 18 kHz sine +6 dB | -0.1 | 6.29 | -0.1 | 0 | -0.071 | 0.029 | 6.62 |
| 48000 | 18 kHz sine +6 dB | -6 | 6.29 | -6 | 0 | -5.971 | 0.029 | 12.52 |
| 96000 | noise +12 dB over full scale | -1 | 17.52 | -0.991 | 0.009 | -0.919 | 0.081 | 18.52 |
| 96000 | noise +12 dB over full scale | -0.1 | 17.52 | -0.091 | 0.009 | -0.019 | 0.081 | 17.62 |
| 96000 | noise +12 dB over full scale | -6 | 17.52 | -5.991 | 0.009 | -5.919 | 0.081 | 23.52 |
| 96000 | fs/4 sine at 45°, 0 dBTP | -1 | 0.1 | -0.998 | 0.002 | -0.998 | 0.002 | 1.1 |
| 96000 | fs/4 sine at 45°, 0 dBTP | -0.1 | 0.1 | -0.099 | 0.001 | -0.099 | 0.001 | 0.2 |
| 96000 | fs/4 sine at 45°, 0 dBTP | -6 | 0.1 | -6 | 0 | -6 | 0 | 6.1 |
| 96000 | 3 kHz bursts at +5 dBFS | -1 | 5.11 | -1 | 0 | -1 | 0 | 6.11 |
| 96000 | 3 kHz bursts at +5 dBFS | -0.1 | 5.11 | -0.1 | 0 | -0.1 | 0 | 5.21 |
| 96000 | 3 kHz bursts at +5 dBFS | -6 | 5.11 | -6 | 0 | -6 | 0 | 11.11 |
| 96000 | 18 kHz sine +6 dB | -1 | 6.35 | -1 | 0 | -0.994 | 0.006 | 7.46 |
| 96000 | 18 kHz sine +6 dB | -0.1 | 6.35 | -0.1 | 0 | -0.094 | 0.006 | 6.56 |
| 96000 | 18 kHz sine +6 dB | -6 | 6.35 | -6 | 0 | -5.994 | 0.006 | 12.46 |

## Latency
| rate | samples | ms |
| --- | --- | --- |
| 44100 | 77 | 1.746 |
| 48000 | 83 | 1.729 |
| 96000 | 155 | 1.615 |

## Throughput
| audioSeconds | sampleRate | channels | enabledBands | processingSeconds | realTimeFactor |
| --- | --- | --- | --- | --- | --- |
| 20 | 48000 | 2 | 48 | 1.24 | 16.1 |
