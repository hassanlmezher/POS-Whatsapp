import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Package } from "lucide-react";
import { getOrderDetails } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { order, items, customer, conversation } = await getOrderDetails(orderId);
  if (!order) notFound();

  return (
    <div className="space-y-7 p-5 lg:p-8">
      <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-bold text-[#22ddeb]">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#f8fbff]">#{order.orderNumber}</h1>
          <p className="mt-2 text-[#8fa3ad]">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="cyan">{order.status}</Badge>
          <Badge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "yellow"}>
            {order.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1d3038] p-6">
            <div>
              <h2 className="text-lg font-semibold text-[#f8fbff]">Items</h2>
              <p className="mt-1 text-sm text-[#8fa3ad]">{items.length} product{items.length === 1 ? "" : "s"} in this order</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
              <Package className="h-5 w-5" />
            </span>
          </div>

          <div className="divide-y divide-[#1d3038]">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-5 p-5">
                <div className="flex min-w-0 items-center gap-4">
                  {item.productImageUrl ? (
                    <img
                      src={item.productImageUrl}
                      alt={item.productName}
                      className="h-16 w-16 shrink-0 rounded-lg border border-[#1d3038] bg-[#030607] object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[#1d3038] bg-[#030607] text-[#22ddeb]">
                      <Package className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#f8fbff]">{item.productName}</div>
                    <div className="mt-1 text-sm text-[#8fa3ad]">
                      Qty {item.quantity} x {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right font-black text-[#22ddeb]">{formatCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#f8fbff]">Customer</h2>
          <div className="mt-4 font-medium text-[#f8fbff]">{customer?.name ?? order.customerName}</div>
          <div className="mt-1 text-[#8fa3ad]">{customer?.phone ?? "Walk-in customer"}</div>
          {conversation ? (
            <Link
              href="/inbox"
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_6px_14px_rgba(34,221,235,0.24)] transition hover:bg-[#2ff4ff]"
            >
              <MessageSquare className="h-4 w-4" /> Open WhatsApp conversation
            </Link>
          ) : null}
          <div className="mt-8 space-y-3 border-t border-[#1d3038] pt-6">
            <div className="flex justify-between text-[#8fa3ad]"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-[#8fa3ad]"><span>Tax</span><span>{formatCurrency(order.taxTotal)}</span></div>
            <div className="flex justify-between text-xl font-black text-[#f8fbff]"><span>Total</span><span className="text-[#22ddeb]">{formatCurrency(order.total)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
