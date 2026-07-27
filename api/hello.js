// api/hello.js
export default function handler(req, res) {
  res.status(200).json({
    message: 'API работает!',
    timestamp: new Date().toISOString()
  })
}
