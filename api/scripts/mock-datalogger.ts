// Mock del datalogger Elvaco CMe3100 (solo dev). Genera un CSV (report 3115)
// con lecturas aleatorias de los 40 contadores y lo POSTea al endpoint de
// ingesta con Basic Auth, cada MOCK_INTERVAL_MS (default 30 min).
// Uso: npx tsx scripts/mock-datalogger.ts   (o MOCK_ONCE=1 para una sola vez)

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
      const diffTemp = (Number(flowTemp.replace(',', '.')) - Number(returnTemp.replace(',', '.'))).toFixed(3).replace('.', ',');
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
  const filas = csv.split('\n').filter((l) => l && !l.startsWith('#serial-number')).length;
  console.log(`[mock-datalogger] ${new Date().toISOString()} -> ${res.status} (${filas} filas)`);
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
