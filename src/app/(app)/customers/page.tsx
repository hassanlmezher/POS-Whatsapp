import Link from "next/link";
import { getCustomersData } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { customers, orders } = await getCustomersData();

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div><h1 className="text-2xl font-black text-[#000000]">Customers</h1><p className="mt-2 text-[#000000]">Profiles, WhatsApp history, notes, and sales value.</p></div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {customers.map((customer) => {
          const customerOrders = orders.filter((order) => order.customerId === customer.id);
          const spent = customerOrders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);
          return (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <Card className="p-6 transition hover:-translate-y-0.5 hover:border-[#7c3aed]/55 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
                <div className="flex items-center gap-4">
                  <Avatar name={customer.name} src={customer.avatarUrl} />
                  <div><div className="font-bold text-[#000000]">{customer.name}</div><div className="text-sm text-[#000000]">{customer.phone}</div></div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">{customer.tags.map((tag) => <Badge key={tag} tone="green">{tag}</Badge>)}</div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#ffffff] p-4 ring-1 ring-[#d8c3ff]"><div className="text-xs uppercase text-[#000000]">Total Spent</div><div className="mt-2 font-black text-[#000000]">{formatCurrency(spent)}</div></div>
                  <div className="rounded-lg bg-[#ffffff] p-4 ring-1 ring-[#d8c3ff]"><div className="text-xs uppercase text-[#000000]">Orders</div><div className="mt-2 font-black text-[#000000]">{customerOrders.length}</div></div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
