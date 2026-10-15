import type { Profile } from "@ntumie/types";
import { redirect } from "next/navigation";
import { Feedback } from "../../components/feedback";
import { queryValue } from "../../lib/http";
import { operatorRead } from "../../lib/operator-read";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await operatorRead<Profile>("/api/v1/profile", "/hub");
  if (!profile.ok) return <Feedback error={profile} resetPath="/hub" />;
  // A hub comes with the first collection (ADR-0069); until then the person's
  // own profile carries the Start a collection prompt.
  if (!profile.data.hubId) redirect(`/${encodeURIComponent(profile.data.username)}`);
  const cursor = queryValue((await searchParams).cursor);
  redirect(`/h/${profile.data.hubId}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
}
