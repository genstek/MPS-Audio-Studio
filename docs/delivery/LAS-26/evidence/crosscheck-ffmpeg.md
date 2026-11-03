# Analysis cross-check against ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers

| Fixture | Measure | MPS | FFmpeg | Difference | Tolerance | Result |
| --- | --- | --- | --- | --- | --- | --- |
| EBU 3341 test 1: 1 kHz −23 dBFS stereo | integratedLufs | -22.993 | -23 | 0.007 | ±0.15 | PASS |
| EBU 3341 test 1: 1 kHz −23 dBFS stereo | rangeLu | 0 | 0 | 0 | ±0.6 | PASS |
| EBU 3341 test 1: 1 kHz −23 dBFS stereo | samplePeakDbfs | -23 | -23 | 0 | ±0.06 | PASS |
| EBU 3341 test 1: 1 kHz −23 dBFS stereo | truePeakDbtp | -23 | -23 | 0 | ±0.25 | PASS |
| EBU 3342 test 4: five-step tone | integratedLufs | -24.492 | -24.5 | 0.008 | ±0.15 | PASS |
| EBU 3342 test 4: five-step tone | rangeLu | 15 | 15 | 0 | ±0.6 | PASS |
| EBU 3342 test 4: five-step tone | samplePeakDbfs | -20 | -20 | 0 | ±0.06 | PASS |
| EBU 3342 test 4: five-step tone | truePeakDbtp | -20 | -20 | 0 | ±0.25 | PASS |
| Programme-like noise, stereo 44.1 kHz | integratedLufs | -19.53 | -19.5 | -0.03 | ±0.15 | PASS |
| Programme-like noise, stereo 44.1 kHz | rangeLu | 15.975 | 16 | -0.025 | ±0.6 | PASS |
| Programme-like noise, stereo 44.1 kHz | samplePeakDbfs | -8.125 | -8.1 | -0.025 | ±0.06 | PASS |
| Programme-like noise, stereo 44.1 kHz | truePeakDbtp | -8.092 | -8.1 | 0.008 | ±0.25 | PASS |
| Programme-like noise, mono 96 kHz | integratedLufs | -21.64 | -21.6 | -0.04 | ±0.15 | PASS |
| Programme-like noise, mono 96 kHz | rangeLu | 15.991 | 16 | -0.009 | ±0.6 | PASS |
| Programme-like noise, mono 96 kHz | samplePeakDbfs | -7.785 | -7.8 | 0.015 | ±0.06 | PASS |
| Programme-like noise, mono 96 kHz | truePeakDbtp | -7.704 | -7.8 | 0.096 | ±0.25 | PASS |
| Intersample peak: 12 kHz at 45° | integratedLufs | -2.683 | -2.7 | 0.017 | ±0.15 | PASS |
| Intersample peak: 12 kHz at 45° | rangeLu | 0 | 0 | 0 | ±0.6 | PASS |
| Intersample peak: 12 kHz at 45° | samplePeakDbfs | -9.031 | -9 | -0.031 | ±0.06 | PASS |
| Intersample peak: 12 kHz at 45° | truePeakDbtp | -6.02 | -6 | -0.02 | ±0.25 | PASS |
| Chord with tremolo, wide stereo | integratedLufs | -24.231 | -24.2 | -0.031 | ±0.15 | PASS |
| Chord with tremolo, wide stereo | rangeLu | 1.983 | 2 | -0.017 | ±0.6 | PASS |
| Chord with tremolo, wide stereo | samplePeakDbfs | -16.668 | -16.7 | 0.032 | ±0.06 | PASS |
| Chord with tremolo, wide stereo | truePeakDbtp | -16.666 | -16.7 | 0.034 | ±0.25 | PASS |
