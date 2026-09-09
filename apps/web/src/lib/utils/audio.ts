/**
 * Web Audio API Sound Synthesizer — Milestone M05
 * Generates instant, zero-latency auditory feedback for pickup verification
 * without downloading external audio files or relying on external network assets.
 */

/**
 * Plays a pleasant C-major arpeggio chime (C5 -> E5 -> G5 -> C6)
 * for successful pickup handoffs.
 */
export function playSuccessChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    // Notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const startTime = audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

      // Smooth attack and gentle exponential decay
      gain.gain.setValueAtTime(0.001, startTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, startTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.36);
    });

    // Auto-close audio context after sound playback completes
    setTimeout(() => {
      audioCtx.close().catch(() => {});
    }, 1000);
  } catch (err) {
    console.warn('Audio feedback synthesis failed:', err);
  }
}

/**
 * Plays a distinct low buzz sound (sawtooth wave at 180Hz)
 * for double-pickup or invalid OTP rejections.
 */
export function playErrorBuzzer(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const startTime = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.4);

    setTimeout(() => {
      audioCtx.close().catch(() => {});
    }, 800);
  } catch (err) {
    console.warn('Audio feedback buzzer failed:', err);
  }
}
