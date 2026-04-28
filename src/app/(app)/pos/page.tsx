import { getPOSData } from "@/lib/data/repository";
import { POSWorkspace } from "@/components/pos/pos-workspace";

export default async function POSPage() {
  const data = await getPOSData();

  return <POSWorkspace {...data} />;
}
