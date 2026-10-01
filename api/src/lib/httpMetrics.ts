import promBundle from 'express-prom-bundle';
import { clientFromRequest } from './metrics';

export function createHttpMetrics() {
  return promBundle({
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
      [/^\/api\/admin\/aerotermia\/facturas\/[^/]+\/descargar$/, '/api/admin/aerotermia/facturas/:id_factura/descargar'],
      [/^\/api\/facturas\/[^/]+\/descargar$/, '/api/facturas/:id_factura/descargar'],
      [/^\/api\/admin\/aerotermia\/cop$/, '/api/admin/aerotermia/cop'],
      [/^\/api\/juntas\/\d+$/, '/api/juntas/:id'],
      [/^\/api\/admin\/juntas\/\d+$/, '/api/admin/juntas/:id'],
    ],
    customLabels: { client: '' },
    transformLabels: (labels, req) => {
      labels.client = clientFromRequest(req);
    },
    autoregister: true,
  });
}
