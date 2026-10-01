import { ImageResponse } from "next/og"

export const alt = "WIT — AI meeting intelligence"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f6f5f1",
          color: "#151714",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
          WIT
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#2f7d5b", marginLeft: 6, marginTop: 14 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, maxWidth: 980 }}>
            Meetings are where work happens. WIT remembers what happened.
          </div>
          <div style={{ marginTop: 32, fontSize: 30, color: "#66655e" }}>AI meeting intelligence</div>
        </div>
      </div>
    ),
    size,
  )
}
