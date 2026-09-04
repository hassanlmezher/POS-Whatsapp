import type React from "react";
import Link from "next/link";
import { CalendarDays, Download, Package, Plus, Search, ShoppingBag } from "lucide-react";
import { getOrdersData } from "@/lib/data/repository";
import { formatCurrency, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PaymentStatus } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function dateValue(value: unknown) {
  const date = typeof value === "string" || typeof value === "number" || value instanceof Date ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString() : "Unknown date";
}

function paymentTone(status: PaymentStatus) {
  if (status === "paid") {
    return "green";
  }

  if (status === "failed") {
    return "red";
  }

  return "yellow";
}

function StatCard({
  label,
  value,
  helper,
  children,
}: {
  label: string;
  value: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#000000]">{label}</div>
          <div className="mt-5 text-3xl font-black text-[#000000]">{value}</div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4ecff] text-[#7c3aed] ring-1 ring-[#7c3aed]/40">
          {children}
        </span>
      </div>
      <div className="mt-4 text-sm text-[#000000]">{helper}</div>
    </Card>
  );
}

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
          <h1 className="text-2xl font-black text-[#000000]">Orders</h1>
          <p className="mt-2 text-[#000000]">Review transaction history, purchased items, and customer relationships.</p>
        </div>
        <Link
          href="/pos"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-5 text-sm font-semibold text-black shadow-[0_6px_14px_rgba(124,58,237,0.24)] transition hover:bg-[#6d28d9]"
        >
          <Plus className="h-4 w-4" /> New Order
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Orders" value={orders.length.toLocaleString()} helper={`${totalItems.toLocaleString()} items sold`}>
          <ShoppingBag className="h-5 w-5" />
        </StatCard>
        <StatCard label="Active Pending" value={pending.toLocaleString()} helper="Awaiting payment">
          <CalendarDays className="h-5 w-5" />
        </StatCard>
        <StatCard label="Net Revenue" value={formatCurrency(paidRevenue)} helper={`${formatCurrency(averageOrder)} avg. order`}>
          <Package className="h-5 w-5" />
        </StatCard>
        <StatCard label="Completed" value={completed.toLocaleString()} helper="Completed orders">
          <ShoppingBag className="h-5 w-5" />
        </StatCard>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#d8c3ff] p-5">
          <label className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#000000]" />
            <input className="h-11 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] pl-10 text-[#000000] outline-none placeholder:text-[#000000] focus:border-[#7c3aed]" placeholder="Filter by ID or Name" />
          </label>
          <button className="inline-flex h-12 items-center justify-center rounded-lg border border-[#d8c3ff] bg-[#fbf8ff] px-5 text-sm font-semibold text-[#000000] shadow-sm transition hover:bg-[#ffffff]">
            All Status
          </button>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-transparent p-0 text-[#000000] transition hover:bg-[#f4ecff] hover:text-[#7c3aed]"
            aria-label="Download orders"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-[#ffffff] text-xs uppercase tracking-[0.12em] text-[#000000]">
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
                const orderNumber = textValue(order.orderNumber, "Unknown order");
                const customerName = textValue(order.customerName, "Walk-in Customer");
                const paymentStatus = textValue(order.paymentStatus, "pending") as PaymentStatus;
                const itemCount = (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <tr key={order.id} className="group border-t border-[#d8c3ff] text-[#000000] transition hover:bg-[#ffffff]">
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 font-semibold text-[#000000]">
                        #{orderNumber}
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="flex items-center gap-3 px-6 py-5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4ecff] text-xs font-bold text-[#000000] ring-1 ring-[#d8c3ff]">{initials(customerName)}</span>
                        <span className="whitespace-nowrap text-[#000000]">{customerName}</span>
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block px-6 py-5">
                        <span className="block max-w-[320px] truncate text-sm font-semibold text-[#000000]">
                          {(order.items ?? [])[0]?.productName ?? "No items"}
                        </span>
                        <span className="block whitespace-nowrap text-xs text-[#000000]">
                          {itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Empty order"}
                        </span>
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 text-[#000000]">
                        {dateValue(order.createdAt)}
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 font-black text-[#7c3aed]">
                        {formatCurrency(order.total)}
                      </Link>
                    </td>
                    <td className="align-middle">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5">
                        <Badge tone={paymentTone(paymentStatus)}>{paymentStatus}</Badge>
                      </Link>
                    </td>
                    <td className="align-middle text-right">
                      <Link href={orderHref} className="block whitespace-nowrap px-6 py-5 font-bold text-[#7c3aed]">
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4ecff] text-[#7c3aed] ring-1 ring-[#7c3aed]/40">
                        <ShoppingBag className="h-6 w-6" />
                      </span>
                      <h2 className="mt-4 text-lg font-semibold text-[#000000]">No orders yet</h2>
                      <p className="mt-2 text-sm text-[#000000]">
                        Orders created from the POS checkout will appear here for this tenant.
                      </p>
                      <Link
                        href="/pos"
                        className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[#7c3aed] px-4 text-sm font-semibold text-black transition hover:bg-[#6d28d9]"
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
