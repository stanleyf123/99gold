import { LocalizedSlugPage, localizedSlugMetadata } from "../../localized-slug-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  return localizedSlugMetadata("en", slug, searchParams);
}

export default async function EnglishPage({ params, searchParams }: Props) {
  const { slug } = await params;
  return <LocalizedSlugPage locale="en" slug={slug} searchParams={searchParams} />;
}
