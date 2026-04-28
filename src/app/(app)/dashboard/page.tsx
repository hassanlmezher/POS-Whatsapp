import { MessageSquareText, ShoppingBag } from "lucide-react";
import { getDashboardData } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SalesChart } from "@/components/dashboard/sales-chart";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const stats = [
    ["Total Revenue", formatCurrency(data.stats.revenue), "↗ 12.5% vs last month", "green"],
    ["Total Orders", data.stats.orders.toLocaleString(), "↗ 8.2% vs last month", "green"],
    ["New Customers", data.stats.customers.toLocaleString(), "↘ 3.1% vs last month", "red"],
    ["Active Chats", data.stats.activeChats.toLocaleString(), "Ready for response", "green"],
  ] as const;

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, helper, tone]) => (
          <Card key={label} className="p-7">
            <div className="text-sm uppercase tracking-[0.22em] text-slate-600">{label}</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
            <div className={tone === "green" ? "mt-5 text-emerald-700" : "mt-5 text-red-600"}>{helper}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_320px]">
        <Card className="p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Sales Performance</h2>
              <p className="mt-1 text-slate-600">Revenue growth over the last 30 days</p>
            </div>
            <Badge>Last 30 Days</Badge>
          </div>
          <SalesChart data={data.chart} />
        </Card>

        <Card className="p-7">
          <h2 className="text-lg font-semibold">Best Sellers</h2>
          <div className="mt-7 space-y-5">
            {data.bestSellers.map((product) => (
              <div key={product.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-4">
                <img src={product.imageUrl} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                <div>
                  <div className="font-medium text-slate-950">{product.name}</div>
                  <div className="text-sm text-slate-500">{product.sales} sales</div>
                </div>
                <div className="font-medium">{formatCurrency(product.price)}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <h2 className="text-lg font-semibold">Recent Sales</h2>
            <ShoppingBag className="h-5 w-5 text-slate-400" />
          </div>
          {data.recentSales.map((order) => (
            <div key={order.id} className="flex items-center justify-between border-b border-slate-100 p-6 last:border-b-0">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Order #{order.orderNumber}</div>
                  <div className="text-sm text-slate-500">{order.customerName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-emerald-700">{formatCurrency(order.total)}</div>
                <Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.paymentStatus}</Badge>
              </div>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <h2 className="text-lg font-semibold">Recent Messages</h2>
            <MessageSquareText className="h-5 w-5 text-emerald-500" />
          </div>
          {data.recentMessages.map((conversation) => (
            <div key={conversation.id} className="flex items-center gap-4 border-b border-slate-100 p-6 last:border-b-0">
              <Avatar name={conversation.customerName} src={conversation.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold">{conversation.customerName}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="truncate text-sm text-slate-600">&ldquo;{conversation.lastMessage}&rdquo;</div>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
