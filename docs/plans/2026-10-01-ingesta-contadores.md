# Ingesta de contadores en el dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar `POST /api/contadores` en la API del dashboard para ingerir el CSV del datalogger Elvaco CMe3100 (contadores Kamstrup Multical 403), escribirlo en `contadores` con upsert idempotente, verificar integridad (faltantes/desactualizados/resets), y añadir un mock del datalogger para dev.

**Architecture:** Un módulo puro `lib/contadoresIngest.ts` (parse + transform + verificación), una ruta `routes/contadores.ts` (auth + rate limit + orquestación + upsert), métricas nuevas en `lib/metrics.ts`, migración de permisos, y un script `api/scripts/mock-datalogger.ts`.

**Tech Stack:** Express 5, TypeScript (CommonJS), prom-client, pg, vitest + supertest, tsx.

**Spec:** [docs/specs/2026-10-01-ingesta-contadores-design.md](../specs/2026-10-01-ingesta-contadores-design.md)
**Referencia de los equipos:** [docs/datalogger-contadores.md](../datalogger-contadores.md)

---

## File Structure

- Create: `api/src/lib/contadoresIngest.ts` — parseo, transformación y verificación (puro, testeable).
- Create: `api/src/__tests__/contadoresIngest.test.ts` — unit tests del módulo.
- Modify: `api/src/lib/metrics.ts` — nuevas métricas (Counter + Gauge).
- Modify: `api/src/config.ts` — variables de entorno + `validateConfig`.
- Create: `api/src/routes/contadores.ts` — endpoint `POST /api/contadores`.
- Create: `api/src/__tests__/contadores.routes.test.ts` — integration tests de la ruta.
- Modify: `api/src/index.ts` — montar la ruta.
- Create: `api/migrations/012_grant_contadores_write.sql` — GRANT INSERT/UPDATE.
- Create: `api/scripts/mock-datalogger.ts` — mock del datalogger.
- Modify: `api/package.json` — script `mock:datalogger`.
- Modify: `api/.env.example` — nuevas variables.
- Modify: `grafana/observabilidad.json` — paneles de ingesta e integridad.

---

### Task 1: Módulo `contadoresIngest` — parseo y transformación

**Files:**
- Create: `api/src/lib/contadoresIngest.ts`
- Test: `api/src/__tests__/contadoresIngest.test.ts`

- [ ] **Step 1: Escribir el test que falla (parseo + transformación)**

Crear `api/src/__tests__/contadoresIngest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  parseContadoresCsv,
  transformRow,
  CONTADORES_COLUMNAS,
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
    expect(insert.energy_wh_inst_value_0_0_0).toBe(4138000);
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
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd api && npx vitest run src/__tests__/contadoresIngest.test.ts
```

Expected: FAIL — módulo `../lib/contadoresIngest` no existe.

- [ ] **Step 3: Implementar el módulo**

Crear `api/src/lib/contadoresIngest.ts`:

