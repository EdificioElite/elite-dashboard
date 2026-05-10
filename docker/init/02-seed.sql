INSERT INTO vecinos (piso, serial_number, device_identification, nombre, email, coeficiente, enviar_email) VALUES
  ('1A', '10000001', 'DEVID001', 'Vecino 1A', 'vecino1a@elite.com', '0.20', false),
  ('2A', '10000002', 'DEVID002', 'Vecino 2A', 'vecino2a@elite.com', '0.20', false),
  ('3A', '10000003', 'DEVID003', 'Vecino 3A', 'vecino3a@elite.com', '0.20', false),
  ('4A', '10000004', 'DEVID004', 'Vecino 4A', 'vecino4a@elite.com', '0.20', false),
  ('5A', '10000005', 'DEVID005', 'Vecino 5A', 'vecino5a@elite.com', '0.20', false),
  ('6A', '10000006', 'DEVID006', 'Vecino 6A', NULL, '0.20', false);

INSERT INTO contadores (
  serial_number, device_identification, created, datetime_inst_value_0_0_0,
  energy_wh_inst_value_0_0_0, energy_manufacturer_specific_02_wh_inst_value_0_0_0,
  volume_m3_inst_value_0_1_0, volume_m3_inst_value_0_2_0,
  flow_temp_c_inst_value_0_0_0, return_temp_c_inst_value_0_0_0
)
SELECT
  v.serial_number::bigint AS serial_number,
  v.device_identification,
  ts AS created,
  ts AS datetime_inst_value_0_0_0,
  (100000 + (EXTRACT(EPOCH FROM ts)::bigint / 43200) * (50 + (ROW_NUMBER() OVER (PARTITION BY v.piso ORDER BY ts) * 10))) AS energy_wh_inst_value_0_0_0,
  (50000 + (EXTRACT(EPOCH FROM ts)::bigint / 43200) * (25 + (ROW_NUMBER() OVER (PARTITION BY v.piso ORDER BY ts) * 5))) AS energy_manufacturer_specific_02_wh_inst_value_0_0_0,
  (10.0 + RANDOM() * 0.02)::real AS volume_m3_inst_value_0_1_0,
  (5.0 + RANDOM() * 0.01)::real AS volume_m3_inst_value_0_2_0,
  (40.0 + RANDOM() * 5.0)::real AS flow_temp_c_inst_value_0_0_0,
  (30.0 + RANDOM() * 3.0)::real AS return_temp_c_inst_value_0_0_0
FROM vecinos v
CROSS JOIN generate_series(
  '2026-01-01 00:00:00'::timestamp,
  '2026-03-31 23:00:00'::timestamp,
  '12 hours'::interval
) AS ts;

INSERT INTO facturas (
  id_factura, piso, nombre, email, device_identification,
  fecha_factura_creacion, fecha_factura_inicio, fecha_factura_fin,
  importe_vivienda_total, kwh_vivienda_calor, kwh_vivienda_frio,
  kwh_vivienda_acs, m3_vivienda_acs,
  importe_vivienda_variable_calor, importe_vivienda_variable_frio,
  importe_vivienda_acs
)
SELECT
  v.piso || '-' || TO_CHAR(d, 'YYYY-MM') AS id_factura,
  v.piso,
  v.nombre,
  v.email,
  v.device_identification,
  (d + INTERVAL '1 month')::timestamptz AS fecha_factura_creacion,
  d::timestamptz AS fecha_factura_inicio,
  (d + INTERVAL '1 month')::timestamptz AS fecha_factura_fin,
  ROUND((250 + RANDOM() * 150)::numeric, 2)::real AS importe_vivienda_total,
  (1000 + RANDOM() * 500)::bigint AS kwh_vivienda_calor,
  (200 + RANDOM() * 100)::bigint AS kwh_vivienda_frio,
  (300 + RANDOM() * 150)::bigint AS kwh_vivienda_acs,
  ROUND((2.0 + RANDOM() * 3.0)::numeric, 2)::real AS m3_vivienda_acs,
  ROUND((100 + RANDOM() * 50)::numeric, 2)::real AS importe_vivienda_variable_calor,
  ROUND((30 + RANDOM() * 20)::numeric, 2)::real AS importe_vivienda_variable_frio,
  ROUND((40 + RANDOM() * 20)::numeric, 2)::real AS importe_vivienda_acs
FROM vecinos v
CROSS JOIN generate_series(
  '2026-01-01'::date,
  '2026-03-01'::date,
  '1 month'::interval
) AS d;
