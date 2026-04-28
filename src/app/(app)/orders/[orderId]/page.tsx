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
      <Link href="/orders" className="text-sm font-bold text-emerald-700">Back to orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">#{order.orderNumber}</h1>
          <p className="mt-1 text-slate-600">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2"><Badge tone="blue">{order.status}</Badge><Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.paymentStatus}</Badge></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-6 text-lg font-semibold">Items</div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between border-b border-slate-100 p-6 last:border-b-0">
              <div><div className="font-semibold">{item.productName}</div><div className="text-sm text-slate-500">Qty {item.quantity} x {formatCurrency(item.unitPrice)}</div></div>
              <div className="font-black">{formatCurrency(item.lineTotal)}</div>
            </div>
          ))}
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Customer</h2>
          <div className="mt-4 font-medium">{customer?.name ?? order.customerName}</div>
          <div className="mt-1 text-slate-600">{customer?.phone ?? "Walk-in customer"}</div>
          {conversation ? <Link href="/inbox" className="mt-5 inline-block font-bold text-emerald-700">Open WhatsApp conversation</Link> : null}
          <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Tax</span><span>{formatCurrency(order.taxTotal)}</span></div>
            <div className="flex justify-between text-xl font-black"><span>Total</span><span className="text-emerald-700">{formatCurrency(order.total)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
