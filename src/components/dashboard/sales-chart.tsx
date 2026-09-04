"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={260}>
        <AreaChart data={data} margin={{ left: 0, right: 10, top: 30, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#d8c3ff" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#000000", fontSize: 12 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "#fbf8ff",
              border: "1px solid #d8c3ff",
              borderRadius: 12,
              color: "#000000",
              boxShadow: "0 18px 46px rgba(0, 0, 0, 0.28)",
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={5} fill="url(#salesGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
