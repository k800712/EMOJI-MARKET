/**
 * 이미지 URL을 받아 Blob 데이터를 수집한 뒤 ClipboardItem API를 사용하여 클립보드에 바이너리 파일 형식으로 씁니다.
 * 구형 브라우저 또는 미지원 환경의 경우 텍스트 복사 폴백(Fallback)을 수행합니다.
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    // 1. 이미지 Fetch 처리 (CORS 방지용 익명 자격 증명 설정)
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit'
    })
    const blob = await response.blob()

    // 2. ClipboardItem API를 이용해 클립보드 직접 쓰기
    if (navigator.clipboard && window.ClipboardItem) {
      // 이미지의 MIME 타입이 PNG 형태인지 확인 및 세팅
      const imageBlob = blob.type.startsWith('image/png')
        ? blob
        : new Blob([blob], { type: 'image/png' })

      await navigator.clipboard.write([
        new ClipboardItem({
          [imageBlob.type]: imageBlob
        })
      ])
      return true
    } else {
      throw new Error('ClipboardItem API not supported')
    }
  } catch (err) {
    console.warn('Direct ClipboardItem copy failed, falling back to absolute URL text copy:', err)
    
    // 3. Fallback: 이미지 절대 경로 주소 텍스트 복사 처리
    try {
      const absoluteUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : window.location.origin + imageUrl
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(absoluteUrl)
        return true
      }
    } catch (textErr) {
      console.error('All clipboard copy methods failed:', textErr)
    }
    return false
  }
}
