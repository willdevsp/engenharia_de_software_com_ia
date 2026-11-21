import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const ENV_KEY_NAMES = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'ARCHIVE_CLIENT_ID',
  'ARCHIVE_SECRETS',
  'ARCHIVE_BUCKET'
] as const;

function cleanEnvValue(value: string): string {
  // Trim and remove trailing JS object punctuation (e.g. "value", or "value";) before stripping quotes
  let cleaned = value.trim().replace(/[,;]+\s*$/, '').trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length >= 2)
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function loadCompatibleEnvFile(filePath: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return parsed;

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.*)$/);
    if (!match) continue;

    const rawKey = match[1].trim();
    const normalizedKey = rawKey.startsWith('VITE_') ? rawKey.slice(5) : rawKey;
    const value = cleanEnvValue(match[2]);
    parsed[normalizedKey] = value;
  }

  return parsed;
}

function resolveEnvDefines(rootDir: string): Record<string, string> {
  const baseEnv = loadCompatibleEnvFile(path.join(rootDir, '.env'));
  const localEnv = loadCompatibleEnvFile(path.join(rootDir, '.env.local'));
  const defines: Record<string, string> = {};

  for (const key of ENV_KEY_NAMES) {
    const processVal = process.env[`VITE_${key}`] || process.env[key];
    const resolved = (processVal ?? localEnv[key] ?? baseEnv[key] ?? '').trim();
    defines[`import.meta.env.VITE_${key}`] = JSON.stringify(resolved);
  }

  return defines;
}

function archiveDownloadProxyPlugin(): Plugin {
  const prefix = '/api/archive-download/';

  return {
    name: 'archive-download-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || '';
        if (!reqUrl.startsWith(prefix)) {
          return next();
        }

        const subpath = reqUrl.slice(prefix.length);
        if (!subpath) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Caminho do arquivo Archive.org ausente.' }));
          return;
        }

        try {
          const upstreamUrl = `https://archive.org/download/${subpath}`;
          const upstream = await fetch(upstreamUrl, { redirect: 'follow' });

          res.statusCode = upstream.status;
          const contentType = upstream.headers.get('content-type');
          const contentLength = upstream.headers.get('content-length');
          if (contentType) res.setHeader('Content-Type', contentType);
          if (contentLength) res.setHeader('Content-Length', contentLength);

          if (!upstream.body) {
            res.end();
            return;
          }

          const nodeStream = Readable.fromWeb(upstream.body as unknown as import('node:stream/web').ReadableStream);
          nodeStream.on('error', (streamErr) => {
            if (!res.headersSent) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: streamErr.message }));
            } else {
              res.destroy(streamErr);
            }
          });
          nodeStream.pipe(res);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Falha no proxy de download Archive.org.';
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
    }
  };
}

export default defineConfig(() => {
  const rootDir = process.cwd();
  const envDefines = resolveEnvDefines(rootDir);

  return {
    base: './',
    plugins: [react(), tailwindcss(), archiveDownloadProxyPlugin()],
    define: envDefines,
    server: {
      proxy: {
        '/api/ias3': {
          target: 'https://s3.us.archive.org',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/ias3/, '')
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true
    }
  };
});
