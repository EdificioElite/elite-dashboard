interface ConsumoActual {
  timestamp: string;
  kwh_electrico: number;
  kwh_acs: number;
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Electricidad</p>
          <p className="text-3xl font-bold text-blue-600">
            {Number(data.kwh_electrico).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">kWh</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">ACS (Agua Caliente)</p>
          <p className="text-3xl font-bold text-orange-500">
            {Number(data.kwh_acs).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">kWh</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Actualizado: {new Date(data.timestamp).toLocaleString('es-ES')}
      </p>
    </div>
  );
}
