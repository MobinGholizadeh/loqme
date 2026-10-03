// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
const decoder = vi.hoisted(() => vi.fn());
vi.mock('jsqr', () => ({ default: decoder }));
import { QRCameraScanner } from '@/components/pickup/QRCameraScanner';
const media = () => { const stop = vi.fn(); return { stop, stream: { getTracks: () => [{ stop }] } }; };
let getUserMedia: ReturnType<typeof vi.fn>, frame: FrameRequestCallback;
beforeEach(() => {
  decoder.mockReset(); getUserMedia = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { frame = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('QR camera acquisition, scanning and cleanup', () => {
  it('does not request a camera while closed', () => {
    render(<QRCameraScanner isOpen={false} onScan={vi.fn()} onClose={vi.fn()} />); expect(getUserMedia).not.toHaveBeenCalled();
  });
  it('stops a stream granted after the scanner has already closed', async () => {
    const { stream, stop } = media(); let grant!: (value: unknown) => void;
    getUserMedia.mockReturnValue(new Promise(resolve => { grant = resolve; }));
    const view = render(<QRCameraScanner isOpen onScan={vi.fn()} onClose={vi.fn()} />); view.unmount();
    await act(async () => grant(stream)); expect(stop).toHaveBeenCalledOnce(); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
  it('stops active tracks even when the video element is removed during unmount', async () => {
    const { stream, stop } = media(); getUserMedia.mockResolvedValue(stream);
    const view = render(<QRCameraScanner isOpen onScan={vi.fn()} onClose={vi.fn()} />); await act(async () => {});
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: { ideal: 'environment' } }) }));
    view.unmount(); expect(stop).toHaveBeenCalledOnce(); expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
  it('discards an older camera request when the user switches lenses', async () => {
    const first = media(), second = media(); let grant!: (value: unknown) => void;
    getUserMedia.mockReturnValueOnce(new Promise(resolve => { grant = resolve; })).mockResolvedValueOnce(second.stream);
    render(<QRCameraScanner isOpen onScan={vi.fn()} onClose={vi.fn()} />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'چرخش دوربین' })));
    await act(async () => grant(first.stream)); expect(first.stop).toHaveBeenCalledOnce(); expect(second.stop).not.toHaveBeenCalled();
    expect((document.querySelector('video') as HTMLVideoElement).srcObject).toBe(second.stream);
  });
  it('releases the camera when playback fails and offers retry/manual entry', async () => {
    const { stream, stop } = media(); getUserMedia.mockResolvedValue(stream); vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('play denied'));
    const close = vi.fn(), fallback = vi.fn(); render(<QRCameraScanner isOpen onScan={vi.fn()} onClose={close} onFallbackToManual={fallback} />); await act(async () => {});
    expect(stop).toHaveBeenCalledOnce(); expect(screen.getByText(/دسترسی به دوربین مسدود/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ورود دستی کد ۴ رقمی' })); expect(close).toHaveBeenCalledOnce(); expect(fallback).toHaveBeenCalledOnce();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'تلاش مجدد' })));
    expect(getUserMedia).toHaveBeenCalledTimes(2); expect(screen.queryByText(/دسترسی به دوربین مسدود/)).toBeNull();
  });
  it('offers manual entry when camera APIs are unavailable', async () => {
    vi.stubGlobal('navigator', {}); const close = vi.fn(), fallback = vi.fn();
    render(<QRCameraScanner isOpen onScan={vi.fn()} onClose={close} onFallbackToManual={fallback} />); await act(async () => {});
    expect(screen.getByText(/پشتیبانی نمی‌کند/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'کد ۴ رقمی' })); expect(close).toHaveBeenCalled(); expect(fallback).toHaveBeenCalled();
  });
  it('waits for frames and decodes exactly one QR before releasing the camera', async () => {
    const { stream, stop } = media(); getUserMedia.mockResolvedValue(stream); const scan = vi.fn();
    render(<QRCameraScanner isOpen onScan={scan} onClose={vi.fn()} />); await act(async () => {});
    act(() => frame(0)); expect(decoder).not.toHaveBeenCalled();
    const video = document.querySelector('video')!; Object.defineProperty(video, 'readyState', { value: 4 }); Object.defineProperty(video, 'videoWidth', { value: 20 }); Object.defineProperty(video, 'videoHeight', { value: 20 });
    const data = new Uint8ClampedArray(1600); const context = { drawImage: vi.fn(), getImageData: () => ({ data, width: 20, height: 20 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as any);
    decoder.mockReturnValueOnce(null).mockReturnValueOnce({ data: 'signed-pickup-proof' });
    act(() => frame(1)); expect(scan).not.toHaveBeenCalled(); act(() => frame(2));
    expect(scan).toHaveBeenCalledExactlyOnceWith('signed-pickup-proof'); expect(stop).toHaveBeenCalledOnce();
    expect(decoder).toHaveBeenCalledWith(data, 20, 20, { inversionAttempts: 'dontInvert' });
  });
});
