// src/components/analytics/SemaforoDebilidades.tsx
export function SemaforoDebilidades({ data }: { data: any[] }) {
  // Filtramos áreas con menos del 50%
  const debilidades = data.filter(d => d.porcentaje < 50);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-700 uppercase">⚠️ Temas Críticos a Reforzar</h3>
      {debilidades.length === 0 ? (
        <p className="text-green-600 text-sm italic">¡Excelente! No tienes áreas críticas.</p>
      ) : (
        debilidades.map(d => (
          <div key={d.area} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
            <div>
              <p className="text-sm font-bold text-red-700">{d.area}</p>
              <p className="text-xs text-red-500">Dominio: {d.porcentaje}%</p>
            </div>
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          </div>
        ))
      )}
    </div>
  );
}