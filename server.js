const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const PLAYBOOK_B64 = fs.readFileSync(path.join(__dirname, 'VIVID_Master_Scope_Playbook.pdf')).toString('base64');
const RULES_B64 = fs.readFileSync(path.join(__dirname, 'VIVID_Universal_Project_Rules.pdf')).toString('base64');

console.log('VIVID server v4 started. Reference docs loaded.');

const SYSTEM_PROMPT = `You are the VIVID Construction Group preconstruction analysis AI. Analyze all provided documents and produce ONLY a single valid JSON object matching schema v4.0. No markdown, no backticks, no explanation — only raw JSON.

OUTPUT THIS EXACT SCHEMA — populate every field from the documents. Use "Not specified" or 0 for unknown values, never omit keys.

{
  "schema_version": "4.0",
  "generated_by": "VIVID Preconstruction Analyzer",

  "plain_english_summary": {
    "project_name": "string",
    "project_type": "string (e.g., Ground-Up Hotel, QSR Drive-Thru, Mixed-Use)",
    "narrative": "string (2-3 paragraph summary of the project, key features, and major complexities)",
    "critical_rfi_summary": ["string (plain-language summary of each critical RFI)"]
  },

  "project_identity": {
    "project_name": "string",
    "project_slug": "string (lowercase-hyphenated, e.g., hawaiian-bros-128 — used for URLs and storage keys)",
    "project_address": "string",
    "owner_name": "string",
    "architect_name": "string",
    "building_type": "string (e.g., Ground-Up Hotel, QSR Drive-Thru, Mixed-Use)",
    "construction_type": "string (e.g., Type V-A, Type II-B)",
    "stories": 0,
    "gross_sf": 0,
    "key_or_unit_count": 0,
    "structural_system": "string",
    "foundation_type": "string",
    "exterior_envelope_summary": "string",
    "roofing_system": "string",
    "hvac_system_summary": "string",
    "fire_suppression": "string (NFPA 13 / NFPA 13R / None)",
    "elevator": false,
    "seismic_category": "string",
    "wind_speed": "string",
    "permit_status": "string",
    "planning_conditions": ["string (each condition from approval letter that affects scope or cost)"],
    "specified_materials": [
      { "item": "string", "spec": "string", "source_sheet": "string" }
    ]
  },

  "brand_research": {
    "brand_identified": false,
    "brand_name": "string",
    "brand_segment": "string (hotel / restaurant / retail / mixed-use / other)",
    "prototype_version": "string",
    "primary_color": "string (hex)",
    "secondary_color": "string (hex)",
    "accent_color": "string (hex)",
    "official_font": "string",
    "brand_tagline": "string",
    "target_demographic": "string",
    "design_philosophy": "string",
    "hero_image_prompt": "string (detailed AI image generation prompt for the proposal hero)",
    "website_heading_font": "string (Google Font for headings)",
    "website_body_font": "string (Google Font for body)",
    "website_bg_color": "string (hex)",
    "website_accent_color": "string (hex)",
    "proposal_bg_color": "string (hex — dark background)",
    "proposal_accent_color": "string (hex — warm accent)"
  },

  "critical_rfis": [
    {
      "rfi_number": "string (e.g., RFI-001)",
      "priority": "string (Critical / High / Medium / Low)",
      "trade_affected": "string",
      "question": "string",
      "cost_impact_range": "string",
      "source_sheet": "string",
      "directed_to": "string (Architect / Structural / MEP / Owner / Civil)",
      "status": "Open",
      "owner_framing": "string (proactive, positive language for presenting this RFI to the owner)"
    }
  ],

  "cost_model": {
    "total_rom": 0,
    "cost_per_sf": 0,
    "specified_total": 0,
    "allowance_total": 0,
    "plug_total": 0,
    "divisions": [
      {
        "division": "string (e.g., Div 01)",
        "name": "string (e.g., General Conditions)",
        "total": 0,
        "basis": "string (Specified / Allowance / Plug / Mixed)",
        "has_allowances": false,
        "line_items": [
          {
            "description": "string",
            "qty": 0,
            "unit": "string (SF / LF / LS / EA / CY)",
            "unit_cost": 0,
            "total": 0,
            "basis": "string (Specified / Allowance / Plug)",
            "source_sheet": "string",
            "notes": "string"
          }
        ]
      }
    ],
    "scenarios": {
      "best_case": 0,
      "most_likely": 0,
      "full_contingency": 0
    }
  },

  "finish_spec_matrix": [
    {
      "zone": "string (e.g., Lobby, Guestroom, BOH)",
      "item": "string (e.g., Flooring, Wall Finish, Ceiling)",
      "specified_product": "string (product name or 'Allowance')",
      "status": "string (Specified / Partial / Allowance)",
      "allowance_range": "string (e.g., $8-$12/SF)",
      "source_sheet": "string"
    }
  ],

  "procurement_priorities": [
    {
      "item": "string",
      "reason": "string",
      "action": "string",
      "lead_time": "string (e.g., 16-24 weeks)",
      "order_by_date": "string (YYYY-MM-DD)",
      "vivid_hard_stop": false
    }
  ],

  "gantt_logic": {
    "total_duration_weeks": 0,
    "ntp_date": "string (YYYY-MM-DD)",
    "substantial_completion": "string (YYYY-MM-DD)",
    "grand_opening": "string (YYYY-MM-DD)",
    "tasks": [
      {
        "id": 0,
        "phase_id": "string (01-11)",
        "text": "string",
        "start_date": "string (YYYY-MM-DD)",
        "duration": 0,
        "parent": 0,
        "type": "string (task / project / milestone)",
        "open": true,
        "vivid_hard_stop": false,
        "subcontractor": "string",
        "drawing_reference": "string"
      }
    ],
    "links": [
      { "id": 0, "source": 0, "target": 0, "type": "0" }
    ],
    "milestones": [
      { "name": "string", "week": 0, "date": "string (YYYY-MM-DD)" }
    ]
  },

  "takeoff_packages": [
    {
      "id": "string (e.g., pkg-site)",
      "order": 0,
      "division": "string (e.g., DIV 31)",
      "name": "string (e.g., Site Work & Demolition)",
      "color": "string (hex)",
      "groups": [
        {
          "type": "string (AREA / LINEAR / COUNT / VOLUME)",
          "items": [
            {
              "id": "string (e.g., s-a1)",
              "linked_gantt_id": 0,
              "name": "string",
              "unit": "string (SF / LF / CY / EA / LS)",
              "sourceSheet": "string",
              "notes": "string"
            }
          ]
        }
      ]
    }
  ],

  "proposal": {
    "headline": "string (compelling one-liner for owner audience)",
    "subheadline": "string",
    "vivid_approach": [
      { "title": "string", "description": "string" }
    ],
    "why_vivid": [
      { "differentiator": "string", "description": "string" }
    ],
    "schedule_summary": {
      "total_weeks": 0,
      "phases": [
        { "name": "string", "duration_weeks": 0, "start_week": 0 }
      ]
    },
    "cost_summary": {
      "rom_range_low": 0,
      "rom_range_high": 0,
      "cost_per_sf_low": 0,
      "cost_per_sf_high": 0,
      "disclaimer": "string"
    },
    "owner_rfis": [
      {
        "rfi_number": "string",
        "item": "string",
        "why_it_matters": "string (owner-friendly explanation)",
        "cost_impact": "string"
      }
    ]
  },

  "scope_gaps": [
    {
      "gap": "string",
      "trades_involved": "string",
      "recommendation": "string"
    }
  ]
}

RULES:
- Output ONLY raw JSON. No markdown fences, no explanation text.
- takeoff_packages must be ordered by construction sequence.
- Every gantt task must have phase_id 01-11.
- Every takeoff item must have a linked_gantt_id.
- brand_research: research the brand from your training data. Set brand_identified to true if you recognize it.
- cost_model: generate ROM estimates based on project type, size, location, and your construction cost knowledge.
- procurement_priorities: flag any item with lead time over 12 weeks as vivid_hard_stop: true.
- proposal: write in confident, owner-facing language. This goes directly to the client.
- scope_gaps: identify any trade handoff ambiguities or missing scope items from the drawings.`;

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
    res.end(JSON.stringify({ status: 'ok', service: 'VIVID relay', schema_version: '4.0' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/analyze') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); }
      catch (e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Invalid JSON'})); return; }

      const { planDocs, activePlanCount } = payload;

      const anthropicBody = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            ...planDocs,
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: PLAYBOOK_B64 }, title: 'VIVID Master Scope Playbook' },
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: RULES_B64 }, title: 'VIVID Universal Project Rules' },
            { type: 'text', text: 'Analyze all ' + (activePlanCount + 2) + ' documents and generate the VIVID v4 master preconstruction JSON. Output only raw JSON.' }
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
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, {'Content-Type':'application/json'});
          res.end(rb);
        });
      });
      proxyReq.on('error', err => {
        res.writeHead(502, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Anthropic unreachable', detail:err.message}));
      });
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
      if (!_webhookUrl || !_data) {
        res.writeHead(400, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Missing fields'}));
        return;
      }

      let parsedUrl;
      try { parsedUrl = new URL(_webhookUrl); }
      catch (e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Invalid URL'})); return; }

      if (!parsedUrl.hostname.endsWith('make.com')) {
        res.writeHead(403, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Only make.com allowed'}));
        return;
      }

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
        proxyRes.on('end', () => {
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify({success:true, makeStatus:proxyRes.statusCode}));
        });
      });
      proxyReq.on('error', err => {
        res.writeHead(502, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Make.com unreachable', detail:err.message}));
      });
      proxyReq.write(outBody);
      proxyReq.end();
    });
    return;
  }

  res.writeHead(404, {'Content-Type':'application/json'});
  res.end(JSON.stringify({error:'Not found'}));
});

server.listen(PORT, () => console.log('VIVID v4 server running on port ' + PORT));
