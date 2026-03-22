export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-zinc-200 bg-zinc-50 py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">About</h3>
            <p className="mt-2 text-xs text-zinc-600">
              DomainRadar helps you discover, filter, and manage premium domain
              names with advanced search capabilities.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Features</h3>
            <ul className="mt-2 space-y-1 text-xs text-zinc-600">
              <li>
                <a href="#" className="hover:text-indigo-600">
                  Quick Filters
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-600">
                  Advanced Search
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-600">
                  Keyword Matching
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-600">
                  Export Results
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900">More Info</h3>
            <ul className="mt-2 space-y-1 text-xs text-zinc-600">
              <li>
                <a href="#" className="hover:text-indigo-600">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-600">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-600">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-600">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-8 text-center text-xs text-zinc-600">
          <p>&copy; {currentYear} DomainRadar. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
