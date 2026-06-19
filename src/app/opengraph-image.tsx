import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site";

export const runtime = "edge";
export const alt = `${SITE_NAME} — AI UGC Ad & Video Generator`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #0ea5e9 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
            }}
          >
            AI UGC Ad & Video Generator
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.4,
              opacity: 0.92,
              maxWidth: "820px",
            }}
          >
            Create short-form videos, UGC ads, and social content for marketing teams.
          </div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.85 }}>litemoov.com</div>
      </div>
    ),
    size,
  );
}
