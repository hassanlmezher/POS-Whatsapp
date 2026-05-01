import { CalendarDays } from "lucide-react";
import { getDashboardData } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SalesChart } from "@/components/dashboard/sales-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const stats = [
    ["Total Revenue", formatCurrency(data.stats.revenue), "vs. last week", "+12.5%", "blue"],
    ["Orders Today", data.stats.orders.toLocaleString(), "pending pickup", "Static", "slate"],
    ["New Conversations", data.stats.activeChats.toLocaleString(), "unread", "+4.2%", "orange"],
    ["Response Rate", "98.4%", "Avg. 4m 20s", "-1.2%", "blue"],
  ] as const;

  return (
    <div className="space-y-8 p-8">
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-[38px] font-black leading-tight tracking-[-0.04em] text-[#080c1a]">Good Morning, Alexander</h1>
          <p className="mt-1 text-[19px] text-[#1f2937]">Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        <button className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#d9deea] bg-white px-5 text-[15px] font-medium text-[#172033] shadow-sm">
          <CalendarDays className="h-5 w-5 text-[#8090aa]" />
          Oct 12, 2023 - Oct 18, 2023
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, helper, trend, tone]) => (
          <Card key={label} className="relative min-h-[178px] overflow-hidden p-7">
            <div className="flex items-start justify-between">
              <div className="max-w-[150px] text-xs font-black uppercase tracking-[0.14em] text-[#5d6e88]">{label}</div>
              <Badge tone={tone === "orange" ? "yellow" : tone === "blue" ? "blue" : "slate"}>{trend}</Badge>
            </div>
            <div className="mt-7 text-[30px] font-black tracking-[-0.04em] text-[#080c1a]">{value}</div>
            <div className="mt-1 text-sm text-[#8090aa]">{helper}</div>
            <div className="absolute bottom-8 right-7 flex h-10 items-end gap-1">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className={tone === "orange" ? "w-1.5 rounded-full bg-[#bc4800]" : "w-1.5 rounded-full bg-[#0b4edb]"}
                  style={{ height: `${14 + bar * 5}px`, opacity: 0.2 + bar * 0.16 }}
                />
              ))}
            </div>
          </Card>
        ))}
      </section>

      <Card className="p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#080c1a]">Sales vs. Messages</h2>
            <p className="mt-1 text-[#536884]">Correlating customer engagement with transaction volume.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#172033]">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#0b4edb]" />Sales ($)</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#bc4800]" />Messages</span>
          </div>
        </div>
        <SalesChart data={data.chart} />
      </Card>

      <section className="grid gap-7 xl:grid-cols-[minmax(0,2fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="p-6 text-xl font-medium text-[#080c1a]">Recent Orders</h2>
            <button className="p-6 text-sm font-bold text-[#0b4edb]">View All</button>
          </div>
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] bg-[#f7f9fc] px-8 py-4 text-xs font-black uppercase tracking-[0.12em] text-[#5d6e88]">
            <span>Order ID</span><span>Customer</span><span>Status</span><span>Total</span>
          </div>
          {data.recentSales.slice(0, 4).map((order) => (
            <div key={order.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-t border-[#edf1f7] px-8 py-5 text-[15px]">
              <span className="font-semibold">#{order.orderNumber}</span>
              <span className="text-[#1f2a44]">{order.customerName}</span>
              <span><Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.paymentStatus}</Badge></span>
              <span className="font-bold">{formatCurrency(order.total)}</span>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#edf1f7] p-6">
            <h2 className="text-xl font-medium text-[#080c1a]">Live Chats</h2>
            <Badge tone="green">Live</Badge>
          </div>
          {data.recentMessages.map((conversation) => (
            <div key={conversation.id} className="flex items-center gap-4 border-b border-[#edf1f7] p-6 last:border-b-0">
              <Avatar name={conversation.customerName} src={conversation.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-bold text-[#080c1a]">{conversation.customerName}</div>
                  <div className="text-xs text-[#8090aa]">
                    {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="truncate text-sm text-[#536884]">&ldquo;{conversation.lastMessage}&rdquo;</div>
              </div>
            </div>
          ))}
          <button className="w-full p-6 text-center text-sm font-bold text-[#1f2a44]">Go to Inbox (12 Unread)</button>
        </Card>
      </section>
    </div>
  );
}
