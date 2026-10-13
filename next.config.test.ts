import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "./next.config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sandbox API proxy", () => {
  it("keeps the local browser API same-origin with the local backend", async () => {
    vi.stubEnv("BACKEND_URL", "http://localhost:8080");

    expect(await nextConfig.rewrites?.()).toEqual([
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8080/api/v1/:path*",
      },
    ]);
  });

  it("preserves configured backend routing for non-sandbox runs", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.example.test");

    expect(await nextConfig.rewrites?.()).toEqual([
      {
        source: "/api/v1/:path*",
        destination: "https://backend.example.test/api/v1/:path*",
      },
    ]);
  });
});
