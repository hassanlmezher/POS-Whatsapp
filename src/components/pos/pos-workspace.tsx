"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  BookOpen,
  Car,
  CreditCard,
  Dumbbell,
  House,
  LayoutGrid,
  Minus,
  MonitorSmartphone,
  Plus,
  Shirt,
  Trash2,
  User,
} from "lucide-react";
import type { Category, Company, Customer, Product } from "@/lib/types/domain";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore, getCartTotals } from "@/lib/stores/cart-store";

const icons = { LayoutGrid, MonitorSmartphone, Shirt, House, Dumbbell, BookOpen, Car };

export function POSWorkspace({
  company,
  categories,
  products,
  customers,
}: {
  company: Company;
  categories: Category[];
  products: Product[];
  customers: Customer[];
}) {
  const [categoryId, setCategoryId] = useState("cat-all");
  const [query, setQuery] = useState("");
  const { items, addItem, decrementItem, removeItem, paymentMethod, setPaymentMethod, customerId, setCustomer, clear } = useCartStore();
  const totals = getCartTotals(items, company.taxRate);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = categoryId === "cat-all" || product.categoryId === categoryId;
      const matchesQuery = `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [categoryId, products, query]);

  async function checkout() {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: company.id,
        customerId,
        paymentMethod,
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      }),
    });

    if (response.ok) {
      clear();
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-67px)] grid-cols-1 bg-white xl:grid-cols-[200px_minmax(0,1fr)_410px]">
      <aside className="border-r border-slate-100 bg-white">
        <div className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
          Categories
        </div>
        <div className="grid grid-cols-2 gap-1 p-3 xl:block xl:space-y-1">
          {categories.map((category) => {
            const Icon = icons[category.icon as keyof typeof icons] ?? LayoutGrid;
            const active = category.id === categoryId;
            return (
              <button
                key={category.id}
                onClick={() => setCategoryId(category.id)}
                className={`flex h-20 flex-col items-center justify-center gap-2 rounded-xl text-sm transition xl:h-24 ${
                  active ? "bg-emerald-50 font-bold text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {category.name}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 p-5 lg:p-7">
        <div className="mb-6 max-w-xl">
          <Input icon value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU..." />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            return (
              <button
                key={product.id}
                onClick={() => addItem(product)}
                className="overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <img src={product.imageUrl} alt={product.name} className="h-28 w-full object-cover" />
                <div className="p-3">
                  <div className="text-xs font-black uppercase text-emerald-700">{category?.name}</div>
                  <div className="mt-1 line-clamp-2 min-h-10 font-semibold">{product.name}</div>
                  <div className="mt-3 text-xl font-black">{formatCurrency(product.price, company.currency)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex min-h-[620px] flex-col border-l border-slate-200 bg-[#f8fafc]">
        <div className="border-b border-slate-200 p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Current Order</h2>
            <span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-black text-emerald-800">{totals.count} Items</span>
          </div>
          <label className="mt-5 flex items-center gap-3 rounded-xl bg-[#eef2ff] p-3 text-sm">
            <User className="h-4 w-4 text-slate-500" />
            <select
              className="flex-1 bg-transparent outline-none"
              value={customerId ?? ""}
              onChange={(event) => setCustomer(event.target.value || null)}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {items.map((item) => (
            <div key={item.product.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex gap-4">
                <img src={item.product.imageUrl} alt={item.product.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <div className="font-bold">{item.product.name}</div>
                    <button onClick={() => removeItem(item.product.id)} aria-label="Remove item">
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{formatCurrency(item.product.price)}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => decrementItem(item.product.id)}><Minus className="h-4 w-4" /></Button>
                      <span className="w-5 text-center font-semibold">{item.quantity}</span>
                      <Button variant="outline" size="icon" onClick={() => addItem(item.product)}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="font-black">{formatCurrency(item.product.price * item.quantity)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 bg-white p-7">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax ({company.taxRate * 100}%)</span><span>{formatCurrency(totals.tax)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-4 text-xl font-black text-slate-950">
              <span>Total</span><span className="text-emerald-700">{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button variant={paymentMethod === "cash" ? "secondary" : "outline"} onClick={() => setPaymentMethod("cash")}>
              <Banknote className="h-5 w-5" /> Cash
            </Button>
            <Button variant={paymentMethod === "card" ? "secondary" : "outline"} onClick={() => setPaymentMethod("card")}>
              <CreditCard className="h-5 w-5" /> Card
            </Button>
          </div>
          <Button className="mt-4 h-16 w-full text-lg" onClick={checkout} disabled={!items.length}>
            Checkout <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </aside>
    </div>
  );
}
