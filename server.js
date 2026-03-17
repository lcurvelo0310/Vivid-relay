const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/relay') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const webhookUrl = payload._webhookUrl;
      const data = payload._data;

      if (!webhookUrl || !data) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing _webhookUrl or _data' }));
        return;
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(webhookUrl);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid webhook URL' }));
        return;
      }

      if (!parsedUrl.hostname.endsWith('make.com')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only make.com webhooks are allowed' }));
        return;
      }

      const outBody = JSON.stringify(data);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(outBody)
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        let responseBody = '';
        proxyRes.on('data', chunk => responseBody += chunk.toString());
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            makeStatus: proxyRes.statusCode,
            makeResponse: responseBody
          }));
        });
      });

      proxyReq.on('error', err => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to reach Make.com', detail: err.message }));
      });

      proxyReq.write(outBody);
      proxyReq.end();
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'VIVID relay' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`VIVID relay server running on port ${PORT}`);
});
