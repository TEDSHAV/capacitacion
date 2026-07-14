export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-muted/50 shadow-md border-t">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-muted-foreground">
          © {currentYear} SHA de Venezuela, C.A. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
