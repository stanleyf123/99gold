import { notFound, redirect } from "next/navigation";
import { getGlobalQuotes, type GlobalQuotes } from "../../lib/quotes";
import { buildSectionView, taiwanQianValue, type SectionName } from "../../lib/section-quotes";
import SectionView from "./SectionView";

export const dynamic = "force-dynamic";

const sections = ["international", "jewelry", "recycling"] as const;

function isSection(value: string): value is SectionName {
  return (sections as readonly string[]).includes(value);
}

async function loadQuotes(): Promise<GlobalQuotes | null> {
  try {
    return await getGlobalQuotes();
  } catch {
    return null;
  }
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "insights") redirect("/news");
  if (!isSection(section)) notFound();

  const quotes = await loadQuotes();
  const view = buildSectionView(section, quotes);

  return (
    <SectionView
      section={section}
      view={view}
      quotedAt={quotes?.quotedAt ?? ""}
      retrievedAt={quotes?.retrievedAt ?? ""}
      marketStatus={quotes?.marketStatus}
      source={quotes?.source ?? ""}
      taiwanQian={taiwanQianValue(quotes?.items)}
    />
  );
}
