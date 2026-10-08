declare module 'jsqr' {
  export interface QRCodePoint {
    x: number;
    y: number;
  }

  export interface QRCode {
    binaryData: number[];
    data: string;
    chunks: unknown[];
    version: number;
    location: {
      topRightCorner: QRCodePoint;
      topLeftCorner: QRCodePoint;
      bottomRightCorner: QRCodePoint;
      bottomLeftCorner: QRCodePoint;
      topRightFinderPattern: QRCodePoint;
      topLeftFinderPattern: QRCodePoint;
      bottomLeftFinderPattern: QRCodePoint;
      bottomRightAlignmentPattern?: QRCodePoint;
    };
  }

  export interface Options {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options
  ): QRCode | null;
}
