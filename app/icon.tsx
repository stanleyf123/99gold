import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
          background: "#15282d",
          color: "#f1d48d",
          fontSize: 196,
          fontWeight: 700,
        }}
      >
        99
      </div>
    ),
    { ...size },
  );
}
