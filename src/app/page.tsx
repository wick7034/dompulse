import Header from "@/components/Header";
import DomainsExplorer from "@/components/DomainsExplorer";
import Footer from "@/components/Footer";
import { fetchLatestDomains } from "@/lib/fetchLatestDomains";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const domains = await fetchLatestDomains();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 flex-1 sm:px-6">
        <div className="py-8">
          <Header />
        </div>

        <DomainsExplorer initialDomains={domains} />
      </div>
      
      <Footer />
    </div>
  );
}

