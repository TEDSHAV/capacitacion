import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// A revision helps Serwist version a precached page. This avoids outdated
// precached responses being used. Using `git rev-parse HEAD` might not be the
// most efficient way, but it's good enough for our purposes.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });
