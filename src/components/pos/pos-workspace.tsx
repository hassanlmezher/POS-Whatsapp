"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Minus,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import type { Category, Company, Customer, Product } from "@/lib/types/domain";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore, getCartTotals } from "@/lib/stores/cart-store";

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
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("cat-all");
  const [query, setQuery] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
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
    setCheckoutError(null);
    setIsCheckingOut(true);
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
      router.push("/orders");
      router.refresh();
      return;
    }

    const payload = await response.json().catch(() => null);
    setCheckoutError(payload?.error ?? "Checkout failed. Check the server logs for details.");
    setIsCheckingOut(false);
  }

  return (
    <div className="grid min-h-[calc(100vh-98px)] grid-cols-1 bg-[#f0f1fb] xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="min-w-0">
        <div className="border-b border-[#d9deea] bg-white px-8 py-5">
          <div className="flex gap-4 overflow-x-auto">
          {categories.map((category) => {
            const active = category.id === categoryId;
            return (
              <button
                key={category.id}
                onClick={() => setCategoryId(category.id)}
                className={`h-12 shrink-0 rounded-full px-8 text-base font-bold transition ${
                  active ? "bg-[#0b4edb] text-white shadow-[0_8px_18px_rgba(11,78,219,0.22)]" : "bg-[#eef2f7] text-[#26384f] hover:bg-[#e6ebf3]"
                }`}
              >
                {category.name}
              </button>
            );
          })}
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 max-w-xl">
            <Input icon value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU..." />
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            return (
              <button
                key={product.id}
                onClick={() => addItem(product)}
                className="overflow-hidden rounded-xl bg-white p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-[#d9deea] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)]"
              >
                <div className="relative">
                  <img src={product.imageUrl} alt={product.name} className="h-52 w-full rounded-lg object-cover" />
                  <span className="absolute bottom-2 right-2 rounded-md bg-white px-3 py-1 text-sm font-black text-[#0b4edb] shadow">{formatCurrency(product.price, company.currency)}</span>
                </div>
                <div className="pt-4">
                  <div className="line-clamp-1 text-xl font-medium text-[#080c1a]">{product.name}</div>
                  <div className="mt-1 text-base text-[#536884]">{category?.name}</div>
                </div>
              </button>
            );
          })}
          </div>
        </div>
      </section>

      <aside className="flex min-h-[620px] flex-col border-l border-[#d9deea] bg-white">
        <div className="border-b border-[#edf1f7] p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-medium text-[#080c1a]">Current Order</h2>
            <span className="rounded-full bg-[#eef2f7] px-4 py-1 text-sm font-black text-[#536884]">{totals.count} Items</span>
          </div>
          <label className="mt-5 flex items-center gap-3 rounded-xl bg-[#f7f9fc] p-3 text-sm ring-1 ring-[#d9deea]">
            <User className="h-4 w-4 text-[#8090aa]" />
            <select
              className="flex-1 bg-transparent text-[#172033] outline-none"
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
            <div key={item.product.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#d9deea]">
              <div className="flex gap-4">
                <img src={item.product.imageUrl} alt={item.product.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <div className="font-bold text-[#080c1a]">{item.product.name}</div>
                    <button onClick={() => removeItem(item.product.id)} aria-label="Remove item">
                      <Trash2 className="h-4 w-4 text-[#8090aa]" />
                    </button>
                  </div>
                  <div className="mt-1 text-sm text-[#8090aa]">{formatCurrency(item.product.price)}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => decrementItem(item.product.id)}><Minus className="h-4 w-4" /></Button>
                      <span className="w-5 text-center font-semibold">{item.quantity}</span>
                      <Button variant="outline" size="icon" onClick={() => addItem(item.product)}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="font-black text-[#080c1a]">{formatCurrency(item.product.price * item.quantity)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#edf1f7] bg-white p-8">
          <div className="space-y-4 text-base text-[#536884]">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax ({company.taxRate * 100}%)</span><span>{formatCurrency(totals.tax)}</span></div>
            <div className="flex justify-between border-t border-[#edf1f7] pt-6 text-xl font-black text-[#080c1a]">
              <span>Total</span><span>{formatCurrency(totals.total)}</span>
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
          {checkoutError ? (
            <div className="mt-4 rounded-xl bg-[#fff1f2] p-3 text-sm font-medium text-[#be123c] ring-1 ring-[#fecdd3]">
              {checkoutError}
            </div>
          ) : null}
          <Button className="mt-4 h-16 w-full text-lg" onClick={checkout} disabled={!items.length || isCheckingOut}>
            {isCheckingOut ? "Processing..." : "Checkout"} <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </aside>
    </div>
  );
}
