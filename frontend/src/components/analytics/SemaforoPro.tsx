// src/components/analytics/SemaforoPro.tsx

export function SemaforoPro({ componentes }: { componentes: any[] }) {
  return (
    <div className="grid gap-3">
      {componentes.map((item) => {
        const isLow = item.porcentaje < 50;
        const isMid = item.porcentaje >= 50 && item.porcentaje < 75;
        
        return (
          <div 
            key={item.componente} 
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isLow ? 'bg-red-50 border-red-100' : 
              isMid ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
            }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">{item.subprueba}</p>
              <h4 className={`font-bold ${isLow ? 'text-red-700' : isMid ? 'text-amber-700' : 'text-emerald-700'}`}>
                {item.componente}
              </h4>
            </div>
            <div className="text-right">
              <span className={`text-lg font-black ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                {item.porcentaje}%
              </span>
              <p className="text-[10px] text-slate-500">{item.aciertos}/{item.total} aciertos</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}