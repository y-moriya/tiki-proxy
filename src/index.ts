import { Hono } from 'hono'

const app = new Hono()

app.all('*', async (c) => {
  const reqUrl = new URL(c.req.url)
  const proxyOrigin = reqUrl.origin
  const proxyTarget = 'http://fire-emblem-matome.com'
  const target = new URL(proxyTarget)
  
  reqUrl.protocol = target.protocol
  reqUrl.hostname = target.hostname
  reqUrl.port = target.port

  const newRequest = new Request(reqUrl, c.req.raw)

  try {
    const response = await fetch(newRequest)
    const headers = new Headers(response.headers)
    
    // Check if the content is HTML
    const contentType = headers.get('Content-Type') || ''
    if (contentType.includes('text/html')) {
      let bodyText = await response.text()
      
      // Replace original domain with proxy domain
      const regex = /https?:\/\/fire-emblem-matome\.com/gi
      bodyText = bodyText.replace(regex, proxyOrigin)

      // Remove headers that will be invalid due to body modification
      headers.delete('Content-Length')
      headers.delete('Content-Encoding') // fetch auto-decompresses, so we are sending raw text

      return new Response(bodyText, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      })
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    })
  } catch (error) {
    console.error('Proxy Fetch Error:', error)
    return c.text('Proxy Error', 500)
  }
})

export default app
