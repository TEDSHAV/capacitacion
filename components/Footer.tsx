import Link from "next/link";
import { getBuildDetail, getBuildId } from "@/lib/app-version";

const Footer = () => {
  const currentYear = new Date().getFullYear()

  // Compact build id, e.g. "v1.5.0 · 11/08/2026"
  const buildId = getBuildId();

  return (
    <footer className="bg-transparent border-t border-blue-100/50">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <div>
            © {currentYear} SHA de Venezuela, C.A. Todos los derechos reservados.
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {buildId && (
              <span
                className="text-xs text-gray-400 font-mono tabular-nums"
                title={getBuildDetail()}
              >
                {buildId}
              </span>
            )}
            <Link
              href="/portal/cliente/login"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Verificar Certificado
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
