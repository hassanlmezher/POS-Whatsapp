import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { getOrdersData } from "@/lib/data/repository";
import { formatCurrency, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { orders } = await getOrdersData();
  const paidRevenue = orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);
  const pending = orders.filter((order) => order.paymentStatus === "pending").length;

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <div>
        <h1 className="text-2xl font-black text-[#080c1a]">Orders</h1>
        <p className="mt-2 text-[#536884]">Review transaction history and customer relationships.</p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-6"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#8090aa]">Total Orders</div><div className="mt-6 text-3xl font-black text-[#080c1a]">{orders.length.toLocaleString()}</div></Card>
        <Card className="p-6"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#8090aa]">Active Pending</div><div className="mt-6 text-3xl font-black text-[#080c1a]">{pending}</div></Card>
        <Card className="p-6"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#8090aa]">Net Revenue</div><div className="mt-6 text-3xl font-black text-[#080c1a]">{formatCurrency(paidRevenue)}</div></Card>
        <Card className="p-6"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#8090aa]">Customer Satisfaction</div><div className="mt-6 text-3xl font-black text-[#080c1a]">4.9/5 <span className="text-base text-[#bc4800]">★★★★★</span></div></Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#d9deea] p-5">
          <label className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8090aa]" />
            <input className="h-11 w-full rounded-lg border border-[#d9deea] bg-[#f7f9fc] pl-10 text-[#080c1a] outline-none placeholder:text-[#8090aa] focus:border-[#0b4edb]" placeholder="Filter by ID or Name" />
          </label>
          <Button variant="outline">All Status</Button>
          <Button className="ml-auto"><Plus className="h-4 w-4" /> New Order</Button>
          <Button variant="ghost" size="icon"><Download className="h-5 w-5" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f7f9fc] text-xs uppercase tracking-[0.12em] text-[#8090aa]">
              <tr>
                <th className="px-6 py-5">Order ID</th>
                <th className="px-6 py-5">Customer Name</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[#d9deea] text-[#080c1a]">
                  <td className="px-6 py-5 font-semibold text-[#080c1a]">#{order.orderNumber}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2f7] text-xs font-bold text-[#080c1a] ring-1 ring-[#d9deea]">{initials(order.customerName)}</span>
                      {order.customerName}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[#536884]">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-5 font-black text-[#0b4edb]">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-5"><Badge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "yellow"}>{order.paymentStatus}</Badge></td>
                  <td className="px-6 py-5 text-right"><Link className="font-bold text-[#0b4edb]" href={`/orders/${order.id}`}>View Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
