import Header from "@/components/Header";
import DomainsExplorer from "@/components/DomainsExplorer";
import { fetchLatestDomains } from "@/lib/fetchLatestDomains";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const domains = await fetchLatestDomains(100);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <div className="py-8">
          <Header />
        </div>

        <DomainsExplorer initialDomains={domains} />
      </div>
    </div>
  );
}
