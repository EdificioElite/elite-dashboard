import { describe, it, expect } from 'vitest';
import {
  parseContadoresCsv,
  transformRow,
  CONTADORES_COLUMNAS,
  detectarFaltantes,
  detectarDesactualizados,
  detectarResets,
} from '../lib/contadoresIngest';

const HEADER = [
  '#serial-number', 'device-position', 'primary-address', 'device-identification',
  'created', 'value-data-count', 'manufacturer', 'version', 'device-type',
  'access-number', 'status', 'signature',
  'energy,Wh,inst-value,0,0,0',
  'energy manufacturer-specific-02,Wh,inst-value,0,0,0',
  'manufacturer-specific-ff-07,,inst-value,0,0,0',
  'manufacturer-specific-ff-08,,inst-value,0,0,0',
  'volume,m3,inst-value,0,0,0',
  'volume,m3,inst-value,0,1,0',
  'volume,m3,inst-value,0,2,0',
  'on-time,hour(s),inst-value,0,0,0',
  'on-time,hour(s),err-value,0,0,0',
  'flow-temp,°C,inst-value,0,0,0',
  'return-temp,°C,inst-value,0,0,0',
  'diff-temp,K,inst-value,0,0,0',
  'power,W,inst-value,0,0,0',
  'power,W,max-value,0,0,0',
  'volume-flow,m3/h,inst-value,0,0,0',
  'volume-flow,m3/h,max-value,0,0,0',
  'manufacturer-specific-ff-22,,inst-value,0,0,0',
  'datetime,,inst-value,0,0,0',
  'energy,Wh,inst-value,0,0,1',
  'energy manufacturer-specific-02,Wh,inst-value,0,0,1',
  'manufacturer-specific-ff-07,,inst-value,0,0,1',
  'manufacturer-specific-ff-08,,inst-value,0,0,1',
  'volume,m3,inst-value,0,0,1',
  'volume,m3,inst-value,0,1,1',
  'volume,m3,inst-value,0,2,1',
  'power,W,max-value,0,0,1',
  'volume-flow,m3/h,max-value,0,0,1',
  'date,,inst-value,0,0,1',
  'manufacturer-specific-ff-1a,,inst-value,0,0,0',
  'fabrication-no,,inst-value,0,0,0',
  'manufacturer-specific-ff-16,,inst-value,0,0,0',
  'manufacturer-specific-ff-17,,inst-value,0,0,0',
];

const ROW_0A = [
  '0016045167', '0A', '63', '72569463', '2026-10-01 20:00:00', '00', 'KAM', '52',
  'heat/cooling load', '32', '0', '0',
  '4138000', '1302000', '29466', '27001',
  '959,160', '1736,220', '0,000', '42421', '5',
  '14,410', '15,710', '-1,300', '0', '0', '0,000', '0,000', '0',
  '2026-10-01 20:56:00',
  '4138000', '1302000', '29466', '27001',
  '959,160', '1735,320', '0,000', '-3300', '0,561', '2026-10-01 00:00:00',
  '6658', '72569463', '2000102', '11851201',
];

describe('parseContadoresCsv', () => {
  it('parsea filas de datos y descarta las cabeceras repetidas', () => {
    const csv = [
      HEADER.join(';'),
      ROW_0A.join(';'),
      HEADER.join(';'),
      ROW_0A.join(';'),
    ].join('\n');

    const rows = parseContadoresCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]['device-identification']).toBe('72569463');
  });

  it('normaliza el símbolo de grado en las cabeceras', () => {
    const headerDeg = HEADER.map((h) => h.replace('°', '\uFFFD')).join(';');
    const csv = [headerDeg, ROW_0A.join(';')].join('\n');
    const rows = parseContadoresCsv(csv);
    expect(rows[0]['flow-temp,°C,inst-value,0,0,0']).toBe('14,410');
  });
});

describe('transformRow', () => {
  it('aplica las transformaciones de n8n', () => {
    const csv = [HEADER.join(';'), ROW_0A.join(';')].join('\n');
    const [row] = parseContadoresCsv(csv);
    const insert = transformRow(row);

    expect(insert.created).toBe('2026-10-01T20:00:00.000Z');
    expect(insert.energy_wh_inst_value_0_0_0).toBe('4138000');
    expect(insert.energy_manufacturer_specific_02_wh_inst_value_0_0_0).toBe(1302000);
    expect(insert.volume_m3_inst_value_0_0_0).toBeCloseTo(95.916);
    expect(insert.volume_m3_inst_value_0_1_0).toBeCloseTo(173.622);
    expect(insert.flow_temp_c_inst_value_0_0_0).toBeCloseTo(14.41);
    expect(insert.return_temp_c_inst_value_0_0_0).toBeCloseTo(15.71);
    expect(insert.diff_temp_k_inst_value_0_0_0).toBeCloseTo(-1.3);
    expect(insert.volume_flow_m3h_inst_value_0_0_0).toBeCloseTo(0.0);
  });

  it('tiene exactamente las 42 columnas que insertaba n8n', () => {
    expect(CONTADORES_COLUMNAS).toHaveLength(42);
    expect(CONTADORES_COLUMNAS).not.toContain('power_w_max_value_0_0_0');
    expect(CONTADORES_COLUMNAS).not.toContain('volume_flow_m3h_max_value_0_0_0');
  });
});

describe('detectarFaltantes', () => {
  it('devuelve los contadores esperados que no están presentes', () => {
    const esperados = [
      { device_identification: '72569463', serial_number: '0016045167' },
      { device_identification: '72569464', serial_number: '0016045167' },
    ];
    const presentes = [{ device_identification: '72569463', serial_number: '0016045167' }];
    const faltantes = detectarFaltantes(esperados, presentes);
    expect(faltantes).toEqual([{ device_identification: '72569464', serial_number: '0016045167' }]);
  });
});

describe('detectarDesactualizados', () => {
  it('detecta un contador cuyo datetime no avanza', () => {
    const fila = (created: string, datetime: string) => ({
      'device-identification': '72569463',
      created,
      'datetime,,inst-value,0,0,0': datetime,
    });
    const rows = [fila('2026-10-01 20:00:00', '2026-10-01 18:00:00')];
    const res = detectarDesactualizados(rows, 120);
    expect(res).toHaveLength(1);
    expect(res[0].device_identification).toBe('72569463');
  });

  it('no detecta un contador sano (datetime por delante)', () => {
    const rows = [
      { 'device-identification': '72569463', created: '2026-10-01 20:00:00', 'datetime,,inst-value,0,0,0': '2026-10-01 20:56:00' },
    ];
    expect(detectarDesactualizados(rows, 120)).toHaveLength(0);
  });
});

describe('detectarResets', () => {
  it('detecta un descenso del acumulado respecto a la lectura previa', () => {
    const inserts = [
      { device_identification: '72569463', energy_wh_inst_value_0_0_0: 1000 },
    ];
    const previos = [
      { device_identification: '72569463', energy_wh_inst_value_0_0_0: 5000 },
    ];
    const resets = detectarResets(inserts, previos);
    expect(resets).toEqual([{ device_identification: '72569463', campo: 'energy_wh_inst_value_0_0_0' }]);
  });
});
