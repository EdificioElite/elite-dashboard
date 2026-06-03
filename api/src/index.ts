import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import promBundle from 'express-prom-bundle';
import { config } from './config';
import { logger } from './lib/logger';
import authRoutes from './routes/auth';
import consumosRoutes from './routes/consumos';
import facturasRoutes from './routes/facturas';
import adminRoutes from './routes/admin';
import adminAerotermiaRoutes from './routes/adminAerotermia';
import juntasRoutes from './routes/juntas';
import testRoutes from './routes/test';

const app = express();

app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.method === 'OPTIONS',
  },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
}));

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use(promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  metricsPath: '/metrics',
  normalizePath: [
    [/^\/api\/admin\/vecinos\/[^/]+$/, '/api/admin/vecinos/:piso'],
    [/^\/api\/admin\/vecinos\/[^/]+\/facturas$/, '/api/admin/vecinos/:piso/facturas'],
    [/^\/api\/admin\/usuarios\/\d+$/, '/api/admin/usuarios/:id'],
    [/^\/api\/admin\/usuarios\/\d+\/password$/, '/api/admin/usuarios/:id/password'],
    [/^\/api\/admin\/aerotermia\/consumos$/, '/api/admin/aerotermia/consumos'],
    [/^\/api\/admin\/aerotermia\/facturas$/, '/api/admin/aerotermia/facturas'],
    [/^\/api\/admin\/aerotermia\/cop$/, '/api/admin/aerotermia/cop'],
    [/^\/api\/juntas\/\d+$/, '/api/juntas/:id'],
    [/^\/api\/admin\/juntas\/\d+$/, '/api/admin/juntas/:id'],
  ],
  autoregister: false,
}));

app.use('/api', authRoutes);
app.use('/api', consumosRoutes);
app.use('/api', facturasRoutes);
app.use('/api', adminRoutes);
app.use('/api', adminAerotermiaRoutes);
app.use('/api', juntasRoutes);
if (config.mockEmail) {
  app.use('/api', testRoutes);
}

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'API running');
});
