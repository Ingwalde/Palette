// Turn an uploaded image file into a small square avatar data URL, entirely on the client — the
// backend stores the result as a data: URL (there is no object storage on the deploy target), so
// downscaling here keeps that string small. Centre-crops to a square, then draws it at `size`px.

const AVATAR_SIZE = 128;

// The formats a browser <canvas> can actually decode here. iPhones hand back HEIC/HEIF, which
// nothing outside Safari decodes; the backend also only accepts PNG/JPEG/WebP/GIF.
const SUPPORTED_TYPE = /^image\/(png|jpe?g|webp|gif)$/i;

export function fileToAvatarDataUrl(file: File, size = AVATAR_SIZE): Promise<string> {
  // Reject unusable files up front with a message that says what to do — otherwise HEIC surfaces
  // only as a late, opaque "image could not be read" from the decoder, which read to the user as a
  // generic failure.
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    return Promise.reject(
      new Error("HEIC photos aren't supported here — choose a JPEG or PNG."),
    );
  }
  if (file.type && !SUPPORTED_TYPE.test(file.type)) {
    return Promise.reject(new Error("Choose a PNG, JPEG, WebP or GIF image."));
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is not available");
        // Centre-crop the source to a square before scaling, so the avatar is not distorted.
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Could not process the image"));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That file could not be read as an image"));
    };
    image.src = objectUrl;
  });
}
