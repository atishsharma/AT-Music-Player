import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

/**
 * Phone remote: a tiny LAN HTTP server that serves a mobile control page and a
 * token-protected JSON API. Every request must carry the secret token (in the
 * URL path for the page, `?t=` for the API), so other devices on the network
 * can't control playback without the link/QR code.
 */

export interface RemoteDeps {
    getState: () => unknown;
    /** Forwarded to the renderer as a 'player:command' */
    command: (cmd: { type: string; [k: string]: unknown }) => void;
    search: (query: string) => Promise<unknown[]>;
    /** Local file path or http(s) URL of the current artwork, or '' */
    artwork: () => string;
}

const ART_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const ALLOWED = new Set(['playPause', 'next', 'prev', 'toggleFavorite', 'toggleShuffle', 'toggleLoop', 'seek', 'volume', 'playQueueIndex', 'playTrack', 'enqueue']);

let server: http.Server | null = null;
// Tracks the phone may play/enqueue: only ones this server returned from a search,
// so a crafted request can't point the player at an arbitrary local file.
const offered = new Map<string, unknown>();
let token = '';
let port = 0;

export const newRemoteToken = () => randomBytes(12).toString('hex');

export function lanAddress(): string {
    for (const list of Object.values(os.networkInterfaces())) {
        for (const a of list || []) {
            if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) return a.address;
        }
    }
    return '127.0.0.1';
}

export function remoteStatus() {
    return { running: !!server, port, url: server ? `http://${lanAddress()}:${port}/r/${token}` : '' };
}

function json(res: http.ServerResponse, code: number, body: unknown) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (c) => { data += c; if (data.length > 64_000) req.destroy(); });
        req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
        req.on('error', () => resolve({}));
    });
}

export async function startRemote(deps: RemoteDeps, secret: string, preferredPort = 7777) {
    stopRemote();
    token = secret;
    const srv = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url || '/', 'http://x');
            if (url.pathname === `/r/${token}`) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end(REMOTE_PAGE);
                return;
            }
            if (!url.pathname.startsWith('/api/') || url.searchParams.get('t') !== token) {
                res.writeHead(404); res.end(); return;
            }
            switch (url.pathname) {
                case '/api/state': return json(res, 200, deps.getState());
                case '/api/cmd': {
                    if (req.method !== 'POST') return json(res, 405, {});
                    const cmd = await readBody(req) as { type?: string };
                    if (!cmd?.type || !ALLOWED.has(cmd.type)) return json(res, 400, { error: 'bad command' });
                    if (cmd.type === 'playTrack' || cmd.type === 'enqueue') {
                        const id = String((cmd as { track?: { id?: unknown } }).track?.id ?? '');
                        const track = offered.get(id);
                        if (!track) return json(res, 400, { error: 'unknown track' });
                        deps.command({ type: cmd.type, track });
                        return json(res, 200, { ok: true });
                    }
                    deps.command(cmd as { type: string });
                    return json(res, 200, { ok: true });
                }
                case '/api/search': {
                    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
                    const results = q ? await deps.search(q) : [];
                    if (offered.size > 500) offered.clear();
                    for (const t of results as { id?: unknown }[]) if (t?.id != null) offered.set(String(t.id), t);
                    return json(res, 200, results);
                }
                case '/api/art': {
                    const art = deps.artwork();
                    if (/^https?:\/\//.test(art)) { res.writeHead(302, { Location: art }); res.end(); return; }
                    const type = ART_TYPES[path.extname(art).toLowerCase()];
                    if (!art || !type) { res.writeHead(404); res.end(); return; }
                    const { size } = await stat(art);
                    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Cache-Control': 'no-store' });
                    createReadStream(art).pipe(res);
                    return;
                }
            }
            res.writeHead(404); res.end();
        } catch {
            if (!res.headersSent) res.writeHead(500);
            res.end();
        }
    });

    const listen = (p: number) => new Promise<number>((resolve, reject) => {
        srv.once('error', reject);
        srv.listen(p, '0.0.0.0', () => resolve((srv.address() as { port: number }).port));
    });
    try {
        port = await listen(preferredPort);
    } catch {
        port = await listen(0); // preferred port busy: take any free one
    }
    server = srv;
    return remoteStatus();
}

export function stopRemote() {
    server?.close();
    server?.closeAllConnections?.();
    server = null;
    port = 0;
}

