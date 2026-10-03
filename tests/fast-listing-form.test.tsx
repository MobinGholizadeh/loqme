// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('@/components/merchant/ListingImagePicker', () => ({ ListingImagePicker: ({ onChange }: { onChange: (value: string) => void }) => <button type="button" onClick={() => onChange('/photo')}>انتخاب عکس آزمایش</button> }));
import { FastListingModal, PRESET_TEMPLATES } from '@/components/merchant/FastListingModal';
let fetchMock: ReturnType<typeof vi.fn>;
const change = (field: string, value: string) => fireEvent.change(document.querySelector(`[data-field="${field}"]`)!, { target: { value } });
const submit = async () => act(async () => { fireEvent.submit(document.querySelector('form')!); });
beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => ({ success: true, data: options?.method ? {} : ['bakery', 'restaurant', 'cafe', 'supermarket', 'produce', 'deli'].map(slug => ({ slug, nameFa: slug })) }) })); vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('requestAnimationFrame', vi.fn(fn => { fn(); return 1; }));
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function ready() {
  await act(async () => {}); fireEvent.click(screen.getByRole('button', { name: 'انتخاب عکس آزمایش' })); change('pickupStart', '18:00'); change('pickupEnd', '19:00');
}
describe('Merchant listing publication form', () => {
  it('accepts a valid one-digit hour rather than comparing times alphabetically', async () => {
    const created = vi.fn(), close = vi.fn(); render(<FastListingModal isOpen onClose={close} onListingCreated={created} />); await ready();
    change('pickupStart', '۹:۰۰'); change('pickupEnd', '۱۰:۰۰'); fireEvent.click(screen.getByRole('checkbox')); await submit();
    const write = fetchMock.mock.calls.find(c => c[1]?.method)!; expect(write).toBeDefined(); expect(JSON.parse(write[1].body)).toMatchObject({ pickupStart: '9:00', pickupEnd: '10:00', imageUrl: '/photo', quantity: 4 }); expect(created).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
  });
  it('requires an explicit safety declaration before publication', async () => {
    render(<FastListingModal isOpen onClose={vi.fn()} onListingCreated={vi.fn()} />); await ready(); await submit();
    expect(screen.getByText(/لطفاً انطباق اقلام/)).toBeTruthy(); expect(fetchMock.mock.calls.filter(c => c[1]?.method)).toHaveLength(0);
  });
  it.each([
    ['titleFa', 'x', 'عنوان بسته حداقل ۳ کاراکتر باشد'], ['descriptionFa', 'x', 'توضیحات بسته حداقل ۵ کاراکتر باشد'],
    ['originalPriceToman', '0', 'قیمت اصلی را وارد کنید'], ['discountedPriceToman', '0', 'قیمت فروش را وارد کنید'],
    ['discountedPriceToman', '999999', 'قیمت فروش باید کمتر از قیمت اصلی باشد'],
    ['pickupStart', '99:00', 'زمان شروع را مانند ۱۹:۳۰ وارد کنید'], ['pickupEnd', '19:99', 'زمان پایان را مانند ۲۱:۳۰ وارد کنید'],
    ['pickupEnd', '17:00', 'زمان پایان باید بعد از زمان شروع باشد'],
  ])('rejects invalid %s and focuses the error summary', async (field, value, message) => {
    render(<FastListingModal isOpen onClose={vi.fn()} onListingCreated={vi.fn()} />); await ready(); change(field, value); await submit(); expect(screen.getByText(message)).toBeTruthy(); expect(fetchMock.mock.calls.filter(c => c[1]?.method)).toHaveLength(0);
  });
  it.each(PRESET_TEMPLATES)('applies the $id template and requires renewed safety confirmation', async template => {
    render(<FastListingModal isOpen onClose={vi.fn()} onListingCreated={vi.fn()} />); await ready(); fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: name => name.includes(template.titleFa) }));
    expect((screen.getByLabelText('عنوان نمایشی بسته در بازار') as HTMLInputElement).value).toBe(template.titleFa);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'افزایش تعداد' })); fireEvent.click(screen.getByRole('button', { name: 'کاهش تعداد' }));
    fireEvent.click(screen.getByRole('checkbox')); await submit(); const write = fetchMock.mock.calls.find(c => c[1]?.method)!;
    expect(JSON.parse(write[1].body)).toMatchObject({ categorySlug: template.categorySlug, originalPriceToman: template.suggestedOriginal, discountedPriceToman: template.suggestedDiscounted, quantity: template.defaultQuantity, allergens: template.allergens, temperatureRequirement: template.temperature });
  });
  it.each(['http', 'business', 'network'])('retains the form after %s publication failure', async kind => {
    const read = fetchMock.getMockImplementation()!; fetchMock.mockImplementation(async (url, options) => {
      if (!options?.method) return read(url, options); if (kind === 'network') throw new Error('offline');
      return { ok: kind !== 'http', json: async () => ({ success: kind !== 'business' }) };
    });
    const created = vi.fn(); render(<FastListingModal isOpen onClose={vi.fn()} onListingCreated={created} />); await ready(); fireEvent.click(screen.getByRole('checkbox')); await submit();
    expect(screen.getByText(kind === 'network' ? 'ارتباط با سرور برقرار نشد' : 'خطا در ثبت بسته')).toBeTruthy(); expect(created).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('requires a photo and handles unavailable categories without inventing them', async () => {
    fetchMock.mockRejectedValue(new Error('offline')); render(<FastListingModal isOpen onClose={vi.fn()} onListingCreated={vi.fn()} />); await act(async () => {});
    expect(screen.getByText(/دریافت دسته‌بندی‌ها انجام نشد/)).toBeTruthy(); await submit(); expect(screen.getByText('تصویر بسته را انتخاب کنید')).toBeTruthy();
  });
  it('does not load data while closed and aborts category loading on unmount', async () => {
    const close = vi.fn(), created = vi.fn(); const view = render(<FastListingModal isOpen={false} onClose={close} onListingCreated={created} />); expect(fetchMock).not.toHaveBeenCalled();
    view.rerender(<FastListingModal isOpen onClose={close} onListingCreated={created} />); await act(async () => {}); const signal = fetchMock.mock.calls[0][1].signal;
    view.unmount(); expect(signal.aborted).toBe(true);
  });
});
