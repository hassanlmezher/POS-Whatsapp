import Link from "next/link";
import { CalendarDays, Download, Package, Plus, Search, ShoppingBag } from "lucide-react";
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
  const totalItems = orders.reduce(
    (sum, order) => sum + (order.items ?? []).reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const averageOrder = orders.length ? paidRevenue / orders.length : 0;

  return (
    <div className="space-y-7 p-5 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#f8fbff]">Orders</h1>
          <p className="mt-2 text-[#8fa3ad]">Review transaction history, purchased items, and customer relationships.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Orders", value: orders.length.toLocaleString(), helper: `${totalItems.toLocaleString()} items sold`, icon: ShoppingBag },
          { label: "Active Pending", value: pending.toLocaleString(), helper: "Awaiting payment", icon: CalendarDays },
          { label: "Net Revenue", value: formatCurrency(paidRevenue), helper: `${formatCurrency(averageOrder)} avg. order`, icon: Package },
          { label: "Satisfaction", value: "4.9/5", helper: "Customer rating", icon: ShoppingBag },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#6f858f]">{stat.label}</div>
                  <div className="mt-5 text-3xl font-black text-[#f8fbff]">{stat.value}</div>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 text-sm text-[#8fa3ad]">{stat.helper}</div>
            </Card>
          );
        })}
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1d3038] p-5">
          <label className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f858f]" />
            <input className="h-11 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] pl-10 text-[#f8fbff] outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb]" placeholder="Filter by ID or Name" />
          </label>
          <Button variant="outline">All Status</Button>
          <Button variant="ghost" size="icon" aria-label="Download orders"><Download className="h-5 w-5" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#0b1114] text-xs uppercase tracking-[0.12em] text-[#6f858f]">
              <tr>
                <th className="px-6 py-5">Order ID</th>
                <th className="px-6 py-5">Customer Name</th>
                <th className="px-6 py-5">Items</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[#1d3038] text-[#f8fbff] transition hover:bg-[#0b1114]">
                  <td className="px-6 py-5 align-middle font-semibold text-[#f8fbff]">#{order.orderNumber}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10181c] text-xs font-bold text-[#f8fbff] ring-1 ring-[#1d3038]">{initials(order.customerName)}</span>
                      {order.customerName}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex min-w-[220px] items-center gap-3">
                      <div className="flex -space-x-3">
                        {(order.items ?? []).slice(0, 3).map((item) => (
                          <img
                            key={item.id}
                            src={item.productImageUrl}
                            alt={item.productName}
                            className="h-11 w-11 rounded-lg border border-[#1d3038] bg-[#030607] object-cover"
                          />
                        ))}
                        {!(order.items ?? []).length ? (
                          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#1d3038] bg-[#082529]">
                            <Package className="h-5 w-5 text-[#22ddeb]" />
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#f8fbff]">
                          {(order.items ?? [])[0]?.productName ?? "No items"}
                        </div>
                        <div className="text-xs text-[#6f858f]">
                          {(order.items ?? []).length
                            ? `${(order.items ?? []).reduce((sum, item) => sum + item.quantity, 0)} item${(order.items ?? []).reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}`
                            : "Empty order"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[#8fa3ad]">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-5 font-black text-[#22ddeb]">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-5"><Badge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "yellow"}>{order.paymentStatus}</Badge></td>
                  <td className="px-6 py-5 text-right"><Link className="font-bold text-[#22ddeb]" href={`/orders/${order.id}`}>View Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
