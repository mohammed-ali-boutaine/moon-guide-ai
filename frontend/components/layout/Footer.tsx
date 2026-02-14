export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Moon Guide AI. Tous droits réservés.
          </p>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-sm text-gray-600 transition-colors hover:text-primary-600"
            >
              Confidentialité
            </a>
            <a
              href="#"
              className="text-sm text-gray-600 transition-colors hover:text-primary-600"
            >
              Conditions
            </a>
            <a
              href="#"
              className="text-sm text-gray-600 transition-colors hover:text-primary-600"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
