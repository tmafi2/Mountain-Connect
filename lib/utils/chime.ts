/**
 * Plays a subtle two-note ascending chime via Web Audio API so the
 * interview page does not need to ship an audio file. Intentionally
 * quiet — gain caps at 0.08 — so it is unobtrusive during a call.
 *
 * Safe to call from any click-handler or state-change effect; will
 * silently fail if the AudioContext is suspended (e.g. no prior user
 * gesture) or the browser does not support Web Audio.
 */
export function playJoinChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two ascending notes, slight overlap.
    const notes = [
      { freq: 880, start: 0 },
      { freq: 1320, start: 0.12 },
    ];

    notes.forEach(({ freq, start }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.08, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });

    // Release the context after the tones finish so we do not leak.
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // no-op — chime is best-effort
  }
}
