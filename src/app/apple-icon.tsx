import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#151714",
          color: "#f6f5f1",
          fontSize: 108,
          fontWeight: 700,
          letterSpacing: -5,
          position: "relative",
        }}
      >
        W
        <div
          style={{
            position: "absolute",
            right: 34,
            bottom: 38,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: "#4fb286",
          }}
        />
      </div>
    ),
    size,
  )
}
