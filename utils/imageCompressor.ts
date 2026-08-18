// utils/imageCompressor.ts

// 💡 모바일 브라우저 OOM 크래시를 완전히 막아주는 골드 스탠다드 메모리 해제 헬퍼 함수 (SSR-Safe 버전)
export function compressMobileImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // 1. 서버 사이드 렌더링(SSR) 시 안전하게 가드하여 빌드 붕괴 차단
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(file);
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image(); // 명시적으로 window 객체 참조

      img.onload = () => {
        // 이미지가 로드되는 즉시 원본 파일이 차지하는 오브젝트 URL 메모리 강제 반환 (OOM 원천 방어)
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.7);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('이미지 로드에 실패했습니다.'));
      };

      img.src = objectUrl;
    } catch (e) {
      // 어떤 돌발 브라우저 에러가 나도 앱이 죽지 않고 원본 파일로 복구
      resolve(file);
    }
  });
}

// 기존 compressImage도 SSR 가드 및 메모리 누수 방지 아키텍처로 개선
export const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    // 1. 서버 사이드 렌더링(SSR) 시 안전하게 가드
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(file);
      return;
    }

    if (!file.type.match('image.*')) {
      resolve(file)
      return
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.src = objectUrl;

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (maxWidth * height) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height)
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          quality
        );
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file)
      }
    } catch (e) {
      resolve(file);
    }
  })
}
