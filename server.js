import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

// TLS-aware behind proxy (Cloudflare/Nginx/Caddy)
app.set('trust proxy', 1);

// Optional HTTPS redirect (FORCE_HTTPS=1) and HSTS (ENABLE_HSTS=1)
if (process.env.FORCE_HTTPS === '1') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
    }
    next();
  });
}
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (process.env.ENABLE_HSTS === '1') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 3000);
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[GNARLY TEAM] site is running on http://${HOST}:${PORT}`);
  console.log(`[GNARLY TEAM] ENV PORT=${process.env.PORT || ''} SERVER_PORT=${process.env.SERVER_PORT || ''}`);
  console.log(`[GNARLY TEAM] FORCE_HTTPS=${process.env.FORCE_HTTPS || '0'} ENABLE_HSTS=${process.env.ENABLE_HSTS || '0'}`);
});
