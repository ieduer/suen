const escapeNL = s => String(s ?? "").replace(/\r\n?/g, "\n");
// ===== parsing helpers =====
    const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test((s||"").trim());
    const looksLikeJson = (s) => {
      const t = (s||"").trim();
      return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
    };
    const looksLikeBase64 = (s) => {
      const t = (s||"").trim();
      if (t.length < 16) return false;
      if (/\s/.test(t)) return false;
      return /^[A-Za-z0-9+/_-]+={0,2}$/.test(t);
    };
    const b64enc = (s) => btoa(unescape(encodeURIComponent(s)));
    const b64dec = (s) => {
      const t = s.replace(/-/g, "+").replace(/_/g, "/");
      return decodeURIComponent(escape(atob(t)));
    };
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    // ===== node naming (append IP/host suffix) =====
    function hostOnlyFromHostPort(hp){
      if (!hp) return '';
      // strip brackets for IPv6
      const x = String(hp).trim().replace(/^\[/,'').replace(/\]$/,'');
      // keep host only (remove :port)
      return x.split(':')[0];
    }

    function extractHostFromAtStyleUri(uri){
      // For vless/trojan/tuic/hysteria2/ss etc: scheme://userinfo@host:port?...#name
      try{
        const u = String(uri || '').trim();
        const at = u.indexOf('@');
        if (at === -1) return '';
        const after = u.slice(at + 1);
        const end = (()=>{
          const q = after.indexOf('?');
          const h = after.indexOf('#');
          if (q === -1 && h === -1) return after.length;
          if (q === -1) return h;
          if (h === -1) return q;
          return Math.min(q, h);
        })();
        return after.slice(0, end);
      }catch(e){
        return '';
      }
    }

    function tryAppendSuffixToHashName(uri, suffix){
      const u = String(uri || '').trim();
      if (!suffix) return u;
      const hash = u.indexOf('#');
      const base = (hash > -1) ? u.slice(0, hash) : u;
      const nameRaw = (hash > -1) ? u.slice(hash + 1) : '';
      let name = '';
      try{ name = nameRaw ? decodeURIComponent(nameRaw) : ''; }catch(e){ name = nameRaw || ''; }
      // If there is no name, keep it minimal and only add suffix as name.
      const newName = name
        ? (name.endsWith(suffix) ? name : (name + ' ' + suffix))
        : suffix;
      return base + '#' + encodeURIComponent(newName);
    }

    function tryAppendSuffixToVmess(uri, suffix){
      const u = String(uri || '').trim();
      if (!u.toLowerCase().startsWith('vmess://')) return u;
      if (!suffix) return u;
      const b64 = u.slice('vmess://'.length).trim();
      try{
        const jsonStr = b64dec(b64);
        const obj = JSON.parse(jsonStr);
        const ps = String(obj.ps || 'vmess');
        obj.ps = ps.endsWith(suffix) ? ps : (ps + ' ' + suffix);
        const outB64 = b64enc(JSON.stringify(obj));
        return 'vmess://' + outB64;
      }catch(e){
        return u;
      }
    }

    function addIpSuffixToNodeUri(uri){
      const u = String(uri || '').trim();
      if (!u) return u;
      const scheme = (u.match(/^([a-z0-9]+):\/\//i)?.[1] || '').toLowerCase();

      // vmess has name inside base64 JSON
      if (scheme === 'vmess'){
        // suffix from "add" field if possible
        try{
          const b64 = u.slice('vmess://'.length).trim();
          const jsonStr = b64dec(b64);
          const obj = JSON.parse(jsonStr);
          const host = hostOnlyFromHostPort(obj.add || '');
          const suffix = host ? ('·' + host) : '';
          return tryAppendSuffixToVmess(u, suffix);
        }catch(e){
          return u;
        }
      }

      // vless/tuic/hy2/ss/trojan etc: suffix from host after @
      const hp = extractHostFromAtStyleUri(u);
      const host = hostOnlyFromHostPort(hp);
      const suffix = host ? ('·' + host) : '';
      if (!suffix) return u;

      // Most schemes support #name
      return tryAppendSuffixToHashName(u, suffix);
    }

    function safeSplitLines(text){
      return escapeNL(text).split("\n").map(x => x.trim()).filter(Boolean);
    }

    function extractUrisFromText(text){
      const lines = safeSplitLines(text);
      const uris = [];
      for (const line of lines){
        const l = line.trim();
        if (/^(ss|ssr|vmess|vless|trojan|hysteria2|hy2|tuic|http|https):\/\//i.test(l)){
          uris.push(l);
          continue;
        }
        if (/^https?:\/\/\S+/i.test(l)) uris.push(l);
      }
      return uniq(uris);
    }

    function urlEncode(s){
      return encodeURIComponent(s || '');
    }

    // ===== sing-box JSON to share URIs (best-effort) =====
    function toVmessUri({tag, server, port, uuid, security='auto', wsPath='/', host='', tls=true, sni=''}) {
      const obj = {
        v: '2',
        ps: tag || 'vmess',
        add: server || '',
        port: String(port || ''),
        id: uuid || '',
        aid: '0',
        scy: security || 'auto',
        net: 'ws',
        type: 'none',
        host: host || '',
        path: wsPath || '/',
        tls: tls ? 'tls' : ''
      };
      if (sni) obj.sni = sni;
      const b64 = b64enc(JSON.stringify(obj));
      return `vmess://${b64}`;
    }

    function toVlessRealityUri({tag, server, port, uuid, flow, sni, fp, pbk, sid}) {
      const params = [];
      params.push('encryption=none');
      if (flow) params.push('flow=' + urlEncode(flow));
      params.push('security=reality');
      if (sni) params.push('sni=' + urlEncode(sni));
      if (fp) params.push('fp=' + urlEncode(fp));
      if (pbk) params.push('pbk=' + urlEncode(pbk));
      if (sid) params.push('sid=' + urlEncode(sid));
      params.push('type=tcp');
      const q = params.join('&');
      const name = urlEncode(tag || 'vless');
      return `vless://${uuid}@${server}:${port}?${q}#${name}`;
    }

    function toHy2Uri({tag, server, port, password, sni, alpn}) {
      const params = [];
      if (sni) params.push('sni=' + urlEncode(sni));
      if (alpn && alpn.length) params.push('alpn=' + urlEncode(alpn.join(',')));
      const q = params.length ? ('?' + params.join('&')) : '';
      const name = urlEncode(tag || 'hy2');
      return `hysteria2://${urlEncode(password || '')}@${server}:${port}${q}#${name}`;
    }

    function toTuicUri({tag, server, port, uuid, password, cc, sni, alpn}) {
      const params = [];
      if (cc) params.push('congestion_control=' + urlEncode(cc));
      if (sni) params.push('sni=' + urlEncode(sni));
      if (alpn && alpn.length) params.push('alpn=' + urlEncode(alpn.join(',')));
      const q = params.length ? ('?' + params.join('&')) : '';
      const name = urlEncode(tag || 'tuic');
      return `tuic://${uuid}:${urlEncode(password || '')}@${server}:${port}${q}#${name}`;
    }

    function singBoxOutboundsToShareUris(jsonObj){
      const outbounds = Array.isArray(jsonObj?.outbounds) ? jsonObj.outbounds : [];
      const uris = [];
      for (const ob of outbounds){
        if (!ob || typeof ob !== 'object') continue;
        const type = (ob.type || '').toLowerCase();
        const tag = ob.tag || type;
        if (['selector','urltest','direct','block','dns'].includes(type)) continue;

        if (type === 'vless'){
          const server = ob.server;
          const port = ob.server_port;
          const uuid = ob.uuid;
          const flow = ob.flow;
          const tls = ob.tls || {};
          const sni = tls.server_name || '';
          const fp = (tls.utls && tls.utls.fingerprint) ? tls.utls.fingerprint : '';
          const reality = tls.reality || {};
          const pbk = reality.public_key || '';
          const sid = reality.short_id || '';
          if (server && port && uuid){
            uris.push(toVlessRealityUri({tag, server, port, uuid, flow, sni, fp, pbk, sid}));
          }
          continue;
        }

        if (type === 'vmess'){
          const server = ob.server;
          const port = ob.server_port;
          const uuid = ob.uuid;
          const security = ob.security || 'auto';
          const tls = ob.tls || {};
          const sni = tls.server_name || '';
          const transport = ob.transport || {};
          const wsPath = transport.path || '/';
          let host = '';
          if (transport.headers && transport.headers.Host){
            if (Array.isArray(transport.headers.Host) && transport.headers.Host[0]) host = transport.headers.Host[0];
            else if (typeof transport.headers.Host === 'string') host = transport.headers.Host;
          }
          const tlsEnabled = !!tls.enabled;
          if (server && port && uuid){
            uris.push(toVmessUri({tag, server, port, uuid, security, wsPath, host, tls: tlsEnabled, sni}));
          }
          continue;
        }

        if (type === 'hysteria2'){
          const server = ob.server;
          const port = ob.server_port;
          const password = ob.password;
          const tls = ob.tls || {};
          const sni = tls.server_name || '';
          const alpn = tls.alpn || [];
          if (server && port && password){
            uris.push(toHy2Uri({tag, server, port, password, sni, alpn}));
          }
          continue;
        }

        if (type === 'tuic'){
          const server = ob.server;
          const port = ob.server_port;
          const uuid = ob.uuid;
          const password = ob.password;
          const cc = ob.congestion_control || '';
          const tls = ob.tls || {};
          const sni = tls.server_name || '';
          const alpn = tls.alpn || [];
          if (server && port && uuid && password){
            uris.push(toTuicUri({tag, server, port, uuid, password, cc, sni, alpn}));
          }
          continue;
        }
      }
      return uniq(uris);
    }

    function parseSingBox(jsonObj){
      const raw = JSON.stringify(jsonObj, null, 2);
      const extracted = extractUrisFromText(raw);
      const converted = singBoxOutboundsToShareUris(jsonObj);
      const uris = uniq([ ...converted, ...extracted ]);
      return { raw, uris };
    }

    // ===== platform outputs =====
    function makeShadowrocketSub(subUrl){
      return 'sub://' + b64enc(subUrl.trim());
    }

    function makeClashInstall(subUrl){
      return 'clash://install-config?url=' + encodeURIComponent(subUrl.trim());
    }

    function makeSRInstall(subUrl){
      return 'shadowrocket://add/sub?url=' + encodeURIComponent(subUrl.trim());
    }

    function makeAggregateSubFromNodes(nodeUris){
      return 'sub://' + b64enc(nodeUris.join('\n'));
    }

    function makePlainTextBundleFromNodes(nodeUris){
      // A multi-line plaintext bundle that many clients can auto-split into multiple protocol links.
      return (Array.isArray(nodeUris) ? nodeUris : []).filter(Boolean).join('\n');
    }

    function buildClashMetaYaml(subUrl){
      const u = JSON.stringify((subUrl||'').trim());
      return `# Clash Meta profile (generated)\n\nmixed-port: 7890\nallow-lan: true\nmode: rule\nlog-level: info\n\nproxy-providers:\n  sub:\n    type: http\n    url: ${u || "<SUBSCRIPTION_URL>"}\n    interval: 3600\n    path: ./providers/sub.yaml\n    health-check:\n      enable: true\n      url: http://www.gstatic.com/generate_204\n      interval: 300\n\nproxy-groups:\n  - name: PROXY\n    type: select\n    use:\n      - sub\n\nrules:\n  - MATCH,PROXY\n`;
    }

    
export { b64dec, extractUrisFromText, parseSingBox, makeShadowrocketSub, makeClashInstall, makeSRInstall, makeAggregateSubFromNodes, makePlainTextBundleFromNodes, buildClashMetaYaml };
