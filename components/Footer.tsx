import { getBuildDetail, getBuildId } from "@/lib/app-version";

const Footer = () => {
  const currentYear = new Date().getFullYear()

  // Compact build id, e.g. "v1.5.0 · 11/08/2026"
  const buildId = getBuildId();

  return (
    <footer className="bg-transparent border-t border-blue-100/50">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4 text-sm text-gray-600 text-center">
          <div>
            © {currentYear} SHA de Venezuela, C.A. Todos los derechos reservados.
          </div>
          {buildId && (
            <span
              className="text-xs text-gray-400 font-mono tabular-nums"
              title={getBuildDetail()}
            >
              {buildId}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}

export default Footer
