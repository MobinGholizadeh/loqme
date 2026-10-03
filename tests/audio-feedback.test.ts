import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playSuccessChime, playErrorBuzzer } from '@/lib/utils/audio';

describe('Pickup audio feedback', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('is safe during server rendering and on browsers without Web Audio', () => {
    expect(() => { playSuccessChime(); playErrorBuzzer(); }).not.toThrow();
    vi.stubGlobal('window', {}); expect(() => { playSuccessChime(); playErrorBuzzer(); }).not.toThrow();
  });
  it.each(['AudioContext', 'webkitAudioContext'])('schedules the distinct sounds using %s and closes the context', async key => {
    const oscillators: any[] = []; const close = vi.fn().mockRejectedValue(new Error('already closed'));
    class Context {
      currentTime = 10; destination = {};
      close = close;
      createOscillator() { const osc = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; oscillators.push(osc); return osc; }
      createGain() { return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }; }
    }
    vi.stubGlobal('window', { [key]: Context }); playSuccessChime(); playErrorBuzzer();
    expect(oscillators).toHaveLength(5);
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(523.25, 10);
    expect(oscillators[4].frequency.setValueAtTime).toHaveBeenCalledWith(180, 10); expect(oscillators[4].type).toBe('sawtooth');
    await vi.advanceTimersByTimeAsync(1000); expect(close).toHaveBeenCalledTimes(2);
  });
  it('does not break pickup interaction when audio initialization throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', { AudioContext: class { constructor() { throw new Error('not permitted'); } } });
    expect(() => { playSuccessChime(); playErrorBuzzer(); }).not.toThrow(); expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
