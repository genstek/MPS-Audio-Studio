
 RUN  v5.0.5 /home/user/MPS-Audio-Studio-delivery

 ❯ tests/unit/chain.test.js (47 tests | 1 failed | 46 skipped) 8226ms
   ❯ LAS-27 limiter (13)
     × measured with a 32× reference meter, limit```
oise stays within +0.1 dB of the ceiling (44.1 kHz) 8224ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/chain.test.js > LAS-27 limiter > measured with a 32× reference meter, limited noise stays within +0.1 dB of the ceiling (44.1 kHz)
AssertionError: expected -0.7570988346273788 to be less than or equal to -0.9
 ❯ tests/unit/chain.test.js:231:31
    229|     const [out] = renderChain(params, input, 44100).channels;
    230|     expect(db(truePeak(out))).toBeLessThanOrEqual(-1 + 0.03); // the B…
    231|     expect(db(finePeak(out))).toBeLessThanOrEqual(-1 + 0.1);
       |                               ^
    232|   }, 60_000);
    233|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 46 skipped (47)
   Start at  23:53:48
   Duration  8.40s (tests 99%)

exit 1
