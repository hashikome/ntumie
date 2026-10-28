import type { Metadata } from "next";
import { StartCollection } from "../../components/start-collection";

export const metadata: Metadata = { title: "Start a collection" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StartCollection query={await searchParams} />;
}
