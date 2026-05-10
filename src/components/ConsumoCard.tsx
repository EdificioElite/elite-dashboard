interface ConsumoActual {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
  temp_impulsion: number | null;
  temp_retorno: number | null;
  power_w: number | null;
}

export default function ConsumoCard({ data }: { data: ConsumoActual | null }) {
  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500">No hay datos de consumo disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Consumo actual</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500">Calefaccion</p>
          <p className="text-3xl font-bold text-red-500">
            {Number(data.kwh_calor).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">kWh</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Refrigeracion</p>
          <p className="text-3xl font-bold text-blue-500">
            {Number(data.kwh_frio).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">kWh</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">ACS (Agua Caliente)</p>
          <p className="text-3xl font-bold text-orange-500">
            {Number(data.kwh_acs).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">kWh / {Number(data.m3_acs).toFixed(3)} m³</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${data.power_w != null && Number(data.power_w) > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-gray-400">
              {data.power_w != null && Number(data.power_w) > 0
                ? `${Number(data.power_w).toFixed(0)} W`
                : 'Apagado'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Impulsion: </span>
            <span className="font-semibold text-red-400">
              {data.temp_impulsion != null ? `${Number(data.temp_impulsion).toFixed(1)} °C` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Retorno: </span>
            <span className="font-semibold text-blue-400">
              {data.temp_retorno != null ? `${Number(data.temp_retorno).toFixed(1)} °C` : '—'}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Actualizado: {new Date(data.timestamp).toLocaleString('es-ES')}
      </p>
    </div>
  );
}
