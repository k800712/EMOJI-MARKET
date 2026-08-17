// utils/imageCompressor.ts

// 💡 모바일 브라우저 OOM 크래시를 완전히 막아주는 골드 스탠다드 메모리 해제 헬퍼 함수
export function compressMobileImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // 1. 메모리를 물리적으로 직접 가리키는 오브젝트 URL 생성 (Base64 변환 금지!)
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // 2. 이미지가 로드되는 즉시 원본 파일이 차지하는 오브젝트 URL 메모리 강제 반환 (OOM 원천 방어)
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // 3. 모바일 브라우저 사양을 고려하여 해상도를 최대 800px로 엄격하게 제약
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
        resolve(file); // 예외 상황 시 원본 반환
        return;
      }

      // 4. 고품질 리사이징 옵션 활성화
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // 5. Blob 변환 후 최종 경량 파일 객체 생성 (JPEG 퀄리티 70%로 다이어트)
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
  });
}

// 기존 compressImage도 OOM 방지 및 메모리 누수 방지 아키텍처로 전면 개선
export const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    if (!file.type.match('image.*')) {
      resolve(file)
      return
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
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
  })
}
