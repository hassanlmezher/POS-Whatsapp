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
        <h1 className="text-xl font-semibold">Manage Directory</h1>
        <p className="mt-2 text-slate-600">Review transaction history and customer relationships.</p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-6"><div className="text-sm uppercase tracking-[0.18em] text-slate-500">Total Orders</div><div className="mt-6 text-2xl">{orders.length.toLocaleString()}</div></Card>
        <Card className="p-6"><div className="text-sm uppercase tracking-[0.18em] text-slate-500">Active Pending</div><div className="mt-6 text-2xl">{pending}</div></Card>
        <Card className="p-6"><div className="text-sm uppercase tracking-[0.18em] text-slate-500">Net Revenue</div><div className="mt-6 text-2xl">{formatCurrency(paidRevenue)}</div></Card>
        <Card className="p-6"><div className="text-sm uppercase tracking-[0.18em] text-slate-500">Customer Satisfaction</div><div className="mt-6 text-2xl">4.9/5 <span className="text-base text-amber-400">★★★★★</span></div></Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-5">
          <label className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="h-11 w-full rounded-lg border border-slate-200 pl-10 outline-none focus:border-emerald-300" placeholder="Filter by ID or Name" />
          </label>
          <Button variant="outline">All Status</Button>
          <Button className="ml-auto bg-emerald-700 hover:bg-emerald-800"><Plus className="h-4 w-4" /> New Order</Button>
          <Button variant="ghost" size="icon"><Download className="h-5 w-5" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
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
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="px-6 py-5 font-semibold">#{order.orderNumber}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{initials(order.customerName)}</span>
                      {order.customerName}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-5 font-black">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-5"><Badge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "yellow"}>{order.paymentStatus}</Badge></td>
                  <td className="px-6 py-5 text-right"><Link className="font-bold text-emerald-700" href={`/orders/${order.id}`}>View Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
