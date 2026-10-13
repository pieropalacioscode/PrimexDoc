'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="bg-white p-6 sm:p-8 md:p-12 rounded-3xl sm:rounded-[32px] shadow-sm border border-slate-200">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 italic">
            Términos y <span className="text-blue-600">Condiciones</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mb-6 sm:mb-8">
            Última actualización: {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
            <section>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs mb-2">
                1. Información del Proveedor
              </h2>
              <p>
                El sitio web y aplicación DocenteSmart / PrimexDoc ("la Plataforma") es operado por{' '}
                <strong>GRUPO EMPRESARIAL KELPAD S.R.L.</strong>, con RUC{' '}
                <strong>20613771591</strong>, domiciliado en Jr. Calixto Nro. 563, Huancayo, Junín, Perú.
                "DocenteSmart" y "PrimexDoc" son marcas comerciales bajo las cuales
                Grupo Empresarial Kelpad S.R.L. ofrece sus servicios educativos y
                tecnológicos, distintas del nombre comercial registrado ante SUNAT
                para otras líneas de negocio de la misma empresa.
              </p>
              <p className="mt-3">
                Canal de atención al usuario: correo electrónico{' '}
                <strong>soporte@docentesmart.com</strong> y WhatsApp de atención al cliente.
                Toda comunicación comercial oficial de la Plataforma se realiza
                exclusivamente a través de estos canales.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs mb-2">
                2. Descripción y Alcance del Servicio
              </h2>
              <p className="mb-3">
                DocenteSmart ofrece una plataforma digital de <strong>preparación y apoyo pedagógico</strong>{' '}
                para docentes que rinden evaluaciones de la Carrera Pública Magisterial
                (Nombramiento, Ascenso de Escala y procesos afines regulados por el MINEDU),
                así como servicios complementarios de asesoría tecnológica, elaboración de
                documentos pedagógicos y plantillas de gestión docente.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="font-bold text-emerald-800 text-xs uppercase tracking-widest mb-2">
                    El plan incluye
                  </p>
                  <ul className="text-emerald-900 text-xs space-y-1.5 list-disc list-inside">
                    <li>Acceso a simulacros y banco de preguntas según el plan contratado</li>
                    <li>Retroalimentación automática y sustento pedagógico de respuestas</li>
                    <li>Reportes de desempeño individual dentro de la Plataforma</li>
                  </ul>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <p className="font-bold text-rose-800 text-xs uppercase tracking-widest mb-2">
                    El plan NO incluye
                  </p>
                  <ul className="text-rose-900 text-xs space-y-1.5 list-disc list-inside">
                    <li>Garantía de aprobación, ingreso, nombramiento o ascenso</li>
                    <li>Asesoría legal, administrativa o representación ante el MINEDU</li>
                    <li>Corrección de errores propios de la convocatoria oficial</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-amber-50 p-4 sm:p-5 rounded-2xl border border-amber-100 text-amber-900">
              <h2 className="font-bold uppercase tracking-widest text-xs mb-2">
                3. Limitación de Responsabilidad y Ausencia de Garantía de Resultados
              </h2>
              <p className="mb-2">
                El contenido de la Plataforma constituye <strong>material de apoyo y
                entrenamiento pedagógico de carácter referencial</strong>, elaborado con
                fines educativos. El desempeño del usuario en cualquier evaluación oficial
                del MINEDU depende de múltiples factores ajenos a la Plataforma (preparación
                previa, condiciones del examen, criterios de calificación oficial, entre otros),
                por lo que <strong>Grupo Empresarial Kelpad S.R.L. no garantiza, promete ni
                asegura resultados específicos</strong>, incluyendo pero no limitado a la
                aprobación, el nombramiento, el ascenso de escala o la obtención de un
                puntaje determinado.
              </p>
              <p className="mb-2">
                Los exámenes, temarios, cronogramas y criterios de evaluación oficiales son
                competencia exclusiva del Ministerio de Educación del Perú (MINEDU) y de las
                entidades públicas correspondientes. La Plataforma no tiene vínculo,
                representación ni afiliación oficial con el MINEDU ni con ninguna entidad
                del Estado peruano.
              </p>
              <p>
                En la máxima medida permitida por la ley, la responsabilidad total de Grupo
                Empresarial Kelpad S.R.L. frente al usuario, por cualquier concepto
                relacionado con el uso de la Plataforma, se limita al monto efectivamente
                pagado por el usuario en el plan contratado durante los últimos doce (12)
                meses. Grupo Empresarial Kelpad S.R.L. no será responsable por daños
                indirectos, lucro cesante, pérdida de oportunidad laboral o daños
                emergentes derivados del resultado de una evaluación oficial.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs mb-2">
                4. Planes y Pagos
              </h2>
              <p>
                Los precios vigentes son: Plan Mensual (S/ 7.00), Plan Semestral (S/ 15.00) y
                Plan Anual (S/ 25.00), expresados en Soles peruanos (PEN) e incluyendo los
                tributos de ley cuando corresponda. El pago es único por el periodo
                contratado y se realiza vía transferencia bancaria o billeteras digitales
                (Yape/Plin). El usuario es responsable de verificar la exactitud de los
                datos de pago antes de confirmar la transacción.
              </p>
            </section>

            <section className="bg-rose-50 p-4 sm:p-5 rounded-2xl border border-rose-100 text-rose-900">
              <h2 className="font-bold uppercase tracking-widest text-xs mb-2">
                5. Política de No Reembolso
              </h2>
              <p className="mb-2">
                PrimexDoc / DocenteSmart presta un <strong>servicio de contenido digital de
                acceso y ejecución inmediata</strong>. Al confirmar el pago y activar el plan,
                el usuario manifiesta su <strong>consentimiento expreso y previo</strong> para
                que la prestación del servicio se inicie de inmediato, y reconoce
                expresamente que, conforme a la naturaleza de los contenidos digitales,
                <strong> pierde el derecho de desistimiento o devolución</strong> una vez
                iniciado el acceso al material, simulacros o herramientas contratadas.
              </p>
              <p>
                No procederán reembolsos por insatisfacción subjetiva con el resultado
                obtenido en una evaluación oficial, por no uso del plan durante su vigencia,
                ni por errores atribuibles al usuario en la contratación (selección de plan
                incorrecto, datos de pago erróneos, etc.). Casos excepcionales de error
                técnico comprobado imputable a la Plataforma serán evaluados de forma
                individual, a través del canal de soporte oficial.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs mb-2">
                6. Propiedad Intelectual
              </h2>
              <p>
                Los exámenes recopilados provienen de fuentes de dominio público (MINEDU).
                La organización, estructura, redacción de sustentos pedagógicos, motor de
                análisis de datos, diseño de interfaz y software de la Plataforma son
                propiedad exclusiva de Grupo Empresarial Kelpad S.R.L. y están protegidos
                por la legislación peruana de derechos de autor. Queda prohibida su
                reproducción, distribución o explotación comercial sin autorización expresa.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs mb-2">
                7. Uso Aceptable y Cuenta del Usuario
              </h2>
              <p>
                El usuario declara ser mayor de edad y responsable del uso de su cuenta.
                Está prohibido compartir credenciales de acceso, revender el acceso al
                plan contratado, o intentar vulnerar la seguridad de la Plataforma.
                Grupo Empresarial Kelpad S.R.L. se reserva el derecho de suspender cuentas
                que incumplan estos Términos, sin que ello genere derecho a reembolso.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs mb-2">
                8. Modificaciones
              </h2>
              <p>
                Grupo Empresarial Kelpad S.R.L. podrá actualizar estos Términos y
                Condiciones en cualquier momento para reflejar cambios legales, técnicos
                o del servicio. Los cambios entran en vigencia desde su publicación en esta
                página, indicando la fecha de última actualización. El uso continuado de la
                Plataforma tras la publicación de cambios implica su aceptación.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs mb-2">
                9. Ley Aplicable y Solución de Controversias
              </h2>
              <p>
                Estos Términos se rigen por las leyes de la República del Perú. Ante
                cualquier controversia, el usuario podrá acudir en primer lugar al canal de
                soporte de la Plataforma (soporte@docentesmart.com) para buscar una
                solución directa, sin perjuicio de su derecho a presentar su reclamo ante
                el Libro de Reclamaciones Virtual o ante INDECOPI, conforme a la Ley N° 29571.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}