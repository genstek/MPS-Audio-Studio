# Mastering listening-review protocol (LAS-29)

A repeatable way to compare versions by ear without louder-sounds-better bias. The result is a **human judgement**, recorded as such; it is not a measurement and is never filled in automatically.

## Material
- **Your own song:** a mixdown WAV, mono or stereo, any sample rate the studio supports. It stays on your computer.
- **Processing settings:** in the studio, Mixer → **Settings…** → **Download settings (.json)**.
- **Reference (optional), e.g. the approved Lia v6 master:** only the actual authorized file, together with its SHA-256 checksum from a source you trust.
  - The tool refuses a file whose checksum does not match.
  - Historical loudness numbers are not measurements of the current file, so they are not used.
  - Matching a reference needs the same sample rate as the song.

## Prepare a blind set (on your computer)
```sh
npm run listening:set -- song.wav --settings mps-chain-settings.json --start 60 --duration 20 \
  --reference lia-v6.wav --reference-sha256 <authorized checksum> --out listening-set
```
What the tool does:
1. Renders the **whole song** with the settings, so the compressor and limiter are in their real state at the segment.
2. Cuts the **same segment** from the original and from the processed version. The chain latency is already compensated, so they line up to the sample.
3. Finds the reference's position by cross-correlation and cuts the same musical segment. It warns if the reference does not look like the same recording.
4. Measures the integrated loudness (ITU-R BS.1770) of each segment and **turns the louder ones down** to the quietest one by a constant gain. Nothing is turned up, so nothing clips.
5. Writes `A.wav`, `B.wav` (and `C.wav`) in a seeded random order, 24-bit, with 20 ms fades. It also writes `review-sheet.md`, plus `key.json` with the labels, gains, loudness before and after, checksums and the settings.

## Listen
- One session of at most about 20 minutes; take breaks.
- Same headphones or speakers, a fixed comfortable level, a quiet room.
- Load A/B/C into a player that can switch instantly at the same position (any DAW or a player with gapless switching). Switch often and at the same musical moments.
- Check mono compatibility by switching your system or player to mono.
- Fill in `review-sheet.md` **before** opening `key.json`:
  - punch;
  - bass balance;
  - vocal clarity;
  - harshness (2–6 kHz, sibilance);
  - pumping/breathing;
  - mono compatibility;
  - overall preference.

  Score each from 1 to 5, add a word or two, and note your listening conditions.
- Then open `key.json`, note which version was which, and record the result in `docs/delivery/LAS-29/manual-qa.md` (or send it to be recorded). Your preferences are a valid result; they are recorded as taste, not as objective truth.

## Reading the results
- A consistent preference across repeated blind sessions means more than one session. Repeat with another segment (verse and chorus).
- If the processed version only wins when it is louder (matching off), the processing is not yet better.
- Agreement with the reference describes closeness to that target, not "correctness".
