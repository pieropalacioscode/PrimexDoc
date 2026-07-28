import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // <-- Agregar la diagonal '/'
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PrimexDoc | Simulacros para Docentes Peruanos',
  description: 'Plataforma de preparación para la Prueba Nacional EBR - Minedu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}