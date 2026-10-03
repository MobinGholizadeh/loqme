// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';
import { DialogSurface } from '@/components/ui/DialogSurface';
import { useFeedback } from '@/components/ui/useFeedback';
import { ListingImage } from '@/components/ui/ListingImage';
vi.mock('next/image', () => ({ default: ({ fill, priority, ...props }: any) => <img {...props} data-priority={String(priority)} /> }));

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('Dialog lifecycle and image recovery', () => {
  it('opens a labelled dialog, locks scrolling and restores focus when closed', () => {
    const opener = document.createElement('button'); document.body.append(opener); opener.focus();
    document.body.style.overflow = 'auto'; const close = vi.fn();
    const { rerender, unmount } = render(<Modal isOpen={false} onClose={close}>Body</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Modal isOpen onClose={close} title="Details" footer={<button>Accept</button>}>Body</Modal>);
    const dialog = screen.getByRole('dialog', { name: 'Details' }); expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByText('Body')); expect(close).not.toHaveBeenCalled();
    fireEvent.click(dialog); expect(close).toHaveBeenCalledTimes(1);
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true })); expect(close).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(close).toHaveBeenCalledTimes(3);
    unmount(); expect(document.body.style.overflow).toBe('auto'); expect(document.activeElement).toBe(opener); opener.remove();
  });
  it('provides fallback modal naming and surface dismissal without dismissing inner content', () => {
    const close = vi.fn(); const { unmount } = render(<Modal isOpen onClose={close}>Body</Modal>);
    expect(screen.getByRole('dialog', { name: 'جزئیات' })).toBeTruthy(); unmount();
    const result = render(<DialogSurface onClose={close}><button>Inside</button></DialogSurface>);
    const surface = screen.getByRole('dialog', { name: 'جزئیات' });
    fireEvent.click(screen.getByText('Inside')); expect(close).not.toHaveBeenCalled();
    fireEvent.click(surface); fireEvent(surface, new Event('cancel', { bubbles: true, cancelable: true })); expect(close).toHaveBeenCalledTimes(2); result.unmount();
  });
  it('opens and dismisses feedback through both acknowledgement and close actions', () => {
    function Harness() { const feedback = useFeedback(); return <><button onClick={() => feedback.showFeedback('Saved')}>Show</button>{feedback.feedbackDialog}</>; }
    render(<Harness />); fireEvent.click(screen.getByText('Show'));
    expect(screen.getByRole('status').textContent).toBe('Saved');
    fireEvent.click(screen.getByRole('button', { name: 'متوجه شدم' })); expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Show')); fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(screen.queryByRole('dialog')).toBeNull();
  });
  it.each([null, '', '//evil.test/image', 'https://evil.test/image'])('shows a placeholder for absent or untrusted image %s', src => {
    render(<ListingImage src={src} alt="Offer" />); expect(screen.queryByRole('img')).toBeNull(); expect(screen.getByText('تصویر بسته ثبت نشده است')).toBeTruthy();
  });
  it('recovers after image failure when the source changes and labels illustrative photos', () => {
    const { rerender } = render(<ListingImage src="/listing-defaults/bread.png" alt="Bread" />);
    expect(screen.getByText('تصویر تزئینی')).toBeTruthy(); fireEvent.error(screen.getByRole('img', { name: 'Bread' }));
    expect(screen.queryByRole('img')).toBeNull();
    rerender(<ListingImage src="/uploads/real.webp" alt="Real" priority sizes="100vw" />);
    const image = screen.getByRole('img', { name: 'Real' }); expect(image.getAttribute('sizes')).toBe('100vw'); expect(image.getAttribute('data-priority')).toBe('true'); expect(screen.queryByText('تصویر تزئینی')).toBeNull();
  });
  it('allows only the configured inventory origin including its slash boundary', () => {
    vi.stubEnv('NEXT_PUBLIC_INVENTORY_IMAGE_ORIGIN', 'https://images.test/');
    const { rerender } = render(<ListingImage src="https://images.test/photo.webp" alt="Allowed" />);
    expect(screen.getByRole('img', { name: 'Allowed' })).toBeTruthy();
    rerender(<ListingImage src="https://images.test.evil.test/photo.webp" alt="Denied" />); expect(screen.queryByRole('img')).toBeNull();
  });
});
