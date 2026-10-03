// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';

afterEach(cleanup);
describe('Shared accessible controls', () => {
  it('executes enabled button actions and forwards its ref', () => {
    const click = vi.fn(); const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref} onClick={click} leftIcon={<span>left</span>} rightIcon={<span>right</span>}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: /right\s*Save\s*left/ }));
    expect(click).toHaveBeenCalledOnce(); expect(ref.current?.type).toBe('button');
  });
  it.each(['primary', 'destructive', 'secondary', 'ghost', 'accent', 'outline'] as const)('disables actions while loading (%s)', variant => {
    const click = vi.fn();
    const { rerender } = render(<Button variant={variant} isLoading onClick={click}>Save</Button>);
    const button = screen.getByRole('button'); expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('در حال بارگذاری');
    fireEvent.click(button); expect(click).not.toHaveBeenCalled();
    rerender(<Button variant={variant} size="lg" rounded="pill" isLoading>Save</Button>);
    expect(screen.getByRole('status').getAttribute('width')).toBe('20');
    rerender(<Button variant={variant} size="sm" disabled>Save</Button>);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
  it('links input labels, hints and errors without announcing both messages', () => {
    const ref = React.createRef<HTMLInputElement>();
    const { rerender } = render(<Input ref={ref} label="Phone" hint="Enter your phone" prefixElement="+98" suffixElement="mobile" />);
    const input = screen.getByLabelText('Phone'); expect(input).toBe(ref.current);
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Enter your phone');
    rerender(<Input id="phone" label="Phone" hint="Hidden hint" error="Invalid number" disabled />);
    expect(screen.getByLabelText('Phone').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Invalid number'); expect(screen.queryByText('Hidden hint')).toBeNull();
    rerender(<Input aria-label="Unlabelled" />);
    expect(screen.getByLabelText('Unlabelled').hasAttribute('aria-describedby')).toBe(false);
  });
  it('selects options, preserves disabled states and links validation messages', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Select label="City" hint="Choose" icon={<span>location</span>} onChange={onChange} options={[{ value: 'u', label: 'Urmia' }, { value: 't', label: 'Tehran', disabled: true }]} />);
    const select = screen.getByLabelText('City'); fireEvent.change(select, { target: { value: 'u' } }); expect(onChange).toHaveBeenCalledOnce();
    expect((screen.getByRole('option', { name: 'Tehran' }) as HTMLOptionElement).disabled).toBe(true);
    expect(document.getElementById(select.getAttribute('aria-describedby')!)?.textContent).toBe('Choose');
    rerender(<Select label="City" id="city" disabled error="Required" hint="Hidden"><option>Pick</option></Select>);
    expect((screen.getByLabelText('City') as HTMLSelectElement).disabled).toBe(true); expect(screen.getByRole('alert').textContent).toBe('Required');
    expect(screen.queryByText('Hidden')).toBeNull();
    rerender(<Select aria-label="Plain"><option>Pick</option></Select>);
    expect(screen.getByLabelText('Plain').hasAttribute('aria-invalid')).toBe(false);
  });
  it('preserves badge and card content across supported variants', () => {
    const { rerender } = render(<><Badge>Verified</Badge><Card>Offer</Card></>);
    expect(screen.getByText('Verified')).toBeTruthy(); expect(screen.getByText('Offer')).toBeTruthy();
    for (const variant of ['brand', 'success', 'warning', 'danger', 'neutral'] as const) {
      rerender(<Badge variant={variant} size="sm" icon={<span>icon</span>}>Verified</Badge>);
      expect(screen.getByText('Verified')).toBeTruthy(); expect(screen.getByText('icon')).toBeTruthy();
    }
    for (const variant of ['elevated', 'outlined', 'flat'] as const) {
      rerender(<Card variant={variant} isInteractive onClick={() => {}}>Offer</Card>); expect(screen.getByText('Offer')).toBeTruthy();
    }
  });
  it('supports numeric and CSS skeleton dimensions and all spinner sizes', () => {
    const { rerender } = render(<Skeleton data-testid="skeleton" width={10} height={20} />);
    expect(screen.getByTestId('skeleton').style.width).toBe('10px'); expect(screen.getByTestId('skeleton').style.height).toBe('20px');
    rerender(<Skeleton data-testid="skeleton" variant="circular" width="50%" height="2rem" />);
    expect(screen.getByTestId('skeleton').style.width).toBe('50%');
    rerender(<><Skeleton variant="rectangular" /><CardSkeleton /></>);
    for (const [size, pixels] of [['sm', '16'], ['md', '20'], ['lg', '28']] as const) {
      rerender(<Spinner size={size} variant="neutral" />); expect(screen.getByRole('status').getAttribute('width')).toBe(pixels);
    }
    rerender(<Spinner />); expect(screen.getByRole('status').getAttribute('width')).toBe('20');
  });
});
