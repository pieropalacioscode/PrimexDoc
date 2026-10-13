//frontend > src > app > (dashboard) > examenes >  SequenceLaunch.tsx
'use client';
import React, { useEffect, useState } from 'react';

export const SequenceLaunch = ({ onComplete }: { onComplete: () => void }) => {
  const [count, setCount] = useState(3);
  const [text, setText] = useState('PREPARANDO SISTEMA...');

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev === 1) {
          setText('¡ARRANQUE!');
          setTimeout(onComplete, 800);
          clearInterval(timer);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A1628] flex flex-col items-center justify-center font-mono">
      {/* Efecto de líneas CRT */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      <div className="relative">
        {/* Glow retro */}
        <div className="absolute inset-0 blur-2xl bg-cyan-500/20 rounded-full animate-pulse" />

        <div className="relative border-4 border-cyan-500 p-10 md:p-20 text-center bg-black/40 backdrop-blur-md rounded-lg shadow-[0_0_50px_rgba(34,211,238,0.3)]">
          <p className="text-cyan-400 text-sm md:text-lg mb-4 tracking-[0.3em] font-black uppercase">
            {text}
          </p>
          <h1 className="text-8xl md:text-[12rem] font-black text-white leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
            {count > 0 ? count : 'GO'}
          </h1>
          <div className="mt-8 flex gap-2 justify-center">
            <div className={`h-2 w-8 ${count <= 3 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
            <div className={`h-2 w-8 ${count <= 2 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
            <div className={`h-2 w-8 ${count <= 1 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
          </div>
        </div>
      </div>

      <p className="mt-10 text-slate-500 text-[10px] tracking-widest uppercase">
        Iniciando Protocolo de Evaluación Profesional v6.5
      </p>
    </div>
  );
};