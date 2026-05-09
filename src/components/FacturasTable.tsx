interface Factura {
  id: number;
  periodo: string;
  importe: number;
  kwh_electrico: number;
  kwh_acs: number;
}

export default function FacturasTable({ data }: { data: Factura[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Facturas</h2>
        <p className="text-gray-500">No hay facturas disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Facturas</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">kWh Elec.</th>
              <th className="px-4 py-2">kWh ACS</th>
              <th className="px-4 py-2">Importe</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f) => (
              <tr key={f.id} className="border-b">
                <td className="px-4 py-2">
                  {new Date(f.periodo).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </td>
                <td className="px-4 py-2">{Number(f.kwh_electrico).toFixed(2)}</td>
                <td className="px-4 py-2">{Number(f.kwh_acs).toFixed(2)}</td>
                <td className="px-4 py-2 font-medium">{Number(f.importe).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
