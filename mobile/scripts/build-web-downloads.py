from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
base=(root/'cloudflare/worker-release-1.4.0.mjs').read_text()
head,worker=base.split(';\n',1)
assets=json.loads(head.removeprefix('const RELEASE_ASSETS = '))
assets['/aplikace']={'body':(root/'mobile/store/instalace.html').read_text(),'type':'text/html; charset=utf-8'}
assets['/install-web.js']={'body':(root/'mobile/store/install-web.js').read_text(),'type':'text/javascript; charset=utf-8'}
assets['/index.html']['body']=assets['/index.html']['body'].replace('</head>','<script src="/install-web.js" defer></script></head>').replace('<main class="wrap">','<main class="wrap"><p style="text-align:right"><a href="/aplikace">Nainstalovat aplikaci</a></p>')
assets['/sw.js']['body']=assets['/sw.js']['body'].replace('traffic-v140-cloudflare-release','traffic-v140-mobile-downloads').replace("'/index.html',","'/index.html','/install-web.js',")
worker=worker.replace('new Set(["/",','new Set(["/aplikace", "/install-web.js", "/",')
needle='  if (p[0] !== "api") {'
replacement='''  if (url.pathname === "/stahnout/android" && ["GET", "HEAD"].includes(req.method)) {
    return Response.redirect("https://raw.githubusercontent.com/DanTre11/Scitani/mobile-1.4.0/downloads/Scitani-dopravy-1.4.0.apk", 302);
  }
'''+needle
assert needle in worker
worker=worker.replace(needle,replacement,1)
out=root/'mobile/releases';out.mkdir(exist_ok=True)
(out/'worker-s-instalaci-aplikace.mjs').write_text('const RELEASE_ASSETS = '+json.dumps(assets,ensure_ascii=True)+';\n'+worker)
