// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RippleButton } from "@/components/magicui/ripple-button";
import { generateCssVariables } from "@loqme/design-tokens";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("keeps motion decorative, bounded and disposable while preserving button actions", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  vi.useFakeTimers();
  const onClick = vi.fn();
  const { container } = render(<RippleButton onClick={onClick}>Save</RippleButton>);
  const button = screen.getByRole("button", { name: "Save" });
  for (let i = 0; i < 12; i++) fireEvent.click(button, { detail: 0 });
  expect(onClick).toHaveBeenCalledTimes(12);
  expect(container.querySelectorAll(".magic-ripple")).toHaveLength(4);
  expect(container.querySelector(".magic-ripple-layer")?.getAttribute("aria-hidden")).toBe("true");
  act(() => vi.advanceTimersByTime(700));
  expect(container.querySelectorAll(".magic-ripple")).toHaveLength(0);
});
it("suppresses decorative motion for reduced-motion users without suppressing actions", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  const onClick = vi.fn();
  const { container } = render(<RippleButton onClick={onClick}>Save</RippleButton>);
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalledOnce();
  expect(container.querySelectorAll(".magic-ripple")).toHaveLength(0);
});
it("provides a white-first teal initial theme without changing classic consumers", () => {
  const light = generateCssVariables("green-deck");
  expect(light["--color-background"]).toBe("#E8F1EE");
  expect(light["--loqme-primary-600"]).toBe("#1D616A");
  expect(light["--deck-action"]).toBe("#1D616A");
  expect(light["--deck-on-primary"]).toBe("#FFFFFF");
  expect(light["--loqme-neutral-900"]).toBe("#203B3B");
  expect(generateCssVariables()["--loqme-neutral-0"]).toBe("#FFFFFF");
});
