const MAX_DATA_URL_LENGTH = 258000; // Safely below 260,000 chars rule limit

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh. Vui lòng thử ảnh khác.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng ảnh không hợp lệ.'));
      img.onload = () => resolve(img);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function compressCanvasToDataUrl(sourceCanvas: HTMLCanvasElement): string {
  const work = document.createElement('canvas');
  const ctx = work.getContext('2d');
  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  }

  let maxDim = 1280;
  let quality = 0.82;

  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, maxDim / Math.max(sourceCanvas.width, sourceCanvas.height));
    const targetW = Math.max(120, Math.round(sourceCanvas.width * scale));
    const targetH = Math.max(120, Math.round(sourceCanvas.height * scale));

    work.width = targetW;
    work.height = targetH;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);

    const dataUrl = work.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
      return dataUrl;
    }

    if (quality > 0.45) {
      quality = Number((quality - 0.12).toFixed(2));
    } else {
      maxDim = Math.round(maxDim * 0.78);
      quality = 0.7;
    }
  }

  throw new Error('Ảnh quá lớn không thể nén dưới 260.000 ký tự. Vui lòng chụp lại gọn hơn.');
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn đúng tệp hình ảnh (JPG, PNG, WEBP...).');
  }

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.drawImage(img, 0, 0);

  return compressCanvasToDataUrl(canvas);
}
