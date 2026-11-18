import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Dev-only: lets the hidden export page save rendered turntable frames into public/spin.
function frameSaver(): Plugin {
  return {
    name: 'frame-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        const url = new URL(req.url || '', 'http://x');
        const rel = (url.searchParams.get('path') || '').replace(/\.\./g, '');
        if (!/^[a-z0-9\-_/]+\.(webp|png|jpg|glb)$/i.test(rel)) { res.statusCode = 400; return res.end('bad path'); }
        const file = path.join(server.config.root, 'public', rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => { fs.writeFileSync(file, Buffer.concat(chunks)); res.end('ok'); });
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [frameSaver()],
  build: { target: 'es2020', cssTarget: ['safari13', 'chrome80', 'firefox78'], chunkSizeWarningLimit: 900 },
});
