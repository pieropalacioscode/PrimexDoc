'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[32px] shadow-sm border border-slate-200">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            Política de <span className="text-blue-600">Privacidad</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mb-6 sm:mb-8">
            Última actualización: {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
            <p>
              En cumplimiento de la <strong>Ley N° 29733 (Ley de Protección de Datos
              Personales)</strong> y su Reglamento, <strong>GRUPO EMPRESARIAL KELPAD S.R.L.</strong>{' '}
              (RUC 20613771591), titular del banco de datos personales de DocenteSmart /
              PrimexDoc, informa la presente política a los usuarios de la Plataforma.
            </p>

            <section>
              <h2 className="font-bold text-slate-900 mb-2 text-sm">
                Datos que recopilamos
              </h2>
              <p>
                Recopilamos únicamente los datos necesarios para la prestación del
                servicio: nombre completo, correo electrónico, número de contacto,
                información de pago (sin almacenar datos completos de tarjetas), y
                progreso académico dentro de la Plataforma (resultados de simulacros,
                estadísticas de desempeño).
              </p>
            </section>

            <section className="bg-blue-50 p-5 sm:p-6 rounded-2xl border border-blue-100">
              <h2 className="font-bold text-blue-900 mb-2">
                Transferencia Internacional de Datos
              </h2>
              <p className="text-blue-800">
                Para el correcto funcionamiento de la Plataforma, sus datos personales son
                objeto de una transferencia internacional a los servidores de{' '}
                <strong>Hostinger International Ltd. (EE.UU./Brasil)</strong> y{' '}
                <strong>Cloudflare Inc. (EE.UU.)</strong>, quienes actúan como encargados de
                tratamiento bajo relaciones contractuales que exigen estándares de
                seguridad y confidencialidad equivalentes a los previstos en la
                legislación peruana.
              </p>
            </section>

            <section className="bg-emerald-50 p-5 sm:p-6 rounded-2xl border border-emerald-100">
              <h2 className="font-bold text-emerald-900 mb-2">
                Medidas de Seguridad
              </h2>
              <p className="text-emerald-900 mb-2">
                Aplicamos medidas técnicas y organizativas razonables para proteger sus
                datos personales frente a accesos no autorizados, pérdida o alteración:
              </p>
              <ul className="text-emerald-900 space-y-1.5 list-disc list-inside">
                <li>
                  Su contraseña se almacena mediante un proceso de cifrado
                  unidireccional (hashing) con algoritmos estándar de la industria. Esto
                  significa que <strong>ni el personal de Grupo Empresarial Kelpad S.R.L.
                  puede visualizar su contraseña original</strong> en ningún momento, ni
                  siquiera para fines de soporte técnico.
                </li>
                <li>
                  Las comunicaciones entre su dispositivo y nuestros servidores viajan
                  cifradas (protocolo HTTPS/TLS).
                </li>
                <li>
                  El acceso a la información almacenada está restringido mediante
                  controles de autenticación y permisos.
                </li>
                <li>
                  Si inicia sesión mediante un proveedor externo (por ejemplo, Google),
                  DocenteSmart no almacena ni tiene acceso a la contraseña de dicha
                  cuenta; la autenticación es gestionada directamente por el proveedor
                  correspondiente.
                </li>
              </ul>
              <p className="text-emerald-900 mt-2">
                Ningún sistema es infalible. Ante cualquier incidente de seguridad que
                comprometa datos personales, notificaremos a los usuarios afectados y a
                la autoridad competente conforme a lo exigido por la Ley N° 29733.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 mb-2 text-sm">
                Finalidad del tratamiento
              </h2>
              <p>
                Sus datos se usan exclusivamente para: (i) brindar acceso a los servicios
                contratados, (ii) generar reportes de desempeño académico, (iii) enviar
                comunicaciones relacionadas con su cuenta o plan, y (iv), solo con
                consentimiento previo, enviar comunicaciones comerciales sobre nuevos
                servicios.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 mb-2 text-sm">
                Sus derechos ARCO
              </h2>
              <p>
                Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y
                Oposición (ARCO), así como revocar su consentimiento en cualquier momento,
                escribiendo a <strong>soporte@docentesmart.com</strong>. Atenderemos su
                solicitud dentro de los plazos establecidos por la Ley N° 29733.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}