export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Moon Guide AI. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-sm text-gray-500 transition-colors hover:text-gray-200"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-gray-500 transition-colors hover:text-gray-200"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-sm text-gray-500 transition-colors hover:text-gray-200"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}