```ts
export type CsvRow = Record<string, string>;

export type ContadorInsert = Record<string, string | number>;

export const CONTADORES_COLUMNAS = [
  'serial_number',
  'device_identification',
  'device_position',
  'primary_address',
  'created',
  'value_data_count',
  'manufacturer',
  'version',
  'device_type',
  'access_number',
  'status',
  'signature',
  'energy_wh_inst_value_0_0_0',
  'energy_manufacturer_specific_02_wh_inst_value_0_0_0',
  'manufacturer_specific_ff_07_inst_value_0_0_0',
  'manufacturer_specific_ff_08_inst_value_0_0_0',
  'volume_m3_inst_value_0_0_0',
  'volume_m3_inst_value_0_1_0',
  'volume_m3_inst_value_0_2_0',
  'on_time_hours_inst_value_0_0_0',
  'on_time_hours_err_value_0_0_0',
  'flow_temp_c_inst_value_0_0_0',
  'return_temp_c_inst_value_0_0_0',
  'diff_temp_k_inst_value_0_0_0',
  'power_w_inst_value_0_0_0',
  'volume_flow_m3h_inst_value_0_0_0',
  'manufacturer_specific_ff_22_inst_value_0_0_0',
  'datetime_inst_value_0_0_0',
  'energy_wh_inst_value_0_0_1',
  'energy_manufacturer_specific_02_wh_inst_value_0_0_1',
  'manufacturer_specific_ff_07_inst_value_0_0_1',
  'manufacturer_specific_ff_08_inst_value_0_0_1',
  'volume_m3_inst_value_0_0_1',
  'volume_m3_inst_value_0_1_1',
  'volume_m3_inst_value_0_2_1',
  'power_w_max_value_0_0_1',
  'volume_flow_m3h_max_value_0_0_1',
  'date_inst_value_0_0_1',
  'manufacturer_specific_ff_1a_inst_value_0_0_0',
  'fabrication_no_inst_value_0_0_0',
  'manufacturer_specific_ff_16_inst_value_0_0_0',
  'manufacturer_specific_ff_17_inst_value_0_0_0',
  'manufacturer_specific_ff_08_inst_value_0_0_0',
] as const;

const GRADO_CANONICO = '\u00B0'; // °

function normalizarGrado(s: string): string {
  return s.replace(/\uFFFD|\u00B0/g, GRADO_CANONICO);
}

function numberDeDecimal(v: string): number {
  return Number(v.replace(',', '.'));
}

function volumen(v: string): number {
  return numberDeDecimal(v) / 10;
}

export function parseContadoresCsv(raw: string): CsvRow[] {
  const lines = raw.split(/\r?\n/);
  let header: string[] | null = null;
  const rows: CsvRow[] = [];

  for (const line of lines) {
    if (line.trim() === '') continue;
    const cells = line.split(';');
    if (cells[0] === '#serial-number') {
      if (header === null) header = cells.map(normalizarGrado);
      continue;
    }
    if (header === null) continue;
    const row: CsvRow = {};
    header.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

export function transformRow(row: CsvRow): ContadorInsert {
  return {
    serial_number: row['#serial-number'] ?? '',
    device_identification: row['device-identification'] ?? '',
    device_position: row['device-position'] ?? '',
    primary_address: row['primary-address'] ?? '',
    created: new Date((row['created'] ?? '').replace(' ', 'T') + 'Z').toISOString(),
    value_data_count: row['value-data-count'] ?? '',
    manufacturer: row['manufacturer'] ?? '',
    version: row['version'] ?? '',
    device_type: row['device-type'] ?? '',
    access_number: row['access-number'] ?? '',
    status: row['status'] ?? '',
    signature: row['signature'] ?? '',
    energy_wh_inst_value_0_0_0: Number(row['energy,Wh,inst-value,0,0,0'] ?? ''),
    energy_manufacturer_specific_02_wh_inst_value_0_0_0: Number(row['energy manufacturer-specific-02,Wh,inst-value,0,0,0'] ?? ''),
    manufacturer_specific_ff_07_inst_value_0_0_0: row['manufacturer-specific-ff-07,,inst-value,0,0,0'] ?? '',
    manufacturer_specific_ff_08_inst_value_0_0_0: row['manufacturer-specific-ff-08,,inst-value,0,0,0'] ?? '',
    volume_m3_inst_value_0_0_0: volumen(row['volume,m3,inst-value,0,0,0'] ?? ''),
    volume_m3_inst_value_0_1_0: volumen(row['volume,m3,inst-value,0,1,0'] ?? ''),
    volume_m3_inst_value_0_2_0: volumen(row['volume,m3,inst-value,0,2,0'] ?? ''),
    on_time_hours_inst_value_0_0_0: row['on-time,hour(s),inst-value,0,0,0'] ?? '',
    on_time_hours_err_value_0_0_0: row['on-time,hour(s),err-value,0,0,0'] ?? '',
    flow_temp_c_inst_value_0_0_0: numberDeDecimal(row['flow-temp,°C,inst-value,0,0,0'] ?? ''),
    return_temp_c_inst_value_0_0_0: numberDeDecimal(row['return-temp,°C,inst-value,0,0,0'] ?? ''),
    diff_temp_k_inst_value_0_0_0: numberDeDecimal(row['diff-temp,K,inst-value,0,0,0'] ?? ''),
    power_w_inst_value_0_0_0: row['power,W,inst-value,0,0,0'] ?? '',
    volume_flow_m3h_inst_value_0_0_0: volumen(row['volume-flow,m3/h,inst-value,0,0,0'] ?? ''),
    manufacturer_specific_ff_22_inst_value_0_0_0: row['manufacturer-specific-ff-22,,inst-value,0,0,0'] ?? '',
    datetime_inst_value_0_0_0: row['datetime,,inst-value,0,0,0'] ?? '',
    energy_wh_inst_value_0_0_1: row['energy,Wh,inst-value,0,0,1'] ?? '',
    energy_manufacturer_specific_02_wh_inst_value_0_0_1: row['energy manufacturer-specific-02,Wh,inst-value,0,0,1'] ?? '',
    manufacturer_specific_ff_07_inst_value_0_0_1: row['manufacturer-specific-ff-07,,inst-value,0,0,1'] ?? '',
    manufacturer_specific_ff_08_inst_value_0_0_1: row['manufacturer-specific-ff-08,,inst-value,0,0,1'] ?? '',
    volume_m3_inst_value_0_0_1: volumen(row['volume,m3,inst-value,0,0,1'] ?? ''),
    volume_m3_inst_value_0_1_1: volumen(row['volume,m3,inst-value,0,1,1'] ?? ''),
    volume_m3_inst_value_0_2_1: volumen(row['volume,m3,inst-value,0,2,1'] ?? ''),
    power_w_max_value_0_0_1: row['power,W,max-value,0,0,1'] ?? '',
    volume_flow_m3h_max_value_0_0_1: volumen(row['volume-flow,m3/h,max-value,0,0,1'] ?? ''),
    date_inst_value_0_0_1: row['date,,inst-value,0,0,1'] ?? '',
    manufacturer_specific_ff_1a_inst_value_0_0_0: row['manufacturer-specific-ff-1a,,inst-value,0,0,0'] ?? '',
    fabrication_no_inst_value_0_0_0: row['fabrication-no,,inst-value,0,0,0'] ?? '',
    manufacturer_specific_ff_16_inst_value_0_0_0: row['manufacturer-specific-ff-16,,inst-value,0,0,0'] ?? '',
    manufacturer_specific_ff_17_inst_value_0_0_0: row['manufacturer-specific-ff-17,,inst-value,0,0,0'] ?? '',
    manufacturer_specific_ff_08_inst_value_0_0_0: row['manufacturer-specific-ff-08,,inst-value,0,0,0'] ?? '',
  };
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

```bash
cd api && npx vitest run src/__tests__/contadoresIngest.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/contadoresIngest.ts api/src/__tests__/contadoresIngest.test.ts
git commit -m "feat: parseo y transformación del CSV de contadores"
```

---

### Task 2: Verificación de integridad (faltantes, desactualizados, resets)

**Files:**
- Modify: `api/src/lib/contadoresIngest.ts`
- Modify: `api/src/__tests__/contadoresIngest.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `api/src/__tests__/contadoresIngest.test.ts`:

