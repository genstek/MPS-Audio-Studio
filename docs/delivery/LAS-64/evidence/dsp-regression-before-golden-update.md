# DSP regression run

120 renders in 32.3 s with Node v22.23.4; fixtures mps-fixtures-1, chain schema v2, mps-analysis-1, limiter 8× detection; golden version 1.

Findings: none. Golden differences: 25.

- golden: golden chainSchemaVersion is 1, code is 2: regenerate the golden file with a reason
- golden: silence-stereo@44100/space: no golden result
- golden: impulse-mono@44100/space: no golden result
- golden: tone-1k-stereo@44100/space: no golden result
- golden: tone-100-mono@44100/space: no golden result
- golden: tone-10k-stereo@44100/space: no golden result
- golden: sweep-mono@44100/space: no golden result
- golden: phase-inverted@44100/space: no golden result
- golden: phase-quadrature@44100/space: no golden result
- golden: left-only@44100/space: no golden result
- golden: transients@44100/space: no golden result
- golden: programme@44100/space: no golden result
- golden: programme-hot@44100/space: no golden result
- golden: silence-stereo@48000/space: no golden result
- golden: impulse-mono@48000/space: no golden result
- golden: tone-1k-stereo@48000/space: no golden result
- golden: tone-100-mono@48000/space: no golden result
- golden: tone-10k-stereo@48000/space: no golden result
- golden: sweep-mono@48000/space: no golden result
- golden: phase-inverted@48000/space: no golden result
- golden: phase-quadrature@48000/space: no golden result
- golden: left-only@48000/space: no golden result
- golden: transients@48000/space: no golden result
- golden: programme@48000/space: no golden result
- golden: programme-hot@48000/space: no golden result

