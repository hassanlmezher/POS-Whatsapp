import Link from "next/link";
import { CalendarDays, Download, Package, Plus, Search, ShoppingBag } from "lucide-react";
import { getOrdersData } from "@/lib/data/repository";
import { formatCurrency, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { orders } = await getOrdersData();
  const paidRevenue = orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0);
  const pending = orders.filter((order) => order.paymentStatus === "pending").length;
  const completed = orders.filter((order) => order.status === "completed").length;
  const totalItems = orders.reduce(
    (sum, order) => sum + (order.items ?? []).reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid").length;
  const averageOrder = paidOrders ? paidRevenue / paidOrders : 0;

  return (
    <div className="space-y-7 p-5 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#f8fbff]">Orders</h1>
          <p className="mt-2 text-[#8fa3ad]">Review transaction history, purchased items, and customer relationships.</p>
        </div>
        <Link
          href="/pos"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_6px_14px_rgba(34,221,235,0.24)] transition hover:bg-[#2ff4ff]"
        >
          <Plus className="h-4 w-4" /> New Order
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Orders", value: orders.length.toLocaleString(), helper: `${totalItems.toLocaleString()} items sold`, icon: ShoppingBag },
          { label: "Active Pending", value: pending.toLocaleString(), helper: "Awaiting payment", icon: CalendarDays },
          { label: "Net Revenue", value: formatCurrency(paidRevenue), helper: `${formatCurrency(averageOrder)} avg. order`, icon: Package },
          { label: "Completed", value: completed.toLocaleString(), helper: "Completed orders", icon: ShoppingBag },
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
          <button className="inline-flex h-12 items-center justify-center rounded-lg border border-[#1d3038] bg-[#070b0d] px-5 text-sm font-semibold text-[#f8fbff] shadow-sm transition hover:bg-[#0b1114]">
            All Status
          </button>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-transparent p-0 text-[#8fa3ad] transition hover:bg-[#10181c] hover:text-[#22ddeb]"
            aria-label="Download orders"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-[#0b1114] text-xs uppercase tracking-[0.12em] text-[#6f858f]">
              <tr>
                <th className="whitespace-nowrap px-6 py-5">Order ID</th>
                <th className="whitespace-nowrap px-6 py-5">Customer Name</th>
                <th className="whitespace-nowrap px-6 py-5">Items</th>
                <th className="whitespace-nowrap px-6 py-5">Date</th>
                <th className="whitespace-nowrap px-6 py-5">Amount</th>
                <th className="whitespace-nowrap px-6 py-5">Status</th>
                <th className="whitespace-nowrap px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? orders.map((order) => {
                const orderHref = `/orders/${order.id}`;
                const itemCount = (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <tr key={order.id} className="group border-t border-[#1d3038] text-[#f8fbff] transition hover:bg-[#0b1114]">
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 font-semibold text-[#f8fbff]">
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="flex items-center gap-3 px-6 py-5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10181c] text-xs font-bold text-[#f8fbff] ring-1 ring-[#1d3038]">{initials(order.customerName)}</span>
                        <span className="whitespace-nowrap text-[#f8fbff]">{order.customerName}</span>
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block px-6 py-5">
                        <span className="block max-w-[320px] truncate text-sm font-semibold text-[#f8fbff]">
                          {(order.items ?? [])[0]?.productName ?? "No items"}
                        </span>
                        <span className="block whitespace-nowrap text-xs text-[#6f858f]">
                          {itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Empty order"}
                        </span>
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 text-[#8fa3ad]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 font-black text-[#22ddeb]">
                        {formatCurrency(order.total)}
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5">
                        <Badge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "yellow"}>{order.paymentStatus}</Badge>
                      </Link>
                    </td>
                    <td className="align-middle text-right">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 font-bold text-[#22ddeb]">
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
                        <ShoppingBag className="h-6 w-6" />
                      </span>
                      <h2 className="mt-4 text-lg font-semibold text-[#f8fbff]">No orders yet</h2>
                      <p className="mt-2 text-sm text-[#8fa3ad]">
                        Orders created from the POS checkout will appear here for this tenant.
                      </p>
                      <Link
                        href="/pos"
                        className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[#22ddeb] px-4 text-sm font-semibold text-black transition hover:bg-[#2ff4ff]"
                      >
                        Create first order
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
