"use client";
import { useEffect, useState } from 'react';
import { getFavoritos, toggleFavorito, ExamenResumen } from '@/services/historialService';
import { Bookmark, BookmarkX, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function MisGuardadosPage() {
  const [favoritos, setFavoritos] = useState<ExamenResumen[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarFavoritos = async () => {
    try {
      const data = await getFavoritos();
      setFavoritos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFavoritos();
  }, []);

  const handleRemove = async (id: string) => {
    await toggleFavorito(id);
    setFavoritos(prev => prev.filter(f => f.id !== id)); // Lo quitamos de la lista localmente
  };

  if (loading) return <div className="p-8 text-center">Cargando tus favoritos...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-8 flex items-center gap-3">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
          <Bookmark size={24} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Guardados</h1>
          <p className="text-gray-600">Accede rápidamente a tus exámenes seleccionados</p>
        </div>
      </header>

      {favoritos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookmarkX size={32} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No tienes exámenes guardados</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Guarda exámenes desde el catálogo haciendo clic en el icono de marcador para verlos aquí.
          </p>
          <Link href="/examenes" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Explorar Catálogo <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritos.map((examen) => (
            <div key={examen.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative group">
              <button 
                onClick={() => handleRemove(examen.id)}
                className="absolute top-4 right-4 text-amber-500 hover:text-amber-600 transition-colors"
                title="Quitar de favoritos"
              >
                <Bookmark size={20} fill="currentColor" />
              </button>
              
              <div className="mb-4">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase">
                  {examen.tipo}
                </span>
              </div>
              
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 pr-6">
                {examen.titulo}
              </h3>
              
              <div className="text-sm text-gray-500 mb-6">
                {examen.nivel} • {examen.anio}
              </div>

              <Link 
                href={`/examenes/${examen.id}`}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
              >
                Comenzar Examen
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}