"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={260}>
        <AreaChart data={data} margin={{ left: 0, right: 10, top: 30, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22ddeb" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22ddeb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1d3038" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#7e929c", fontSize: 12 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "#070b0d",
              border: "1px solid #1d3038",
              borderRadius: 12,
              color: "#f8fbff",
              boxShadow: "0 18px 46px rgba(0, 0, 0, 0.28)",
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#00a9b8" strokeWidth={5} fill="url(#salesGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
