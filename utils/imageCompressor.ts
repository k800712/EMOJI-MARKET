// utils/imageCompressor.ts

export const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    // 이미지 파일이 아니면 그대로 반환
    if (!file.type.match('image.*')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // 최대 가로폭 기준 종횡비 리사이징
        if (width > maxWidth) {
          height = (maxWidth * height) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)

        // PNG/JPEG 압축 후 Blob 반환 (기본 jpeg, 75% 퀄리티)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              resolve(file) // 압축 실패 시 차선책으로 원본 반환
            }
          },
          "image/jpeg",
          quality
        );
      }
      img.onerror = () => {
        resolve(file) // 이미지 로드 에러 시 원본 반환
      }
    }
    reader.onerror = () => {
      resolve(file) // 리더 에러 시 원본 반환
    }
  })
}
