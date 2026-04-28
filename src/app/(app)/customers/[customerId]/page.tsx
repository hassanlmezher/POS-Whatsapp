import { notFound } from "next/navigation";
import { getCustomerDetails } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
            <h1 className="text-2xl font-black">{customer.name}</h1>
            <p className="mt-1 text-slate-600">{customer.phone}</p>
            <div className="mt-3 flex gap-2">{customer.tags.map((tag) => <Badge key={tag} tone="green">{tag}</Badge>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#eef2ff] p-5"><div className="text-xs uppercase text-slate-500">Total Spent</div><div className="mt-2 text-xl font-black">{formatCurrency(spent)}</div></div>
            <div className="rounded-xl bg-[#eef2ff] p-5"><div className="text-xs uppercase text-slate-500">Orders</div><div className="mt-2 text-xl font-black">{orders.length}</div></div>
          </div>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><h2 className="text-lg font-semibold">Notes</h2><p className="mt-4 leading-7 text-slate-700">{customer.notes}</p></Card>
        <Card className="p-6"><h2 className="text-lg font-semibold">WhatsApp Conversations</h2><div className="mt-4 space-y-3">{conversations.map((conversation) => <div key={conversation.id} className="rounded-lg bg-slate-50 p-4">{conversation.lastMessage}</div>)}</div></Card>
      </div>
    </div>
  );
}
