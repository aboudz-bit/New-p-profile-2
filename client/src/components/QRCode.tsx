/** Client-side QR rendering (lightweight, no server image generation). */
import { QRCodeSVG } from "qrcode.react";

export function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-white p-3">
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  );
}
