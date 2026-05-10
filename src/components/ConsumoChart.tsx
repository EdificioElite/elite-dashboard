import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

type Range = 'dia' | 'semana' | 'mes';

export default function ConsumoChart({ data }: { data: Consumo[] }) {
  const [range, setRange] = useState<Range>('semana');

  const filtered = useMemo(() => {
    if (data.length === 0) return [];
    const now = new Date(data[data.length - 1].timestamp);
    const cutoffs: Record<Range, Date> = {
      dia: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      semana: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      mes: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };
    return data.filter(
      (d) => new Date(d.timestamp) >= cutoffs[range]
    );
  }, [data, range]);

  const formatted = useMemo(
    () =>
      filtered.map((d) => ({
        ...d,
        timestamp: new Date(d.timestamp).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          hour: range === 'dia' ? '2-digit' : undefined,
          minute: range === 'dia' ? '2-digit' : undefined,
        }),
      })),
    [filtered, range]
  );

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500">No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          Consumo termico y ACS
        </h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="dia">Hoy</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="kwh_calor"
            name="Calefaccion"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="kwh_frio"
            name="Refrigeracion"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="kwh_acs"
            name="ACS"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
