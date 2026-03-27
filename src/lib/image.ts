export async function compressFileToDataUrl(file: File, maxWidth = 1600, quality = 0.75): Promise<string | null> {
  if (!file) return null;
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = img.width / img.height;
      const targetWidth = Math.min(maxWidth, img.width);
      const targetHeight = Math.round(targetWidth / ratio);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      // prefer jpeg for smaller size, fall back to png if original was png with transparency
      const isPng = file.type === 'image/png';
      const mime = isPng ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, quality);
      resolve(dataUrl);
    };
    img.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
