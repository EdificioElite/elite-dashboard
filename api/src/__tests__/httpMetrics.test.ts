import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { register } from 'prom-client';
import { createHttpMetrics } from '../lib/httpMetrics';

describe('httpMetrics', () => {
  let app: express.Express;

  beforeAll(() => {
    register.clear();
    app = express();
    app.use(createHttpMetrics());
    app.get('/ping', (_req, res) => res.json({ ok: true }));
  });

  it('registra client="dashboard" para un cliente normal', async () => {
    await request(app).get('/ping').expect(200);
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toContain('client="dashboard"');
  });

  it('registra client="home-assistant" para Home Assistant', async () => {
    await request(app)
      .get('/ping')
      .set('User-Agent', 'HomeAssistant/2025.1.0 aiohttp/3.9.1')
      .expect(200);
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toContain('client="home-assistant"');
  });
});
