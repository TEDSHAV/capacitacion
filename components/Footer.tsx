export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-gray-50 shadow-md">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-600">
          © {currentYear} SHA de Venezuela, C.A. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
