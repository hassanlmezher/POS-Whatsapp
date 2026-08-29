import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="space-y-6 p-5 lg:p-8">
      <Link href="/orders" className="text-sm font-bold text-[#22ddeb]">Back to orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#f8fbff]">#{order.orderNumber}</h1>
          <p className="mt-1 text-[#8fa3ad]">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2"><Badge tone="cyan">{order.status}</Badge><Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.paymentStatus}</Badge></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="border-b border-[#1d3038] p-6 text-lg font-semibold text-[#f8fbff]">Items</div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between border-b border-[#1d3038] p-6 last:border-b-0">
              <div><div className="font-semibold text-[#f8fbff]">{item.productName}</div><div className="text-sm text-[#6f858f]">Qty {item.quantity} x {formatCurrency(item.unitPrice)}</div></div>
              <div className="font-black text-[#22ddeb]">{formatCurrency(item.lineTotal)}</div>
            </div>
          ))}
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#f8fbff]">Customer</h2>
          <div className="mt-4 font-medium text-[#f8fbff]">{customer?.name ?? order.customerName}</div>
          <div className="mt-1 text-[#8fa3ad]">{customer?.phone ?? "Walk-in customer"}</div>
          {conversation ? <Link href="/inbox" className="mt-5 inline-block font-bold text-[#22ddeb]">Open WhatsApp conversation</Link> : null}
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
