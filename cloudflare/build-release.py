from pathlib import Path
import json
root = Path(__file__).resolve().parent.parent
assets = {}
for name, mime in [('index.html','text/html; charset=utf-8'),('app.bundle.js','text/javascript; charset=utf-8'),('modern.css','text/css; charset=utf-8'),('manifest.json','application/manifest+json'),('sw.js','text/javascript; charset=utf-8')]:
    content = (root / name).read_text()
    if name == 'index.html' and 'rel="manifest"' not in content:
        content = content.replace('<link rel="stylesheet"', '<link rel="manifest" href="/manifest.json"><link rel="stylesheet"', 1)
    if name == 'sw.js':
        content = content.replace('traffic-v140-shell', 'traffic-v140-cloudflare-release').replace('traffic-v140-release-20261001', 'traffic-v140-cloudflare-release')
        content = content.replace("'/index.html',", "'/index.html','/app.bundle.js','/modern.css',")
    assets['/' + name] = {'body': content, 'type': mime}
output = 'const RELEASE_ASSETS = ' + json.dumps(assets, ensure_ascii=True) + ';\n' + (root / 'cloudflare/worker.mjs').read_text()
(root / 'cloudflare/worker-release-1.4.0.mjs').write_text(output)
