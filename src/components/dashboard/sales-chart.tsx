"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={260}>
        <AreaChart data={data} margin={{ left: 0, right: 10, top: 30, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.16} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#8090aa", fontSize: 12 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #d9deea",
              borderRadius: 12,
              color: "#080c1a",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#0b4edb" strokeWidth={5} fill="url(#salesGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