const REMOTE_PAGE = /* html */ `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0b10"><title>AT Music Remote</title>
<style>
:root{--bg:#0b0b10;--fg:#f4f4f7;--mute:#9a9aa8;--card:rgba(255,255,255,.07);--line:rgba(255,255,255,.1);--acc:#8b7cff}
@media (prefers-color-scheme:light){:root{--bg:#f4f4f7;--fg:#141418;--mute:#6b6b78;--card:rgba(0,0,0,.05);--line:rgba(0,0,0,.08)}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;font:15px/1.4 system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--fg);padding:16px 16px calc(16px + env(safe-area-inset-bottom));min-height:100vh}
#bgart{position:fixed;inset:-40px;background-size:cover;background-position:center;filter:blur(50px) saturate(1.4);opacity:.35;z-index:-1;transition:background-image .4s}
.art{width:min(78vw,340px);aspect-ratio:1;margin:12px auto 18px;border-radius:22px;background:var(--card) center/cover;box-shadow:0 20px 50px rgba(0,0,0,.35)}
h1{font-size:20px;margin:0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub{color:var(--mute);text-align:center;margin:2px 0 14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
input[type=range]{width:100%;accent-color:var(--acc)}
.times{display:flex;justify-content:space-between;color:var(--mute);font-size:12px;font-variant-numeric:tabular-nums}
.row{display:flex;align-items:center;justify-content:center;gap:14px;margin:10px 0}
button{border:0;background:none;color:inherit;font:inherit;cursor:pointer}
.ic{width:48px;height:48px;border-radius:50%;display:grid;place-items:center}
.ic svg{width:24px;height:24px}.ic.on{color:var(--acc)}
.big{width:72px;height:72px;background:var(--fg);color:var(--bg)}.big svg{width:30px;height:30px}
.vol{display:flex;align-items:center;gap:10px;margin:8px 0 18px;color:var(--mute)}
.tabs{display:flex;gap:6px;background:var(--card);border-radius:14px;padding:4px;margin-bottom:10px}
.tabs button{flex:1;padding:8px;border-radius:10px;color:var(--mute);font-weight:600}.tabs button.on{background:var(--fg);color:var(--bg)}
.q{width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--fg);font:inherit;margin-bottom:8px}
.item{display:flex;align-items:center;gap:12px;padding:8px;border-radius:12px;width:100%;text-align:left}
.item:active{background:var(--card)}.item.cur{color:var(--acc)}
.th{width:42px;height:42px;border-radius:9px;background:var(--card) center/cover;flex:none}
.meta{min-width:0;flex:1}.meta b,.meta span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meta span{color:var(--mute);font-size:13px}
.add{width:36px;height:36px;border-radius:50%;background:var(--card);flex:none;font-size:20px}
.empty{color:var(--mute);text-align:center;padding:20px}
#off{display:none;position:fixed;inset:auto 16px 16px;padding:10px 14px;border-radius:12px;background:#c0392b;color:#fff;text-align:center}
</style></head><body>
<div id="bgart"></div>
<div class="art" id="art"></div>
<h1 id="title">Nothing playing</h1><div class="sub" id="artist">AT Music</div>
<input type="range" id="seek" min="0" max="0" step="1" value="0" aria-label="Seek">
<div class="times"><span id="cur">0:00</span><span id="dur">0:00</span></div>
<div class="row">
<button class="ic" id="shuffle" aria-label="Shuffle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg></button>
<button class="ic" id="prev" aria-label="Previous"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg></button>
<button class="ic big" id="pp" aria-label="Play or pause"></button>
<button class="ic" id="next" aria-label="Next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg></button>
<button class="ic" id="fav" aria-label="Favourite"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg></button>
</div>
<div class="vol"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/></svg><input type="range" id="vol" min="0" max="1" step="0.01" aria-label="Volume"></div>
<div class="tabs"><button class="on" data-tab="queue">Up next</button><button data-tab="search">Search</button></div>
<div id="queue"></div>
<div id="search" hidden><input class="q" id="q" type="search" placeholder="Songs, artists, YouTube…" enterkeyhint="search"><div id="results"></div></div>
<div id="off">Can't reach AT Music. Is the app running?</div>
<script>
const T=location.pathname.split('/').pop(),$=id=>document.getElementById(id);
const api=(p,o)=>fetch('/api/'+p+(p.includes('?')?'&':'?')+'t='+T,o);
const cmd=c=>api('cmd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)}).then(()=>setTimeout(poll,150));
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PLAY='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',PAUSE='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
let st=null,seeking=false,voling=false,artKey='';
function thumb(u){return u&&/^https?:/.test(u)?'background-image:url(&quot;'+esc(u)+'&quot;)':''}
function render(s){
  st=s;$('off').style.display='none';
  $('title').textContent=s.hasTrack?s.title:'Nothing playing';$('artist').textContent=s.hasTrack?(s.artist||'Unknown artist'):'AT Music';
  $('pp').innerHTML=s.isPlaying?PAUSE:PLAY;
  $('shuffle').classList.toggle('on',s.shuffle);$('fav').classList.toggle('on',s.isFavorite);
  $('fav').querySelector('path').setAttribute('fill',s.isFavorite?'currentColor':'none');
  if(!seeking){$('seek').max=Math.floor(s.duration||0);$('seek').value=Math.floor(s.currentTime||0)}
  $('cur').textContent=fmt(seeking?$('seek').value:s.currentTime);$('dur').textContent=fmt(s.duration);
  if(!voling)$('vol').value=s.volume??1;
  const k=s.title+'|'+s.artwork;
  if(k!==artKey){artKey=k;const u=s.artwork?'url("/api/art?t='+T+'&k='+encodeURIComponent(k)+'")':'none';$('art').style.backgroundImage=u;$('bgart').style.backgroundImage=u;document.title=s.hasTrack?s.title+' · AT Music':'AT Music Remote'}
  const q=s.queue||[];
  $('queue').innerHTML=q.length?q.map((t,i)=>'<button class="item" data-i="'+i+'"><div class="th" style="'+thumb(t.artwork)+'"></div><div class="meta"><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+'</span></div></button>').join(''):'<div class="empty">Queue is empty</div>';
}
async function poll(){try{const r=await api('state');render(await r.json()||{})}catch{$('off').style.display='block'}}
$('pp').onclick=()=>cmd({type:'playPause'});$('next').onclick=()=>cmd({type:'next'});$('prev').onclick=()=>cmd({type:'prev'});
$('shuffle').onclick=()=>cmd({type:'toggleShuffle'});$('fav').onclick=()=>cmd({type:'toggleFavorite'});
$('seek').oninput=()=>{seeking=true;$('cur').textContent=fmt($('seek').value)};$('seek').onchange=()=>{cmd({type:'seek',value:+$('seek').value});seeking=false};
$('vol').oninput=()=>{voling=true;cmd({type:'volume',value:+$('vol').value})};$('vol').onchange=()=>{voling=false};
$('queue').onclick=e=>{const b=e.target.closest('.item');if(b)cmd({type:'playQueueIndex',index:+b.dataset.i})};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));$('queue').hidden=b.dataset.tab!=='queue';$('search').hidden=b.dataset.tab!=='search';if(b.dataset.tab==='search')$('q').focus()});
let results=[],timer;
$('q').oninput=()=>{clearTimeout(timer);timer=setTimeout(search,450)};
async function search(){const q=$('q').value.trim();if(!q){$('results').innerHTML='';return}
  $('results').innerHTML='<div class="empty">Searching…</div>';
  try{results=await (await api('search?q='+encodeURIComponent(q))).json()}catch{results=[]}
  $('results').innerHTML=results.length?results.map((t,i)=>'<div class="item"><button class="item" style="padding:0" data-play="'+i+'"><div class="th" style="'+thumb(t.thumbnail||t.image_path)+'"></div><div class="meta"><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+(t.source==='youtube'?' · YouTube':'')+'</span></div></button><button class="add" data-add="'+i+'" aria-label="Add to queue">+</button></div>').join(''):'<div class="empty">No results</div>'}
$('results').onclick=e=>{const p=e.target.closest('[data-play]'),a=e.target.closest('[data-add]');
  if(p)cmd({type:'playTrack',track:results[+p.dataset.play]});
  if(a){cmd({type:'enqueue',track:results[+a.dataset.add]});a.textContent='✓'}};
poll();setInterval(()=>{if(!document.hidden)poll()},1000);
</script></body></html>`;
