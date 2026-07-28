// api/soccer365/[...path].js

export default async function handler(req, res) {
  // CORS заголовки для ответа
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Получаем путь из запроса
  const path = req.query.path?.join('/') || '';
  const targetUrl = `https://soccer365.ru/${path}`;

  console.log('[Proxy] Target URL:', targetUrl);

  try {
    const response = await fetch(targetUrl, {
      headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://soccer365.ru/',
          'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error('[Proxy] Error status:', response.status);
      return res.status(response.status).json({
        error: `Soccer365 returned ${response.status}`,
        status: response.status,
      });
    }

    const html = await response.text();
    console.log('[Proxy] HTML size:', html.length);

    // Отправляем HTML с правильными заголовками
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).send(html);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(502).json({
      error: 'Failed to fetch from Soccer365',
      message: error.message,
    });
  }
}
