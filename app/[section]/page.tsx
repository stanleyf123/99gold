import { notFound, redirect } from "next/navigation";
import { getGlobalQuotesOrNull } from "../../lib/quotes";
import { getGoldHistoryOrNull } from "../../lib/gold-history";
import { getJewelryHistoryOrNull } from "../../lib/jewelry-history";
import { getGoldSilverRatioHistoryOrNull } from "../../lib/gold-silver-ratio";
import {
  buildSectionView,
  jewelryFaqEntries,
  jewelryLiveExtras,
  taiwanQianValue,
  usdTwdFromQuotes,
  type SectionName,
} from "../../lib/section-quotes";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, sectionCrumbs } from "../../lib/seo";
import JsonLd from "../JsonLd";
import JewelryView from "./JewelryView";
import SectionView from "./SectionView";

export const dynamic = "force-dynamic";

const sections = ["international", "jewelry", "recycling"] as const;

function isSection(value: string): value is SectionName {
  return (sections as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSection(section)) return {};
  return pageMetadata(section);
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "insights") redirect("/news");
  if (!isSection(section)) notFound();

  const [quotes, history, ratioHistory, jewelryHistory] = await Promise.all([
    getGlobalQuotesOrNull(),
    section === "recycling" || section === "jewelry" ? Promise.resolve(null) : getGoldHistoryOrNull("1M"),
    section === "international" ? getGoldSilverRatioHistoryOrNull("1M") : Promise.resolve(null),
    section === "jewelry" ? getJewelryHistoryOrNull("1M") : Promise.resolve(null),
  ]);
  const view = buildSectionView(section, quotes);
  const live = section === "jewelry" ? jewelryLiveExtras(quotes) : null;
  const usdTwd = usdTwdFromQuotes(quotes);
  const historyRows = jewelryHistory?.rows ?? [];
  const historyRange = jewelryHistory?.range ?? null;
  const crumb = sectionCrumbs[section];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "首頁", path: "/" }, crumb])} />
      {section === "jewelry" ? <JsonLd data={faqJsonLd(jewelryFaqEntries(live))} /> : null}
      {section === "jewelry" ? (
        <JewelryView
          view={view}
          quotedAt={quotes?.quotedAt ?? ""}
          retrievedAt={quotes?.retrievedAt ?? ""}
          marketStatus={quotes?.marketStatus}
          source={quotes?.source ?? ""}
          live={live}
          historyRows={historyRows}
          historyRange={historyRange}
          historySource={jewelryHistory?.source ?? ""}
          usdTwd={usdTwd}
          fxLabel={jewelryHistory?.fxLabel ?? ""}
          fxBasis={jewelryHistory?.fxBasis ?? null}
          omitted={jewelryHistory?.omitted ?? 0}
        />
      ) : (
        <SectionView
          section={section}
          view={view}
          quotedAt={quotes?.quotedAt ?? ""}
          retrievedAt={quotes?.retrievedAt ?? ""}
          marketStatus={quotes?.marketStatus}
          source={quotes?.source ?? ""}
          taiwanQian={taiwanQianValue(quotes?.items)}
          historyPoints={section === "international" ? (history?.points ?? []) : []}
          ratioPoints={section === "international" ? (ratioHistory?.points ?? []) : []}
          goldPrice={quotes?.metals.find((metal) => metal.id === "gold")?.price ?? Number.NaN}
          silverPrice={quotes?.metals.find((metal) => metal.id === "silver")?.price ?? Number.NaN}
        />
      )}
    </>
  );
}
