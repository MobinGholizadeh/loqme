// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { ComplaintModal } from '@/components/complaints/ComplaintModal';
vi.mock('next/image', () => ({ default: ({ unoptimized, ...props }: any) => <img {...props} /> }));
const props = () => ({ isOpen: true, onClose: vi.fn(), orderId: 'order', orderNumber: 'LQ-1', merchantName: 'فروشگاه', onSuccess: vi.fn() });
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function scoreAll(container: HTMLElement) {
  container.querySelectorAll('fieldset').forEach(field => fireEvent.click(field.querySelector('input[value="4"]')!));
}
describe('Verified buyer review form', () => {
  it('hides closed forms, requires every score and resets when reviewing a different order', () => {
    const p = props(); const view = render(<ReviewModal {...p} isOpen={false} />); expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<ReviewModal {...p} />); fireEvent.submit(view.baseElement.querySelector('form')!);
    expect(screen.getByRole('alert').textContent).toContain('هر پنج'); expect(fetchMock).not.toHaveBeenCalled();
    scoreAll(view.baseElement); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'نظر' } });
    view.rerender(<ReviewModal {...p} orderId="other" />);
    expect(view.baseElement.querySelectorAll('input:checked')).toHaveLength(0); expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'انصراف' })); fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(p.onClose).toHaveBeenCalledTimes(2);
  });
  it.each(['  تجربه خوب  ', '   '])('submits all scores and trims optional text %s', async comment => {
    fetchMock.mockResolvedValue(response({ success: true })); const p = props(); const view = render(<ReviewModal {...p} />);
    scoreAll(view.baseElement); fireEvent.change(screen.getByRole('textbox'), { target: { value: comment } }); fireEvent.submit(view.baseElement.querySelector('form')!);
    await screen.findByRole('status'); expect(p.onSuccess).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body); expect(body).toEqual({ orderId: 'order', overallRating: 4, collectionRating: 4, qualityRating: 4, varietyRating: 4, quantityRating: 4, ...(comment.trim() ? { commentFa: comment.trim() } : {}) });
    fireEvent.click(screen.getAllByRole('button', { name: 'بستن' })[1]); expect(p.onClose).toHaveBeenCalledTimes(1);
  });
  it.each(['provider', 'http', 'business', 'network', 'unknown'])('keeps ratings available for retry after %s failure', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    else if (failure === 'unknown') fetchMock.mockRejectedValue(null);
    else fetchMock.mockResolvedValue(response({ success: failure === 'http', ...(failure === 'provider' ? { message: 'رد شد' } : {}) }, failure !== 'http'));
    const p = props(); const view = render(<ReviewModal {...p} />); scoreAll(view.baseElement); fireEvent.submit(view.baseElement.querySelector('form')!);
    expect((await screen.findByRole('alert')).textContent).toBeTruthy(); expect(p.onSuccess).not.toHaveBeenCalled();
    expect(view.baseElement.querySelectorAll('input:checked')).toHaveLength(5); expect((screen.getByRole('button', { name: 'ثبت امتیاز و نظر' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
describe('Customer complaint form', () => {
  it('hides a closed form, validates description and displays safety advice for critical categories', () => {
    const p = props(); const view = render(<ComplaintModal {...p} isOpen={false} />); expect(screen.queryByRole('dialog')).toBeNull(); view.rerender(<ComplaintModal {...p} />);
    fireEvent.submit(view.baseElement.querySelector('form')!); expect(screen.getByText('لطفاً توضیحات را حداقل در ۱۰ کاراکتر وارد کنید')).toBeTruthy(); expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /تاریخ انقضا گذشته/ })); expect(screen.getByText(/خط‌مشی صفر/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'انصراف' })); fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(p.onClose).toHaveBeenCalledTimes(2);
  });
  it('uploads and removes evidence, rejects excess photos and ignores empty selection', async () => {
    fetchMock.mockResolvedValue(response({ success: true, urls: ['/uploads/evidence.webp'] }));
    const view = render(<ComplaintModal {...props()} />); const input = view.baseElement.querySelector('input[type=file]')!;
    fireEvent.change(input, { target: { files: [] } }); expect(fetchMock).not.toHaveBeenCalled();
    const file = new File(['photo'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [file, file, file, file, file] } }); expect(screen.getByText(/حداکثر ۴ تصویر/)).toBeTruthy(); expect(fetchMock).not.toHaveBeenCalled();
    const click = vi.spyOn(input as HTMLInputElement, 'click'); fireEvent.click(screen.getByRole('button', { name: /افزودن/ })); expect(click).toHaveBeenCalledOnce();
    fireEvent.change(input, { target: { files: [file] } }); await screen.findByRole('img', { name: 'مدرک 1' });
    expect(fetchMock.mock.calls[0][1].body.getAll('files')).toHaveLength(1);
    fireEvent.click(screen.getByTitle('حذف تصویر')); expect(screen.queryByRole('img')).toBeNull();
  });
  it.each(['http', 'business', 'network'])('reports an upload %s failure and allows retry', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    else fetchMock.mockResolvedValue(response({ success: failure === 'http' }, failure !== 'http'));
    const view = render(<ComplaintModal {...props()} />);
    fireEvent.change(view.baseElement.querySelector('input[type=file]')!, { target: { files: [new File(['photo'], 'photo.png')] } });
    await screen.findByText(failure === 'network' ? 'offline' : 'خطا در آپلود تصاویر');
    expect((screen.getByRole('button', { name: /افزودن/ }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('submits trimmed details, shows confirmation and invokes completion callbacks after delay', async () => {
    vi.useFakeTimers(); fetchMock.mockResolvedValue(response({ success: true })); const p = props(); const view = render(<ComplaintModal {...p} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  شرح مشکل در سفارش  ' } });
    await act(async () => fireEvent.submit(view.baseElement.querySelector('form')!));
    expect(screen.getByText('گزارش شما با موفقیت ثبت شد')).toBeTruthy();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ orderId: 'order', category: 'MISMATCHED_DESCRIPTION', descriptionFa: 'شرح مشکل در سفارش', evidencePhotos: [] });
    expect(p.onClose).not.toHaveBeenCalled(); await act(() => vi.advanceTimersByTime(2000)); expect(p.onSuccess).toHaveBeenCalledOnce(); expect(p.onClose).toHaveBeenCalledOnce();
  });
  it.each(['http', 'business', 'network'])('shows a submission %s error without reporting success', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    else fetchMock.mockResolvedValue(response({ success: failure === 'http' }, failure !== 'http'));
    const p = props(); const view = render(<ComplaintModal {...p} />); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'شرح مشکل در سفارش' } }); fireEvent.submit(view.baseElement.querySelector('form')!);
    await screen.findByText(failure === 'network' ? 'offline' : 'خطا در ثبت شکایت'); expect(p.onSuccess).not.toHaveBeenCalled();
  });
});

