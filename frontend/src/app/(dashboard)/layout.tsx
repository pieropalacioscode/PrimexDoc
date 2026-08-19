import { Navbar } from "@/components/marketing/Navbar";
import { Sidebar } from "lucide-react";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar Superior Universal */}
      <Navbar />

      <div className="flex flex-1">
        {/* Sidebar Lateral */}
        <Sidebar />

        {/* Contenido Principal */}
        <main className="flex-1 bg-slate-50 p-6 md:p-10 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}