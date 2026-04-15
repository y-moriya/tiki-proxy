import { Hono } from 'hono'

const app = new Hono()

app.get('/test-httpbin', async (c) => {
  const proxyTarget = 'http://httpbin.org/headers'
  const newHeaders = new Headers(c.req.raw.headers)
  newHeaders.delete('host')
  newHeaders.delete('x-forwarded-host')
  newHeaders.delete('x-forwarded-for')
  newHeaders.delete('x-forwarded-proto')
  newHeaders.delete('x-forwarded-server')
  newHeaders.delete('x-real-ip')
  newHeaders.set('host', 'httpbin.org')
  newHeaders.set('x-forwarded-host', 'httpbin.org')
  newHeaders.set('x-forwarded-server', 'httpbin.org')

  try {
    const res = await fetch(proxyTarget, { headers: newHeaders });
    return c.text(await res.text());
  } catch (e: any) {
    return c.text("Error: " + e.message);
  }
})

app.all('*', async (c) => {
  const reqUrl = new URL(c.req.url)
  const proxyOrigin = reqUrl.origin
  const proxyTarget = 'http://fire-emblem-matome.com'
  const target = new URL(proxyTarget)
  
  reqUrl.protocol = target.protocol
  reqUrl.hostname = target.hostname
  reqUrl.port = target.port

  const newHeaders = new Headers(c.req.raw.headers)
  newHeaders.delete('host')
  newHeaders.delete('x-forwarded-host')
  newHeaders.delete('x-forwarded-for')
  newHeaders.delete('x-forwarded-proto')
  newHeaders.delete('x-forwarded-server')
  newHeaders.delete('x-real-ip')
  newHeaders.set('host', target.hostname)
  newHeaders.set('x-forwarded-host', target.hostname)
  newHeaders.set('x-forwarded-server', target.hostname)

  const newRequest = new Request(reqUrl, {
    method: c.req.raw.method,
    headers: newHeaders,
    body: ['GET', 'HEAD'].includes(c.req.raw.method) ? undefined : c.req.raw.body,
  })

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

Deno.serve({ port: 8001 }, app.fetch)