| Render | Frames | LUFS | True peak dBTP | Sample peak dBFS | Clipped | Correlation |
| --- | --- | --- | --- | --- | --- | --- |
| silence-stereo@44100/bypass | 88200 | — | — | — | 0 | — |
| silence-stereo@44100/default | 88200 | — | — | — | 0 | — |
| silence-stereo@44100/master | 88200 | — | — | — | 0 | — |
| silence-stereo@44100/independent | 88200 | — | — | — | 0 | — |
| silence-stereo@44100/space | 88200 | — | — | — | 0 | — |
| impulse-mono@44100/bypass | 88200 | -45.3629 | -6.0206 | -6.0206 | 0 | — |
| impulse-mono@44100/default | 88200 | -45.3629 | -6.0206 | -6.0206 | 0 | — |
| impulse-mono@44100/master | 88200 | -40.0461 | -1 | -1 | 0 | — |
| impulse-mono@44100/independent | 88200 | -45.1388 | -5.7535 | -5.7535 | 0 | — |
| impulse-mono@44100/space | 88200 | -47.4322 | -8.1787 | -8.1787 | 0 | — |
| tone-1k-stereo@44100/bypass | 88200 | -20.0065 | -19.9966 | -20.0001 | 0 | 1 |
| tone-1k-stereo@44100/default | 88200 | -20.0065 | -19.9966 | -20.0001 | 0 | 1 |
| tone-1k-stereo@44100/master | 88200 | -14.2785 | -14.2685 | -14.272 | 0 | 1 |
| tone-1k-stereo@44100/independent | 88200 | -18.3779 | -15.9966 | -16.0001 | 0 | 1 |
| tone-1k-stereo@44100/space | 88200 | -21.7181 | -20.2119 | -20.2137 | 0 | 0.9932 |
| tone-100-mono@44100/bypass | 88200 | -16.8471 | -12 | -12.0001 | 0 | — |
| tone-100-mono@44100/default | 88200 | -16.8471 | -12 | -12.0001 | 0 | — |
| tone-100-mono@44100/master | 88200 | -12.3939 | -5.183 | -5.1832 | 0 | — |
| tone-100-mono@44100/independent | 88200 | -16.8054 | -11.9583 | -11.9583 | 0 | — |
| tone-100-mono@44100/space | 88200 | -19.1771 | -13.154 | -13.154 | 0 | — |
| tone-10k-stereo@44100/bypass | 88200 | -14.6612 | -17.9989 | -18.0001 | 0 | 1 |
| tone-10k-stereo@44100/default | 88200 | -14.6612 | -17.9989 | -18.0001 | 0 | 1 |
| tone-10k-stereo@44100/master | 88200 | -6.6265 | -9.704 | -9.7053 | 0 | 1 |
| tone-10k-stereo@44100/independent | 88200 | -14.6611 | -17.9704 | -17.9716 | 0 | 0.9971 |
| tone-10k-stereo@44100/space | 88200 | -15.7244 | -18.7003 | -18.7015 | 0 | 0.9948 |
| sweep-mono@44100/bypass | 132300 | -14.2642 | -11.9849 | -12 | 0 | — |
| sweep-mono@44100/default | 132300 | -14.2642 | -11.9849 | -12 | 0 | — |
| sweep-mono@44100/master | 132300 | -9.9207 | -6.5758 | -6.5891 | 0 | — |
| sweep-mono@44100/independent | 132300 | -13.3615 | -7.9961 | -7.9988 | 0 | — |
| sweep-mono@44100/space | 132300 | -16.2729 | -10.4033 | -10.4033 | 0 | — |
| phase-inverted@44100/bypass | 88200 | -14.6951 | -13.9992 | -14 | 0 | -1 |
| phase-inverted@44100/default | 88200 | -14.6951 | -13.9992 | -14 | 0 | -1 |
| phase-inverted@44100/master | 88200 | -10.8176 | -9.8809 | -9.8835 | 0 | -1 |
| phase-inverted@44100/independent | 88200 | -14.5967 | -13.07 | -13.0701 | 0 | -0.9266 |
| phase-inverted@44100/space | 88200 | -16.8532 | -16.1573 | -16.1581 | 0 | -1 |
| phase-quadrature@44100/bypass | 88200 | -14.6951 | -13.9992 | -14 | 0 | 0 |
| phase-quadrature@44100/default | 88200 | -14.6951 | -13.9992 | -14 | 0 | 0 |
| phase-quadrature@44100/master | 88200 | -11.4839 | -9.8849 | -9.8875 | 0 | 0 |
| phase-quadrature@44100/independent | 88200 | -14.5967 | -13.07 | -13.0701 | 0 | 0.3759 |
| phase-quadrature@44100/space | 88200 | -16.1326 | -14.6003 | -14.6013 | 0 | 0.1731 |
| left-only@44100/bypass | 88200 | -13.5123 | -9.9986 | -10.0027 | 0 | — |
| left-only@44100/default | 88200 | -13.5123 | -9.9986 | -10.0027 | 0 | — |
| left-only@44100/master | 88200 | -10.7774 | -4.7886 | -4.7937 | 0 | — |
| left-only@44100/independent | 88200 | -10.9135 | -7.3981 | -7.4009 | 0 | — |
| left-only@44100/space | 88200 | -15.0534 | -11.2665 | -11.2703 | 0 | 0.1943 |
| transients@44100/bypass | 132300 | -16.3319 | 1.1853 | -0.9152 | 0 | -0.0201 |
| transients@44100/default | 132300 | -16.9656 | -0.981 | -1 | 0 | -0.02 |
| transients@44100/master | 132300 | -17.1621 | -0.9702 | -1 | 0 | -0.02 |
| transients@44100/independent | 132300 | -17.1962 | -0.9905 | -1 | 0 | -0.0209 |
| transients@44100/space | 132300 | -18.4342 | -0.9998 | -2.9706 | 0 | -0.019 |
| programme@44100/bypass | 176400 | -16.5632 | -2.3042 | -2.4397 | 0 | 0.9967 |
| programme@44100/default | 176400 | -16.5632 | -2.3042 | -2.4397 | 0 | 0.9967 |
| programme@44100/master | 176400 | -12.9852 | -0.9882 | -1 | 0 | 0.9965 |
| programme@44100/independent | 176400 | -16.5702 | -2.2259 | -2.3545 | 0 | 0.9882 |
| programme@44100/space | 176400 | -18.2997 | -4.3222 | -4.4612 | 0 | 0.967 |
| programme-hot@44100/bypass | 176400 | -7.5632 | 6.6958 | 6.5603 | 7923 | 0.9967 |
| programme-hot@44100/default | 176400 | -9.9087 | -0.9784 | -1 | 0 | 0.9958 |
| programme-hot@44100/master | 176400 | -10.2407 | -0.9798 | -1 | 0 | 0.9958 |
| programme-hot@44100/independent | 176400 | -9.9266 | -0.9877 | -1 | 0 | 0.9848 |
| programme-hot@44100/space | 176400 | -10.8037 | -0.99 | -1 | 0 | 0.9592 |
| silence-stereo@48000/bypass | 96000 | — | — | — | 0 | — |
| silence-stereo@48000/default | 96000 | — | — | — | 0 | — |
| silence-stereo@48000/master | 96000 | — | — | — | 0 | — |
| silence-stereo@48000/independent | 96000 | — | — | — | 0 | — |
| silence-stereo@48000/space | 96000 | — | — | — | 0 | — |
| impulse-mono@48000/bypass | 96000 | -45.7156 | -6.0206 | -6.0206 | 0 | — |
| impulse-mono@48000/default | 96000 | -45.7156 | -6.0206 | -6.0206 | 0 | — |
| impulse-mono@48000/master | 96000 | -40.4142 | -1 | -1 | 0 | — |
| impulse-mono@48000/independent | 96000 | -45.5086 | -5.7738 | -5.7738 | 0 | — |
| impulse-mono@48000/space | 96000 | -47.7846 | -8.1787 | -8.1787 | 0 | — |
| tone-1k-stereo@48000/bypass | 96000 | -20.0093 | -20 | -20 | 0 | 1 |
| tone-1k-stereo@48000/default | 96000 | -20.0093 | -20 | -20 | 0 | 1 |
| tone-1k-stereo@48000/master | 96000 | -14.2814 | -14.2721 | -14.2721 | 0 | 1 |
| tone-1k-stereo@48000/independent | 96000 | -18.3807 | -16 | -16 | 0 | 1 |
| tone-1k-stereo@48000/space | 96000 | -21.6573 | -20.1401 | -20.1569 | 0 | 0.9924 |
| tone-100-mono@48000/bypass | 96000 | -16.8509 | -12 | -12 | 0 | — |
| tone-100-mono@48000/default | 96000 | -16.8509 | -12 | -12 | 0 | — |
| tone-100-mono@48000/master | 96000 | -12.3977 | -5.1829 | -5.1829 | 0 | — |
| tone-100-mono@48000/independent | 96000 | -16.8092 | -11.9583 | -11.9585 | 0 | — |
| tone-100-mono@48000/space | 96000 | -19.1512 | -13.1385 | -13.1386 | 0 | — |
| tone-10k-stereo@48000/bypass | 96000 | -14.6651 | -18 | -18 | 0 | 1 |
| tone-10k-stereo@48000/default | 96000 | -14.6651 | -18 | -18 | 0 | 1 |
| tone-10k-stereo@48000/master | 96000 | -6.6539 | -9.735 | -9.7412 | 0 | 1 |
| tone-10k-stereo@48000/independent | 96000 | -14.665 | -17.9682 | -17.9764 | 0 | 0.9969 |
| tone-10k-stereo@48000/space | 96000 | -16.8547 | -19.2264 | -19.2339 | 0 | 0.9976 |
| sweep-mono@48000/bypass | 144000 | -14.2639 | -11.9903 | -12 | 0 | — |
| sweep-mono@48000/default | 144000 | -14.2639 | -11.9903 | -12 | 0 | — |
| sweep-mono@48000/master | 144000 | -9.9187 | -6.5811 | -6.5906 | 0 | — |
| sweep-mono@48000/independent | 144000 | -13.3615 | -7.9964 | -7.9989 | 0 | — |
| sweep-mono@48000/space | 144000 | -16.2697 | -10.0817 | -10.148 | 0 | — |
| phase-inverted@48000/bypass | 96000 | -14.6988 | -13.9993 | -14 | 0 | -1 |
| phase-inverted@48000/default | 96000 | -14.6988 | -13.9993 | -14 | 0 | -1 |
| phase-inverted@48000/master | 96000 | -10.8213 | -9.8808 | -9.8822 | 0 | -1 |
| phase-inverted@48000/independent | 96000 | -14.6003 | -13.0691 | -13.0703 | 0 | -0.9266 |
| phase-inverted@48000/space | 96000 | -16.8569 | -16.1574 | -16.1581 | 0 | -1 |
| phase-quadrature@48000/bypass | 96000 | -14.6988 | -13.9993 | -14 | 0 | 0 |
| phase-quadrature@48000/default | 96000 | -14.6988 | -13.9993 | -14 | 0 | 0 |
| phase-quadrature@48000/master | 96000 | -11.4877 | -9.8849 | -9.8862 | 0 | 0 |
| phase-quadrature@48000/independent | 96000 | -14.6003 | -13.0691 | -13.0703 | 0 | 0.376 |
| phase-quadrature@48000/space | 96000 | -16.0932 | -14.5411 | -14.5419 | 0 | 0.1732 |
| left-only@48000/bypass | 96000 | -13.5157 | -9.9985 | -10 | 0 | — |
| left-only@48000/default | 96000 | -13.5157 | -9.9985 | -10 | 0 | — |
| left-only@48000/master | 96000 | -10.7808 | -4.789 | -4.791 | 0 | — |
| left-only@48000/independent | 96000 | -10.9162 | -7.3979 | -7.4001 | 0 | — |
| left-only@48000/space | 96000 | -14.8983 | -11.2175 | -11.2213 | 0 | 0.0914 |
| transients@48000/bypass | 144000 | -16.3241 | 1.8396 | -0.9152 | 0 | -0.0102 |
| transients@48000/default | 144000 | -17.12 | -0.9839 | -1 | 0 | -0.0136 |
| transients@48000/master | 144000 | -17.2419 | -0.9881 | -1 | 0 | -0.0105 |
| transients@48000/independent | 144000 | -17.3471 | -0.9918 | -1 | 0 | -0.0124 |
| transients@48000/space | 144000 | -18.5344 | -0.9944 | -2.9646 | 0 | -0.0095 |
| programme@48000/bypass | 192000 | -16.5617 | -2.3622 | -2.4523 | 0 | 0.9967 |
| programme@48000/default | 192000 | -16.5617 | -2.3622 | -2.4523 | 0 | 0.9967 |
| programme@48000/master | 192000 | -12.9789 | -0.9974 | -1 | 0 | 0.9965 |
| programme@48000/independent | 192000 | -16.5691 | -2.3027 | -2.3437 | 0 | 0.9882 |
| programme@48000/space | 192000 | -18.2989 | -4.4017 | -4.4637 | 0 | 0.9668 |
| programme-hot@48000/bypass | 192000 | -7.5617 | 6.6378 | 6.5477 | 8607 | 0.9967 |
| programme-hot@48000/default | 192000 | -9.9378 | -0.9968 | -1.0009 | 0 | 0.9958 |
| programme-hot@48000/master | 192000 | -10.2439 | -0.99 | -1 | 0 | 0.9958 |
| programme-hot@48000/independent | 192000 | -9.9637 | -0.9945 | -1 | 0 | 0.9849 |
| programme-hot@48000/space | 192000 | -10.8164 | -0.9975 | -1.0056 | 0 | 0.959 |
