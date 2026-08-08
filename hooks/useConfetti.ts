import confetti from 'canvas-confetti'

const colors = ['#FFD1DC', '#BFFCC6', '#FFC6FF', '#9BF6FF', '#FDFFB6']

export function useConfetti() {
  const triggerGrandCannon = () => {
    if (typeof window === 'undefined') return

    const duration = 2 * 1000 // 2초간 쏘기
    const end = Date.now() + duration

    const frame = () => {
      // 좌측 캐논
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.95 },
        colors: colors
      })
      // 우측 캐논
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.95 },
        colors: colors
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  const triggerMicroSparkle = (x: number, y: number) => {
    if (typeof window === 'undefined') return

    // 픽셀 좌표를 canvas-confetti 가 사용하는 0.0 ~ 1.0 비율 좌표로 변환
    const width = window.innerWidth
    const height = window.innerHeight
    const ratioX = x / width
    const ratioY = y / height

    confetti({
      particleCount: 15,
      spread: 80,
      startVelocity: 12,
      origin: { x: ratioX, y: ratioY },
      colors: ['#FFD700', '#FF69B4', '#1E90FF', '#32CD32', '#FF4500'],
      ticks: 40 // 입자가 빨리 흩어지고 사라지도록 ticks 축소 (메모리 및 렌더링 성능 최적화)
    })
  }

  return {
    triggerGrandCannon,
    triggerMicroSparkle
  }
}
