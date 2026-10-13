//frontend > src > components > marketing > WhatsappButton.tsx

"use client";
import { MessageCircle } from 'lucide-react';

export const WhatsappButton = () => {
  return (
    <a
      href="https://wa.me/pieropalacios.neo?text=Hola%2C%20tengo%20una%20duda%20sobre%20DocenteSmart"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-50 bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-600 hover:-translate-y-2 transition-all flex items-center justify-center animate-bounce"
      title="¿Necesitas ayuda?"
      aria-label="Contactar a DocenteSmart por WhatsApp"
    >
      <MessageCircle size={32} />
    </a>
  );
};