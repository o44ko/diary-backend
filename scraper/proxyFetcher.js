const axios = require('axios');

// Список бесплатных прокси-листов
async function getFreshProxy() {
  try {
    // Пробуем получить список прокси
    const res = await axios.get('https://proxylist.geonode.com/api/proxy-list?limit=20&page=1&sort_by=lastChecked&sort_type=desc&country=BY,RU&protocols=http,https', {
      timeout: 10000
    });
    
    const proxies = res.data?.data || [];
    if (proxies.length === 0) return null;
    
    // Берём первый рабочий
    for (const proxy of proxies) {
      const proxyUrl = http://${proxy.ip}:${proxy.port};
      try {
        // Проверяем что прокси работает
        await axios.get('https://schools.by', {
          proxy: { host: proxy.ip, port: parseInt(proxy.port) },
          timeout: 8000
        });
        console.log('Working proxy found:', proxyUrl);
        return proxyUrl;
      } catch {
        continue;
      }
    }
  } catch (e) {
    console.error('Proxy fetch error:', e.message);
  }
  return null;
}

module.exports = { getFreshProxy };
