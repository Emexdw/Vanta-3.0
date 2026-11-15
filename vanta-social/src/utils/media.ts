// Comprime una imagen antes de subirla (máx. 1600 px, JPEG).
export function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(objectUrl);
      if (!ctx) return reject(new Error('No se pudo procesar la imagen'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('El archivo no es una imagen válida'));
    };
    img.src = objectUrl;
  });
}

export function getVideoDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const finish = (text: string) => {
      URL.revokeObjectURL(url);
      resolve(text);
    };
    const timer = window.setTimeout(() => finish('0:15'), 5000);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const total = Math.max(1, Math.round(video.duration || 15));
      finish(`${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish('0:15');
    };
    video.src = url;
  });
}

// Captura un fotograma del video para usarlo como miniatura. Devuelve null si el navegador no puede.
export function captureVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const finish = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const timer = window.setTimeout(() => finish(null), 6000);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      window.clearTimeout(timer);
      const scale = Math.min(1, 720 / Math.max(video.videoWidth || 720, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((video.videoWidth || 720) * scale);
      canvas.height = Math.round((video.videoHeight || 1280) * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return finish(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.8);
    };
    video.src = url;
  });
}
