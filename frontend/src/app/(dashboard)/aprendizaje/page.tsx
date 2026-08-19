"use client";
import { Info, Calculator, Award, BookOpen, AlertCircle, GraduationCap } from 'lucide-react';

const calculos = [
  { area: "Habilidades Generales", preguntas: 25, puntos: 2, total: 50 },
  { area: "Conocimientos Pedagógicos", preguntas: 50, puntos: 3, total: 150 },
];

export default function AprendizajePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <header className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Aprendizaje</h1>
        <p className="text-slate-500 font-medium">Todo lo que necesitas saber sobre la Evaluación Docente</p>
      </header>

      {/* Explicación de Puntajes */}
      <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <Calculator className="text-blue-600" /> ¿Cómo se calcula tu puntaje?
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black">
              <tr>
                <th className="px-6 py-4">Subprueba</th>
                <th className="px-6 py-4">Preguntas</th>
                <th className="px-6 py-4">Ptos por pregunta</th>
                <th className="px-6 py-4">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-slate-700">
              {calculos.map((c, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="px-6 py-4">{c.area}</td>
                  <td className="px-6 py-4">{c.preguntas}</td>
                  <td className="px-6 py-4">+{c.puntos}</td>
                  <td className="px-6 py-4 text-blue-600">{c.total} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800 text-sm">
          <AlertCircle className="shrink-0" />
          <p><strong>Nota importante:</strong> El puntaje mínimo para aprobar la etapa nacional es de 110 puntos en Conocimientos Pedagógicos.</p>
        </div>
      </section>

      {/* Temario y CNEB */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4"><BookOpen size={20}/></div>
          <h3 className="font-bold text-slate-900 mb-2">Enfoque del CNEB</h3>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            El Currículo Nacional se basa en un enfoque por competencias. No basta con saber el concepto, sino saber aplicarlo en casos pedagógicos reales.
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
          <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center mb-4"><Award size={20}/></div>
          <h3 className="font-bold text-slate-900 mb-2">Rúbricas de Desempeño</h3>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            Entender las rúbricas es clave para el ascenso. Evaluamos: Involucramiento activo, razonamiento crítico y respeto mutuo.
          </p>
        </div>
      </section>
    </div>
  );
}