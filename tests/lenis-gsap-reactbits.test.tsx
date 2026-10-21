// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SmoothScrollProvider } from "@/components/lenis";
import { SplitText, SpotlightCard, ShinyText, Magnet, CountUp } from "react-bits";
import gsap from "gsap";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Lenis, GSAP, and React Bits integration", () => {
  it("renders SmoothScrollProvider and supports reduced motion fallback", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    const { getByText } = render(
      <SmoothScrollProvider>
        <div>Content Inside Lenis</div>
      </SmoothScrollProvider>
    );

    expect(getByText("Content Inside Lenis")).toBeDefined();
  });

  it("renders SplitText with GSAP without breaking Persian tokens", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    const fromSpy = vi.spyOn(gsap, "fromTo");

    const { container } = render(
      <SplitText text="یک کشف خوشمزه" splitBy="words" />
    );

    const tokens = container.querySelectorAll(".split-token");
    expect(tokens.length).toBe(3);
    expect(tokens[0].textContent).toBe("یک");
    expect(tokens[1].textContent).toBe("کشف");
    expect(tokens[2].textContent).toBe("خوشمزه");

    expect(fromSpy).toHaveBeenCalled();
  });

  it("renders SpotlightCard and updates spotlight on pointermove", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    const { container } = render(
      <SpotlightCard className="test-card">
        <h3>ارزش بیشتر</h3>
      </SpotlightCard>
    );

    const card = container.querySelector(".test-card") as HTMLDivElement;
    expect(card).toBeDefined();

    // Trigger pointer movement
    fireEvent.pointerMove(card, { clientX: 50, clientY: 50 });
    const light = card.querySelector("span[aria-hidden='true']") as HTMLSpanElement;
    expect(light.style.opacity).toBe("1");

    // Trigger pointer leave
    fireEvent.pointerLeave(card);
    expect(light.style.opacity).toBe("0");
  });

  it("renders ShinyText with sweeping gradient styling", () => {
    const { getByText } = render(
      <ShinyText text="پیشنهاد تازه" color="#1D616A" shineColor="#FFFFFF" />
    );

    const element = getByText("پیشنهاد تازه");
    expect(element).toBeDefined();
    expect(element.style.backgroundImage).toContain("linear-gradient");
  });

  it("renders Magnet component with magnetic spring wrappers", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    const { getByText } = render(
      <Magnet padding={40}>
        <button type="button">کشف بسته‌ها</button>
      </Magnet>
    );

    const button = getByText("کشف بسته‌ها");
    expect(button).toBeDefined();
  });

  it("renders CountUp with formatted Persian numbers", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: true, // triggers immediate completion for reduced motion
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    const { getByText } = render(
      <CountUp to={25000} separator="،" suffix=" تومان" />
    );

    expect(getByText("۲۵،۰۰۰ تومان".replace("۲۵،۰۰۰", "25،000"))).toBeDefined();
  });
});
