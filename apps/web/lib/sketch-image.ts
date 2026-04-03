/**
 * Sketch Image Import — load an image onto the sketch plane for tracing.
 */

export interface SketchImage {
  id: string;
  /** Data URL of the imported image */
  dataUrl: string;
  /** Position on sketch plane */
  x: number;
  z: number;
  /** Size on sketch plane */
  width: number;
  height: number;
  /** Opacity for tracing (0-1) */
  opacity: number;
  /** Whether the image is locked (can't be moved) */
  locked: boolean;
}

let imgCounter = 0;

export function createSketchImage(
  dataUrl: string,
  x: number = 0,
  z: number = 0,
  width: number = 5,
  height: number = 5
): SketchImage {
  return {
    id: `simg_${++imgCounter}_${Date.now()}`,
    dataUrl,
    x, z,
    width, height,
    opacity: 0.5,
    locked: false,
  };
}

/** Load an image file and convert to data URL */
export function loadImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Resize image to fit within max dimensions while maintaining aspect ratio */
export function fitImageToPlane(
  imgWidth: number,
  imgHeight: number,
  maxSize: number = 5
): { width: number; height: number } {
  const aspect = imgWidth / imgHeight;
  if (aspect > 1) {
    return { width: maxSize, height: maxSize / aspect };
  }
  return { width: maxSize * aspect, height: maxSize };
}
