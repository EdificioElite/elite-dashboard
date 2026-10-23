import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { config, validateConfig } from './config';
import { logger } from './lib/logger';
import { createHttpMetrics } from './lib/httpMetrics';
import authRoutes from './routes/auth';
import consumosRoutes from './routes/consumos';
import facturasRoutes from './routes/facturas';
import adminRoutes from './routes/admin';
import adminAerotermiaRoutes from './routes/adminAerotermia';
import juntasRoutes from './routes/juntas';
import contadoresRoutes from './routes/contadores';
import testRoutes from './routes/test';

validateConfig();

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

app.use(createHttpMetrics());

app.use('/api', authRoutes);
app.use('/api', consumosRoutes);
app.use('/api', facturasRoutes);
app.use('/api', adminRoutes);
app.use('/api', adminAerotermiaRoutes);
app.use('/api', juntasRoutes);
app.use('/api', contadoresRoutes);
if (config.mockEmail) {
  app.use('/api', testRoutes);
}

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'API running');
});
