// Stage only public icons. The reviewed release already embeds the application.
// Never publish the repository root, server data, tests, or deployment config.
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir(new URL('../.cloudflare-assets/', import.meta.url), { recursive: true });
for (const name of ['icon-192.png', 'icon-512.png']) {
  await copyFile(new URL('../' + name, import.meta.url), new URL('../.cloudflare-assets/' + name, import.meta.url));
}
