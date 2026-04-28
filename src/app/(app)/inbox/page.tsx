import { getInboxData } from "@/lib/data/repository";
import { InboxWorkspace } from "@/components/inbox/inbox-workspace";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const data = await getInboxData();

  return <InboxWorkspace {...data} />;
}
