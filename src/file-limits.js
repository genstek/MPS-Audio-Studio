// Per-file audio size limit (LAS-71), shared by the studio and the account server.
// 250 MiB = 250 × 1024 × 1024 = 262,144,000 bytes. A file of exactly this size is accepted; one
// byte more is refused. The studio has always shown binary units (MiB), so the limit is written
// as MiB everywhere, with the exact byte count where a message has room for it.
// This is a per-file gate for source tracks, stems and reference WAVs (browser) and private
// library uploads (server). It is not a limit on JSON request bodies or settings files.
export const MAX_AUDIO_FILE_BYTES = 250 * 1024 * 1024;
export const MAX_AUDIO_FILE_LABEL = '250 MiB';

const mib = bytes => (bytes / 1048576).toFixed(1);

// The reason a file of `size` bytes is refused, or null when it passes the size gate.
export function audioFileSizeProblem(size) {
  if (size <= MAX_AUDIO_FILE_BYTES) return null;
  return `This file is ${mib(size)} MiB. WAV files can be at most ${MAX_AUDIO_FILE_LABEL} (262,144,000 bytes); choose a smaller file.`;
}
