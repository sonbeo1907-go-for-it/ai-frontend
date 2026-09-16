import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "confirm", {
  configurable: true,
  value: vi.fn(() => true),
});
