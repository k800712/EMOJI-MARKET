self.addEventListener('push', function(event) {
  let data = { title: '식빵이 이모지 완공! 🍞', body: '생성하신 이모티콘 8종 세트가 모두 구워졌습니다!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '식빵이 이모지 완공! 🍞', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || '생성하신 이모티콘 8종 세트가 모두 구워졌습니다!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '식빵이 이모지 완공! 🍞', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 이미 열려있는 창이 있으면 포커스
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // localhost 나 본 웹앱 호스트에 일치하는 윈도우가 있는지 체크
        const url = new URL(client.url);
        if ((url.pathname === '/' || url.pathname === '/market') && 'focus' in client) {
          return client.focus();
        }
      }
      // 열려있는 창이 없으면 새로 열어 보관함으로 이동
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
