"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  data: { subprueba: string; porcentaje_exito: number }[];
}

export const RadarDesempeño = ({ data }: Props) => {
  // Mapeamos los datos para el gráfico
  const chartData = data.map(item => ({
    subject: item.subprueba,
    A: item.porcentaje_exito,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
          <Radar
            name="Desempeño"
            dataKey="A"
            stroke="#1e40af"
            fill="#3b82f6"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};