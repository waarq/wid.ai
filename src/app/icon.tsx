import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

// Image generation has no access to CSS variables, so the brand colors are
// literal here: tinted near-black, warm off-white and the emerald accent.
export default function Icon() {
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
          borderRadius: 7,
          color: "#f6f5f1",
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: -1,
          position: "relative",
        }}
      >
        W
        <div
          style={{
            position: "absolute",
            right: 5,
            bottom: 6,
            width: 5,
            height: 5,
            borderRadius: 3,
            background: "#4fb286",
          }}
        />
      </div>
    ),
    size,
  )
}
