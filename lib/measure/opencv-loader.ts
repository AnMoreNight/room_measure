import cvModule from "@techstark/opencv-js";
import sharp from "sharp";

type CvModule = typeof cvModule;
type CvModuleLoose = CvModule & {
  Mat?: unknown;
  onRuntimeInitialized?: () => void;
};

let readyPromise: Promise<CvModule> | null = null;

/**
 * Resolves once the OpenCV.js WASM runtime has finished initializing.
 *
 * This package's default export takes one of three shapes depending on
 * version/environment (all three are handled per the package's own
 * documented init pattern):
 *   1. A Promise that resolves to the ready module (what we actually get
 *      here — easy to miss, since a Promise also happens to support
 *      arbitrarily assigning an `onRuntimeInitialized` property without
 *      error, which looks like case 3 below but never fires).
 *   2. The module object, already fully initialized (`.Mat` present).
 *   3. The module object, not yet initialized — wait for it to call back
 *      via `onRuntimeInitialized`.
 */
export function loadOpenCv(): Promise<CvModule> {
  if (!readyPromise) {
    const mod = cvModule as unknown as CvModuleLoose & { then?: unknown };
    if (typeof mod.then === "function") {
      readyPromise = cvModule as unknown as Promise<CvModule>;
    } else if (mod.Mat) {
      readyPromise = Promise.resolve(cvModule);
    } else {
      readyPromise = new Promise((resolve) => {
        mod.onRuntimeInitialized = () => resolve(cvModule);
      });
    }
  }
  return readyPromise;
}

/**
 * Decodes an image buffer into a 4-channel (RGBA) cv.Mat. Caller must .delete() it.
 *
 * `.rotate()` applies the photo's own EXIF orientation first — phone photos
 * routinely store pixels in a landscape layout with an EXIF tag saying to
 * rotate 90° for display (confirmed on every real test photo in Photo02/).
 * Without this, the Mat used for the final annotated/displayed image would
 * be sideways relative to what the photo actually shows.
 */
export async function decodeToMat(buffer: Buffer) {
  const cv = await loadOpenCv();
  const { data, info } = await sharp(buffer)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return cv.matFromArray(info.height, info.width, cv.CV_8UC4, data);
}
