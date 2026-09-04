import { notFound } from "next/navigation";
import { getCustomerDetails } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CustomerDetailsPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const { customer, orders, conversations } = await getCustomerDetails(customerId);
  if (!customer) notFound();
  const spent = orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <Card className="p-7">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={customer.name} src={customer.avatarUrl} className="h-20 w-20" />
          <div className="flex-1">
            <h1 className="text-2xl font-black text-[#000000]">{customer.name}</h1>
            <p className="mt-1 text-[#000000]">{customer.phone}</p>
            <div className="mt-3 flex gap-2">{customer.tags.map((tag) => <Badge key={tag} tone="green">{tag}</Badge>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#ffffff] p-5 ring-1 ring-[#d8c3ff]"><div className="text-xs uppercase text-[#000000]">Total Spent</div><div className="mt-2 text-xl font-black text-[#000000]">{formatCurrency(spent)}</div></div>
            <div className="rounded-lg bg-[#ffffff] p-5 ring-1 ring-[#d8c3ff]"><div className="text-xs uppercase text-[#000000]">Orders</div><div className="mt-2 text-xl font-black text-[#000000]">{orders.length}</div></div>
          </div>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><h2 className="text-lg font-semibold text-[#000000]">Notes</h2><p className="mt-4 leading-7 text-[#000000]">{customer.notes}</p></Card>
        <Card className="p-6"><h2 className="text-lg font-semibold text-[#000000]">WhatsApp Conversations</h2><div className="mt-4 space-y-3">{conversations.map((conversation) => <div key={conversation.id} className="rounded-lg bg-[#ffffff] p-4 text-[#000000] ring-1 ring-[#d8c3ff]">{conversation.lastMessage}</div>)}</div></Card>
      </div>
    </div>
  );
}
