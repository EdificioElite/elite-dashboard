-- Seed de facturaelectrica para desarrollo.
-- NO ejecutar en produccion. Solo para entorno dev local o docker-compose e2e.

-- Insertar una factura electrica por mes en 2026 con kWh estimados
INSERT INTO facturaelectrica (id, startdate, enddate, amount, facturada, issuedate, kwh_electricos)
SELECT
  'FE-' || TO_CHAR(d, 'YYYY-MM') AS id,
  d::date AS startdate,
  (d + INTERVAL '1 month')::date AS enddate,
  ROUND((3000 + RANDOM() * 2000)::numeric, 2) AS amount,
  true AS facturada,
  (d + INTERVAL '1 month')::timestamptz AS issuedate,
  (4000 + RANDOM() * 1000)::bigint AS kwh_electricos
FROM generate_series(
  '2026-01-01'::date,
  '2026-12-01'::date,
  '1 month'::interval
) AS d
ON CONFLICT (id) DO NOTHING;

-- Vincular facturas a facturaelectrica
UPDATE facturas f
SET id_factura_electrica = 'FE-' || TO_CHAR(f.fecha_factura_inicio, 'YYYY-MM')
WHERE f.fecha_factura_inicio >= '2026-01-01'
  AND f.fecha_factura_inicio <= '2026-12-31';

-- Calcular y actualizar kwh_total_viviendas para cada factura
UPDATE facturas f
SET kwh_total_viviendas = (
  SELECT SUM(f2.kwh_vivienda_calor + f2.kwh_vivienda_frio + f2.kwh_vivienda_acs)
  FROM facturas f2
  WHERE f2.id_factura_electrica = f.id_factura_electrica
)
WHERE f.id_factura_electrica IS NOT NULL;