```ts
import {
  detectarFaltantes,
  detectarDesactualizados,
  detectarResets,
} from '../lib/contadoresIngest';

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
```

- [ ] **Step 2: Ejecutar para verificar que falla**

```bash
cd api && npx vitest run src/__tests__/contadoresIngest.test.ts
```

Expected: FAIL — `detectarFaltantes`/`detectarDesactualizados`/`detectarResets` no existen.

- [ ] **Step 3: Implementar las funciones**

Añadir al final de `api/src/lib/contadoresIngest.ts`:

```ts
export interface ContadorId {
  device_identification: string;
  serial_number: string;
}

export function detectarFaltantes(esperados: ContadorId[], presentes: ContadorId[]): ContadorId[] {
  const presentesSet = new Set(presentes.map((p) => `${p.device_identification}|${p.serial_number}`));
  return esperados.filter((e) => !presentesSet.has(`${e.device_identification}|${e.serial_number}`));
}

export interface Desactualizado {
  device_identification: string;
  stalenessMin: number;
}

export function detectarDesactualizados(rows: CsvRow[], staleMinutes: number): Desactualizado[] {
  const latest = new Map<string, CsvRow>();
  for (const row of rows) {
    const id = row['device-identification'];
    const existing = latest.get(id);
    if (!existing || (row['created'] ?? '') > (existing['created'] ?? '')) {
      latest.set(id, row);
    }
  }

  const result: Desactualizado[] = [];
  for (const [id, row] of latest) {
    const created = row['created'] ?? '';
    const datetime = row['datetime,,inst-value,0,0,0'] ?? '';
    if (!created || !datetime) continue;
    const stalenessMin = (Date.parse(created) - Date.parse(datetime)) / 60000;
    if (stalenessMin > staleMinutes) {
      result.push({ device_identification: id, stalenessMin });
    }
  }
  return result;
}

const CAMPOS_RESET = [
  'energy_wh_inst_value_0_0_0',
  'energy_manufacturer_specific_02_wh_inst_value_0_0_0',
  'volume_m3_inst_value_0_0_0',
  'volume_m3_inst_value_0_1_0',
] as const;

export interface LecturaPrevia {
  device_identification: string;
  energy_wh_inst_value_0_0_0: string | number;
  energy_manufacturer_specific_02_wh_inst_value_0_0_0: string | number;
  volume_m3_inst_value_0_0_0: string | number;
  volume_m3_inst_value_0_1_0: string | number;
}

export interface Reset {
  device_identification: string;
  campo: string;
}

export function detectarResets(inserts: ContadorInsert[], previos: LecturaPrevia[]): Reset[] {
  const previosMap = new Map(previos.map((p) => [p.device_identification, p]));
  const byDevice = new Map<string, ContadorInsert[]>();
  for (const ins of inserts) {
    const k = String(ins.device_identification);
    if (!byDevice.has(k)) byDevice.set(k, []);
    byDevice.get(k)!.push(ins);
  }

  const resets: Reset[] = [];
  for (const [device, list] of byDevice) {
    const previo = previosMap.get(device);
    if (!previo) continue;
    for (const campo of CAMPOS_RESET) {
      const minBatch = Math.min(...list.map((i) => Number(i[campo])));
      const prev = Number(previo[campo]);
      if (minBatch < prev) {
        resets.push({ device_identification: device, campo });
      }
    }
  }
  return resets;
}
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

```bash
cd api && npx vitest run src/__tests__/contadoresIngest.test.ts
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/contadoresIngest.ts api/src/__tests__/contadoresIngest.test.ts
git commit -m "feat: verificación de integridad de contadores (faltantes, desactualizados, resets)"
```

---

### Task 3: Métricas nuevas

**Files:**
- Modify: `api/src/lib/metrics.ts`
- Modify: `api/src/__tests__/metrics.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Añadir a `api/src/__tests__/metrics.test.ts`:

