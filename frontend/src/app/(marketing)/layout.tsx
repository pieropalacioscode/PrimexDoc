import { Metadata } from 'next';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { WhatsappButton } from '@/components/marketing/WhatsappButton';

export const metadata: Metadata = {
  title: 'DocenteSmart | Simulacro de Nombramiento y Ascenso Docente 2024',
  description: 'Prepárate con simulacros interactivos y exámenes en PDF basados en pruebas reales del MINEDU. La plataforma #1 para el nombramiento docente.',
  keywords: ['nombramiento docente', 'examen de ascenso', 'simulacro docente pdf', 'examen minedu 2024'],
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      <Navbar />
      {children}
      <Footer />
      <WhatsappButton />
    </div>
  );
}