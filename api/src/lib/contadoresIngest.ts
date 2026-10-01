export type CsvRow = Record<string, string>;

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
] as const;

export type ContadorColumn = (typeof CONTADORES_COLUMNAS)[number];

export type ContadorInsert = Record<ContadorColumn, string | number>;

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
  };
}
