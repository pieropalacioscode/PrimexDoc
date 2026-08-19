"use client";
import { MessageCircle } from 'lucide-react';

export const WhatsappButton = () => {
  return (
    <a 
      href="https://wa.me/51999999999?text=Hola,tengo_una_duda_sobre_DocenteSmart" 
      target="_blank"
      className="fixed bottom-8 right-8 z-50 bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-600 hover:-translate-y-2 transition-all flex items-center justify-center animate-bounce"
      title="¿Necesitas ayuda?"
    >
      <MessageCircle size={32} />
    </a>
  );
};