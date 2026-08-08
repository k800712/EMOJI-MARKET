const lastAlertTimes = new Map<string, number>()

export interface AlertPayload {
  title: string
  level: 'info' | 'warning' | 'danger'
  message: string
  metadata?: Record<string, any>
}

/**
 * 시스템 내 중대 이벤트 발생 시 슬랙 또는 디스코드로 리치 알림을 전송하는 어드민 경보 헬러입니다.
 * 동일 경보에 대해 5분 이메모리 디바운싱(스로틀링)을 자동으로 수행합니다.
 */
export async function sendAdminAlert({ title, level, message, metadata }: AlertPayload): Promise<void> {
  const webhookUrl = process.env.ADMIN_WEBHOOK_URL

  // 1. 보안 가드: 웹훅 URL이 없거나 유출되지 않은 경우 생략 (무장애 안전성 확보)
  if (!webhookUrl) {
    console.warn(`[Admin Alert Warning] Webhook URL is missing. Alert omitted: [${level.toUpperCase()}] ${title} - ${message}`)
    return
  }

  // 2. 웹훅 스패밍 방지 (5분 이격 디바운스 계산)
  const cacheKey = `${level}_${title}`
  const now = Date.now()
  const lastTime = lastAlertTimes.get(cacheKey)

  if (lastTime && now - lastTime < 5 * 60 * 1000) {
    console.log(`[Admin Alert Throttled] Same alert skipped (5-min window): ${cacheKey}`)
    return
  }

  // 캐시 타임스탬프 갱신
  lastAlertTimes.set(cacheKey, now)

  try {
    // 3. Discord Rich Embeds 규격 컬러 매핑
    let color = 32895 // 'info' 파란색 (#0080FF)
    if (level === 'danger') color = 16731469 // 빨간색 (#FF4D4D)
    else if (level === 'warning') color = 16753920 // 주황색 (#FFA500)

    // metadata 평탄화 및 fields 매핑
    const fields = []
    if (metadata) {
      for (const [key, val] of Object.entries(metadata)) {
        fields.push({
          name: key,
          value: typeof val === 'object' ? JSON.stringify(val).substring(0, 1000) : String(val).substring(0, 1000),
          inline: true
        })
      }
    }

    fields.push({
      name: '발생 시각 (UTC)',
      value: new Date().toISOString(),
      inline: false
    })

    const payload = {
      embeds: [
        {
          title: `🚨 [${level.toUpperCase()}] ${title}`,
          description: message,
          color: color,
          fields: fields.slice(0, 25)
        }
      ]
    }

    // 4. API 전송
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error(`[Admin Webhook Error] Webhook responded with status: ${response.status}`)
    }

  } catch (err) {
    console.error('[Admin Webhook Error] Exception in sendAdminAlert:', err)
  }
}