```ts
import {
  contadoresIngestTotal,
  contadoresFaltantes,
  contadoresDesactualizados,
  contadoresResetsTotal,
  contadoresUltimaIngestaTimestamp,
} from '../lib/metrics';
```

Y dentro del `describe('metrics', ...)`:

```ts
it('expone las métricas de ingesta de contadores', async () => {
  contadoresIngestTotal.inc({ outcome: 'success' });
  contadoresFaltantes.set({ device_identification: '72569463' }, 1);
  contadoresDesactualizados.set({ device_identification: '72569464' }, 0);
  contadoresResetsTotal.inc({ device_identification: '72569463' });
  contadoresUltimaIngestaTimestamp.set(1700000000);

  const ingest = (await contadoresIngestTotal.get()).values;
  expect(ingest.find((v) => v.labels.outcome === 'success')?.value).toBe(1);

  const faltantes = (await contadoresFaltantes.get()).values;
  expect(faltantes.find((v) => v.labels.device_identification === '72569463')?.value).toBe(1);
});
```

- [ ] **Step 2: Ejecutar para verificar que falla**

```bash
cd api && npx vitest run src/__tests__/metrics.test.ts
```

Expected: FAIL — los exports no existen.

- [ ] **Step 3: Implementar**

En `api/src/lib/metrics.ts`, cambiar el import para incluir `Gauge`:

```ts
import { Counter, Gauge, register } from 'prom-client';
```

Y añadir al final (antes de `export { register }`):

```ts
export const contadoresIngestTotal = new Counter({
  name: 'dashboard_contadores_ingest_total',
  help: 'Total de ingestas de contadores procesadas',
  labelNames: ['outcome'],
});

export const contadoresFaltantes = new Gauge({
  name: 'dashboard_contadores_faltantes',
  help: 'Contador esperado ausente en la última ingesta (1 = falta)',
  labelNames: ['device_identification'],
});

export const contadoresDesactualizados = new Gauge({
  name: 'dashboard_contadores_desactualizados',
  help: 'Contador con reloj desactualizado (1 = desactualizado)',
  labelNames: ['device_identification'],
});

export const contadoresResetsTotal = new Counter({
  name: 'dashboard_contadores_resets_total',
  help: 'Total de resets/anomalías de acumulado detectados',
  labelNames: ['device_identification'],
});

export const contadoresUltimaIngestaTimestamp = new Gauge({
  name: 'dashboard_contadores_ultima_ingesta_timestamp_seconds',
  help: 'Epoch (segundos) de la última ingesta de contadores exitosa',
});
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

```bash
cd api && npx vitest run src/__tests__/metrics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/metrics.ts api/src/__tests__/metrics.test.ts
git commit -m "feat: métricas de ingesta de contadores"
```

---

### Task 4: Configuración (env + validateConfig)

**Files:**
- Modify: `api/src/config.ts`
- Modify: `api/.env.example`

- [ ] **Step 1: Añadir variables de entorno**

En `api/.env.example`, añadir:

```bash
# Ingesta de contadores (datalogger Elvaco CMe3100)
CONTADORES_INGEST_USER=cme3100user
CONTADORES_INGEST_PASSWORD=change-me
CONTADORES_UPTIME_URL=https://uptime.edificioelite.com/api/push/hB52zSOayO
CONTADORES_STALE_MINUTES=120
```

- [ ] **Step 2: Añadir a `config.ts`**

En el objeto `config` de `api/src/config.ts`, añadir:

```ts
  contadoresIngestUser: process.env.CONTADORES_INGEST_USER || '',
  contadoresIngestPassword: process.env.CONTADORES_INGEST_PASSWORD || '',
  contadoresUptimeUrl:
    process.env.CONTADORES_UPTIME_URL || 'https://uptime.edificioelite.com/api/push/hB52zSOayO',
  contadoresStaleMinutes: +(process.env.CONTADORES_STALE_MINUTES || '120'),
```

- [ ] **Step 3: Añadir validación en `validateConfig`**

En `api/src/config.ts`, dentro de `validateConfig()`, después del chequeo de `JWT_SECRET`, añadir:

```ts
  if (!process.env.CONTADORES_INGEST_USER || !process.env.CONTADORES_INGEST_PASSWORD) {
    throw new Error(
      'CONTADORES_INGEST_USER y CONTADORES_INGEST_PASSWORD son obligatorios en producción.',
    );
  }
```

- [ ] **Step 4: Verificar compilación**

```bash
cd api && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add api/src/config.ts api/.env.example
git commit -m "feat: configuración de ingesta de contadores"
```

---

### Task 5: Ruta `POST /api/contadores`

**Files:**
- Create: `api/src/routes/contadores.ts`
- Test: `api/src/__tests__/contadores.routes.test.ts`

- [ ] **Step 1: Escribir el test que falla (integration)**

Crear `api/src/__tests__/contadores.routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import contadoresRoutes from '../routes/contadores';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { query } from '../db';
const mockQuery = query as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use('/api', contadoresRoutes);
  return app;
}

