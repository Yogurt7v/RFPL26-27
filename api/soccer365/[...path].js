
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const path = (req.query.path)?.join('/') ?? ''
  const targetUrl = `https://soccer365.ru/${path}`

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://soccer365.ru/',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `Soccer365 returned ${response.status}` })
    }

    const html = await response.text()

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).send(html)
  } catch (error) {
    console.error('Soccer365 proxy error:', error)
    return res.status(502).json({ error: 'Failed to fetch from Soccer365' })
  }
}
