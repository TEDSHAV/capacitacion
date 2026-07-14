import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-transparent border-t border-blue-100/50">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <div>
            © {currentYear} SHA de Venezuela, C.A. Todos los derechos reservados.
          </div>
          <div className="flex gap-6">
            <Link
              href="/consultar"
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