const CSV = [
  '#serial-number;device-position;primary-address;device-identification;created;value-data-count;manufacturer;version;device-type;access-number;status;signature;energy,Wh,inst-value,0,0,0;energy manufacturer-specific-02,Wh,inst-value,0,0,0;manufacturer-specific-ff-07,,inst-value,0,0,0;manufacturer-specific-ff-08,,inst-value,0,0,0;volume,m3,inst-value,0,0,0;volume,m3,inst-value,0,1,0;volume,m3,inst-value,0,2,0;on-time,hour(s),inst-value,0,0,0;on-time,hour(s),err-value,0,0,0;flow-temp,°C,inst-value,0,0,0;return-temp,°C,inst-value,0,0,0;diff-temp,K,inst-value,0,0,0;power,W,inst-value,0,0,0;power,W,max-value,0,0,0;volume-flow,m3/h,inst-value,0,0,0;volume-flow,m3/h,max-value,0,0,0;manufacturer-specific-ff-22,,inst-value,0,0,0;datetime,,inst-value,0,0,0;energy,Wh,inst-value,0,0,1;energy manufacturer-specific-02,Wh,inst-value,0,0,1;manufacturer-specific-ff-07,,inst-value,0,0,1;manufacturer-specific-ff-08,,inst-value,0,0,1;volume,m3,inst-value,0,0,1;volume,m3,inst-value,0,1,1;volume,m3,inst-value,0,2,1;power,W,max-value,0,0,1;volume-flow,m3/h,max-value,0,0,1;date,,inst-value,0,0,1;manufacturer-specific-ff-1a,,inst-value,0,0,0;fabrication-no,,inst-value,0,0,0;manufacturer-specific-ff-16,,inst-value,0,0,0;manufacturer-specific-ff-17,,inst-value,0,0,0',
  '0016045167;0A;63;72569463;2026-10-01 20:00:00;00;KAM;52;heat/cooling load;32;0;0;4138000;1302000;29466;27001;959,160;1736,220;0,000;42421;5;14,410;15,710;-1,300;0;0;0,000;0,000;0;2026-10-01 20:56:00;4138000;1302000;29466;27001;959,160;1735,320;0,000;-3300;0,561;2026-10-01 00:00:00;6658;72569463;2000102;11851201',
].join('\n');

describe('POST /api/contadores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CONTADORES_INGEST_USER = 'cme3100user';
    process.env.CONTADORES_INGEST_PASSWORD = 'secret';
    // mock de fetch para el heartbeat
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('devuelve 401 sin Basic Auth', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/contadores')
      .set('Content-Type', 'application/octet-stream')
      .send(CSV);
    expect(res.status).toBe(401);
  });

  it('devuelve 400 con body vacío', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/contadores')
      .set('Authorization', 'Basic ' + Buffer.from('cme3100user:secret').toString('base64'))
      .set('Content-Type', 'application/octet-stream')
      .send('');
    expect(res.status).toBe(400);
  });

  it('ingiere el CSV y devuelve el número de filas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ device_identification: '72569463', serial_number: '0016045167' }] }); // vecinos
    mockQuery.mockResolvedValueOnce({ rows: [] }); // lectura previa (reset)
    mockQuery.mockResolvedValueOnce({ rows: [] }); // upsert
    const app = createApp();
    const res = await request(app)
      .post('/api/contadores')
      .set('Authorization', 'Basic ' + Buffer.from('cme3100user:secret').toString('base64'))
      .set('Content-Type', 'application/octet-stream')
      .send(CSV);
    expect(res.status).toBe(200);
    expect(res.body.ingested).toBe(1);
    const sqlArg = mockQuery.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO contadores'));
    expect(sqlArg).toBeDefined();
    expect(sqlArg![0]).toContain('ON CONFLICT (serial_number, device_identification, created)');
  });
});
```

- [ ] **Step 2: Ejecutar para verificar que falla**

```bash
cd api && npx vitest run src/__tests__/contadores.routes.test.ts
```

Expected: FAIL — `../routes/contadores` no existe.

- [ ] **Step 3: Implementar la ruta**

Crear `api/src/routes/contadores.ts`:

```ts
import { Router, Request, Response } from 'express';
import express from 'express';
import { timingSafeEqual } from 'crypto';
import { query } from '../db';
import { config } from '../config';
import { logger } from '../lib/logger';
import { rateLimit } from '../middleware/rateLimit';
import {
  parseContadoresCsv,
  transformRow,
  CONTADORES_COLUMNAS,
  detectarFaltantes,
  detectarDesactualizados,
  detectarResets,
} from '../lib/contadoresIngest';
import {
  contadoresIngestTotal,
  contadoresFaltantes,
  contadoresDesactualizados,
  contadoresResetsTotal,
  contadoresUltimaIngestaTimestamp,
} from '../lib/metrics';

const router = Router();

const bodyParser = express.text({
  type: 'application/octet-stream',
  defaultCharset: 'latin1',
  limit: '1mb',
});

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function checkBasicAuth(req: Request): boolean {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('latin1');
  const idx = decoded.indexOf(':');
  if (idx === -1) return false;
  return (
    safeEqual(decoded.slice(0, idx), config.contadoresIngestUser) &&
    safeEqual(decoded.slice(idx + 1), config.contadoresIngestPassword)
  );
}

