const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const PLAYBOOK_B64 = fs.readFileSync(path.join(__dirname, 'VIVID_Master_Scope_Playbook.pdf')).toString('base64');
const RULES_B64 = fs.readFileSync(path.join(__dirname, 'VIVID_Universal_Project_Rules.pdf')).toString('base64');

console.log('VIVID server started. Reference docs loaded.');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'VIVID relay' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/analyze') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); }
      catch (e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Invalid JSON'})); return; }

      const { planDocs, activePlanCount, systemPrompt } = payload;

      const anthropicBody = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            ...planDocs,
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: PLAYBOOK_B64 }, title: 'VIVID Master Scope Playbook' },
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: RULES_B64 }, title: 'VIVID Universal Project Rules' },
            { type: 'text', text: 'Analyze all ' + (activePlanCount + 2) + ' documents and generate the VIVID master preconstruction JSON.' }
          ]
        }]
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(anthropicBody),
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        let rb = '';
        proxyRes.on('data', chunk => rb += chunk.toString());
        proxyRes.on('end', () => { res.writeHead(proxyRes.statusCode, {'Content-Type':'application/json'}); res.end(rb); });
      });
      proxyReq.on('error', err => { res.writeHead(502, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Anthropic unreachable', detail:err.message})); });
      proxyReq.write(anthropicBody);
      proxyReq.end();
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/relay') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); }
      catch (e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Invalid JSON'})); return; }

      const { _webhookUrl, _data } = payload;
      if (!_webhookUrl || !_data) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Missing fields'})); return; }

      let parsedUrl;
      try { parsedUrl = new URL(_webhookUrl); }
      catch (e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Invalid URL'})); return; }

      if (!parsedUrl.hostname.endsWith('make.com')) { res.writeHead(403, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Only make.com allowed'})); return; }

      const outBody = JSON.stringify(_data);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(outBody) }
      };

      const proxyReq = https.request(options, proxyRes => {
        let rb = '';
        proxyRes.on('data', chunk => rb += chunk.toString());
        proxyRes.on('end', () => { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({success:true, makeStatus:proxyRes.statusCode})); });
      });
      proxyReq.on('error', err => { res.writeHead(502, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Make.com unreachable', detail:err.message})); });
      proxyReq.write(outBody);
      proxyReq.end();
    });
    return;
  }

  res.writeHead(404, {'Content-Type':'application/json'});
  res.end(JSON.stringify({error:'Not found'}));
});

server.listen(PORT, () => console.log('VIVID server running on port ' + PORT));