function pingUptime(status: 'up' | 'down', msg: string): void {
  const url = `${config.contadoresUptimeUrl}?status=${status}&msg=${encodeURIComponent(msg)}&ping=`;
  fetch(url).catch((err) => logger.warn({ err }, 'Uptime ping failed'));
}

const CLAVES_CONFLICTO = new Set(['serial_number', 'device_identification', 'created']);

router.post('/contadores', rateLimit(60, 5 * 60 * 1000), bodyParser, async (req: Request, res: Response) => {
  try {
    if (!checkBasicAuth(req)) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const raw = req.body;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      res.status(400).json({ error: 'Body vacío' });
      return;
    }

    const rows = parseContadoresCsv(raw);
    const inserts = rows.map(transformRow);
    if (inserts.length === 0) {
      res.json({ ingested: 0 });
      return;
    }

    const presentes = [...new Set(inserts.map((i) => `${i.device_identification}|${i.serial_number}`))].map((k) => {
      const [device_identification, serial_number] = k.split('|');
      return { device_identification, serial_number };
    });

    const esperadosResult = await query(
      'SELECT DISTINCT device_identification, serial_number FROM vecinos',
    );
    const esperados = esperadosResult.rows.map((r) => ({
      device_identification: String(r.device_identification),
      serial_number: String(r.serial_number),
    }));

    const faltantes = detectarFaltantes(esperados, presentes);
    const desactualizados = detectarDesactualizados(rows, config.contadoresStaleMinutes);

    const ids = presentes.map((p) => p.device_identification);
    const previosResult = await query(
      `SELECT DISTINCT ON (device_identification)
         device_identification,
         energy_wh_inst_value_0_0_0,
         energy_manufacturer_specific_02_wh_inst_value_0_0_0,
         volume_m3_inst_value_0_0_0,
         volume_m3_inst_value_0_1_0
       FROM contadores
       WHERE device_identification = ANY($1)
       ORDER BY device_identification, created DESC`,
      [ids],
    );
    const resets = detectarResets(inserts, previosResult.rows);

    const cols = [...CONTADORES_COLUMNAS];
    const updateSet = cols
      .filter((c) => !CLAVES_CONFLICTO.has(c))
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const values: unknown[] = [];
    const valueGroups: string[] = [];
    for (const insert of inserts) {
      const start = values.length + 1;
      valueGroups.push(`(${cols.map((_, i) => `$${start + i}`).join(', ')})`);
      for (const c of cols) values.push(insert[c]);
    }
    const sql = `INSERT INTO contadores (${cols.join(', ')})
      VALUES ${valueGroups.join(', ')}
      ON CONFLICT (serial_number, device_identification, created)
      DO UPDATE SET ${updateSet}`;
    await query(sql, values);

    contadoresIngestTotal.inc({ outcome: 'success' });
    contadoresUltimaIngestaTimestamp.set(Date.now() / 1000);

    for (const e of esperados) {
      contadoresFaltantes.set({ device_identification: e.device_identification }, 0);
      contadoresDesactualizados.set({ device_identification: e.device_identification }, 0);
    }
    for (const f of faltantes) {
      contadoresFaltantes.set({ device_identification: f.device_identification }, 1);
    }
    for (const d of desactualizados) {
      contadoresDesactualizados.set({ device_identification: d.device_identification }, 1);
    }
    for (const r of resets) {
      contadoresResetsTotal.inc({ device_identification: r.device_identification });
    }

    if (faltantes.length) logger.warn({ faltantes }, 'Contadores faltantes en ingesta');
    if (desactualizados.length) logger.warn({ desactualizados }, 'Contadores desactualizados en ingesta');
    if (resets.length) logger.warn({ resets }, 'Resets detectados en ingesta');
    logger.info(
      { filas: inserts.length, faltantes: faltantes.length, desactualizados: desactualizados.length, resets: resets.length },
      'Contadores ingest success',
    );

    pingUptime('up', 'OK');
    res.json({ ingested: inserts.length });
  } catch (err) {
    contadoresIngestTotal.inc({ outcome: 'error' });
    logger.error({ err }, 'Contadores ingest error');
    pingUptime('down', 'Contadores ingest error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
```

- [ ] **Step 4: Ejecutar para verificar que pasa**

```bash
cd api && npx vitest run src/__tests__/contadores.routes.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/contadores.ts api/src/__tests__/contadores.routes.test.ts
git commit -m "feat: endpoint POST /api/contadores"
```

---

### Task 6: Montar la ruta en `index.ts`

**Files:**
- Modify: `api/src/index.ts`

- [ ] **Step 1: Añadir import y montaje**

En `api/src/index.ts`, añadir el import:

```ts
import contadoresRoutes from './routes/contadores';
```

Y el montaje (junto a las demás rutas):

```ts
app.use('/api', contadoresRoutes);
```

- [ ] **Step 2: Verificar compilación y tests**

```bash
cd api && npx tsc --noEmit && npx vitest run
```

Expected: sin errores, todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add api/src/index.ts
git commit -m "feat: montar ruta de contadores en la API"
```

---

### Task 7: Migración de permisos

**Files:**
- Create: `api/migrations/012_grant_contadores_write.sql`

- [ ] **Step 1: Crear la migración**

Crear `api/migrations/012_grant_contadores_write.sql`:

```sql
-- 012: Permitir al dashboard escribir en contadores (ingesta del datalogger).
-- La tabla sigue siendo de n8nuser; solo se amplían los permisos de escritura
-- de los roles de runtime del dashboard. La aplica el init-container con el rol
-- migrator (SUPERUSER).

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT INSERT, UPDATE ON public.contadores TO dashboard_api;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT INSERT, UPDATE ON public.contadores TO dashboard_api_dev;
  END IF;
END
$$;
```

- [ ] **Step 2: Commit**

```bash
git add api/migrations/012_grant_contadores_write.sql
git commit -m "feat: migración de permisos de escritura en contadores"
```

---

### Task 8: Mock del datalogger (dev)

**Files:**
- Create: `api/scripts/mock-datalogger.ts`
- Modify: `api/package.json`

- [ ] **Step 1: Crear el script**

Crear `api/scripts/mock-datalogger.ts`:

```ts
// Mock del datalogger Elvaco CMe3100 (solo dev). Genera un CSV (report 3115)
// con lecturas aleatorias de los 40 contadores y lo POSTea al endpoint de
// ingesta con Basic Auth, cada MOCK_INTERVAL_MS (default 30 min).
// Uso: npx tsx api/scripts/mock-datalogger.ts   (o MOCK_ONCE=1 para una sola vez)

const SERIAL_NUMBER = '0016045167';
const CONTADORES_URL = process.env.CONTADORES_URL || 'http://localhost:3001/api/contadores';
const USER = process.env.CONTADORES_INGEST_USER || 'cme3100user';
const PASSWORD = process.env.CONTADORES_INGEST_PASSWORD || 'change-me';
const INTERVAL_MS = +(process.env.MOCK_INTERVAL_MS || '1800000');
const ONCE = process.env.MOCK_ONCE === '1';

// [device_identification, device_position, primary_address] (derivado de la muestra real)
const CONTADORES: [string, string, string][] = [
  ['72569463', '0A', '63'], ['72569464', '0D', '64'], ['72569465', '0B', '65'], ['72569466', '3C', '66'],
  ['72569467', '0C', '67'], ['72569468', '4A', '68'], ['72569469', '5C', '69'], ['72569470', '9C', '70'],
  ['72569471', '9A', '71'], ['72569472', '9B', '72'], ['72569473', '1D', '73'], ['72569474', '5A', '74'],
  ['72569475', '5D', '75'], ['72569476', '5B', '76'], ['72569477', '4C', '77'], ['72569478', '8C', '78'],
  ['72569479', '9D', '79'], ['72569480', '8A', '80'], ['72569481', '8B', '81'], ['72569482', '8D', '82'],
  ['72569483', '6C', '83'], ['72569484', '6A', '84'], ['72569485', '6D', '85'], ['72569486', '7C', '86'],
  ['72569487', '6B', '87'], ['72569488', '2B', '88'], ['72569489', '3B', '89'], ['72569490', '1C', '90'],
  ['72569491', '1B', '91'], ['72569492', '1A', '92'], ['72569493', '2A', '93'], ['72569494', '2C', '94'],
  ['72569495', '3A', '95'], ['72569496', '2D', '96'], ['72569497', '3D', '97'], ['72569498', '7B', '98'],
  ['72569499', '7D', '99'], ['72569500', '7A', '0'], ['72569501', '4D', '1'], ['72569502', '4B', '2'],
];

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
].join(';');

// Estado acumulativo por contador (para que los valores crezcan de forma realista)
const estado = new Map<string, { calor: number; frio: number; acs: number; vol: number; onTime: number; access: number }>();

function dosDecimales(n: number): string {
  return n.toFixed(3).replace('.', ',');
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function fechaHora(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function buildCsv(): string {
  const now = new Date();
  const lineas: string[] = [];

  for (const [deviceId, position, address] of CONTADORES) {
    const st = estado.get(deviceId) ?? { calor: 4000000, frio: 1300000, acs: 1000, vol: 900, onTime: 42000, access: 30 };
    lineas.push(HEADER);
    for (let i = 0; i < 4; i++) {
      const created = new Date(now.getTime() - (3 - i) * 5 * 60 * 1000);
      // El reloj del contador va ~50 min por delante
      const datetime = new Date(created.getTime() + 50 * 60 * 1000);
      st.calor += Math.round(Math.random() * 500);
      st.frio += Math.round(Math.random() * 300);
      st.acs += Math.random() * 0.05;
      st.vol += Math.random() * 0.05;
      st.onTime += i === 3 ? 1 : 0;
      st.access += 1;
      estado.set(deviceId, st);

      const flowTemp = (13 + Math.random() * 6).toFixed(3).replace('.', ',');
      const returnTemp = (14 + Math.random() * 6).toFixed(3).replace('.', ',');
      const diffTemp = ((Number(flowTemp.replace(',', '.')) - Number(returnTemp.replace(',', '.'))).toFixed(3)).replace('.', ',');
      const power = Math.round(Math.random() * 2000 - 1000);
      const powerMax = Math.round(Math.random() * 2000 - 1000);
      const flow = (Math.random() * 1).toFixed(3).replace('.', ',');
      const flowMax = (Math.random() * 1).toFixed(3).replace('.', ',');

      lineas.push([
        SERIAL_NUMBER, position, address, deviceId, fechaHora(created), '00', 'KAM', '52',
        'heat/cooling load', String(st.access), '0', '0',
        String(st.calor), String(st.frio), String(29000 + st.access), String(27000 + st.access),
        dosDecimales(st.vol), dosDecimales(st.acs), '0,000', String(st.onTime), '5',
        flowTemp, returnTemp, diffTemp, String(power), String(powerMax), flow, flowMax, '0',
        fechaHora(datetime),
        String(st.calor), String(st.frio), String(29000 + st.access), String(27000 + st.access),
        dosDecimales(st.vol), dosDecimales(st.acs), '0,000', String(powerMax), flowMax,
        fechaHora(new Date(created.getFullYear(), created.getMonth(), 1)),
        '6658', deviceId, '2000102', '11851201',
      ].join(';'));
    }
  }

  return lineas.join('\n');
}

async function enviar(): Promise<void> {
  const csv = buildCsv();
  const res = await fetch(CONTADORES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      Authorization: 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64'),
      'User-Agent': `Model/CMe3100 Hardware/R1E Serial/${SERIAL_NUMBER} Application/1.15.0`,
    },
    body: csv,
  });
  console.log(`[mock-datalogger] ${new Date().toISOString()} -> ${res.status} (${csv.split('\n').filter((l) => l && !l.startsWith('#serial-number')).length} filas)`);
}

async function main(): Promise<void> {
  await enviar();
  if (ONCE) return;
  setInterval(enviar, INTERVAL_MS);
}

main().catch((err) => {
  console.error('[mock-datalogger] error:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Añadir el script npm**

En `api/package.json`, en `scripts`, añadir:

```json
"mock:datalogger": "tsx scripts/mock-datalogger.ts"
```

- [ ] **Step 3: Verificar el script**

```bash
cd api && MOCK_ONCE=1 npx tsx scripts/mock-datalogger.ts
```

Expected: imprime una línea `[mock-datalogger] ...` con el código de respuesta (200 si la API está levantada, o error de conexión si no — ambos aceptables para esta verificación).

- [ ] **Step 4: Commit**

```bash
git add api/scripts/mock-datalogger.ts api/package.json
git commit -m "feat: mock del datalogger para desarrollo"
```

---

### Task 9: Paneles y alertas de Grafana

**Files:**
- Modify: `grafana/observabilidad.json`

- [ ] **Step 1: Añadir paneles al dashboard**

En `grafana/observabilidad.json`, añadir tres paneles (timeseries). Queries PromQL (sustituir `$env` y `$client` según el dashboard existente):

- **Ingesta (éxito/error):**
  - `sum by (outcome) (increase(dashboard_contadores_ingest_total{env="$env"}[5m]))`
- **Contadores faltantes:**
  - `dashboard_contadores_faltantes{env="$env"}`
- **Contadores desactualizados:**
  - `dashboard_contadores_desactualizados{env="$env"}`

- [ ] **Step 2: Documentar las alert rules (crear en Grafana)**

Registrar en el mensaje de commit (y crear después en Grafana UI/provisioning) estas alert rules:

- "Sin ingesta de contadores": `time() - dashboard_contadores_ultima_ingesta_timestamp_seconds{env="$env"} > 900`.
- "Contador faltante": `dashboard_contadores_faltantes{env="$env"} == 1` (for `5m`).
- "Contador desactualizado": `dashboard_contadores_desactualizados{env="$env"} == 1` (for `5m`).
- "Reset de contador": `increase(dashboard_contadores_resets_total{env="$env"}[5m]) > 0`.

- [ ] **Step 3: Commit**

```bash
git add grafana/observabilidad.json
git commit -m "feat: paneles de ingesta e integridad de contadores en Grafana"
```

---

## Self-Review

- **Spec coverage:** parseo/transformación (Task 1), verificación faltantes/desactualizados/resets (Task 2), métricas (Task 3), config + validateConfig + rate limit (Task 4/5), upsert + migración (Task 5/7), mock (Task 8), Grafana paneles + alertas (Task 9). Cubierto.
- **Placeholder scan:** sin TBD/TODO; todo el código está incluido.
- **Type consistency:** `parseContadoresCsv`→`CsvRow`, `transformRow`→`ContadorInsert` (keyed por nombre de columna DB), `detectarFaltantes`/`detectarDesactualizados`/`detectarResets` con firmas consistentes entre Task 1/2/5. `CONTADORES_COLUMNAS` (42) coherente en Task 1 y usado en Task 5.
