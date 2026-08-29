import Link from "next/link";
import { createInventoryProduct } from "@/app/(app)/inventory/actions";
import { getNewProductData } from "@/lib/data/repository";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type NewProductPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-product": "Check the product name, SKU, price, stock, and image URL.",
  "invalid-category": "The selected category does not belong to this tenant.",
  "product-create-failed": "Product could not be created. The SKU may already exist.",
};

export default async function NewInventoryProductPage({ searchParams }: NewProductPageProps) {
  const [data, params] = await Promise.all([getNewProductData(), searchParams]);
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div>
        <Link href="/inventory/products" className="text-sm font-bold text-[#22ddeb]">
          Product Catalog
        </Link>
        <h1 className="mt-3 text-2xl font-black text-white">Add Product</h1>
        <p className="mt-2 max-w-2xl text-[#8fa3ad]">
          Create a tenant-owned product. It will appear in the product catalog and POS workspace.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-[#8d2638] bg-[#351018] px-4 py-3 text-sm text-[#ff9aac]">
          {errorMessage}
        </div>
      ) : null}

      <Card className="max-w-3xl p-6">
        <form action={createInventoryProduct} className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-white">
            Product Name
            <input
              name="name"
              required
              minLength={2}
              className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
              placeholder="Example: Premium Coffee"
            />
          </label>
          <label className="block text-sm font-semibold text-white">
            SKU
            <input
              name="sku"
              required
              className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
              placeholder="COF-001"
            />
          </label>
          <label className="block text-sm font-semibold text-white">
            Category
            <select
              name="categoryId"
              className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
              defaultValue=""
            >
              <option value="">Uncategorized</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-white">
            Price
            <input
              name="price"
              required
              min="0"
              step="0.01"
              type="number"
              className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
              placeholder="0.00"
            />
          </label>
          <label className="block text-sm font-semibold text-white">
            Initial Stock
            <input
              name="initialStock"
              min="0"
              step="1"
              type="number"
              defaultValue="0"
              className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
            />
          </label>
          <label className="block text-sm font-semibold text-white">
            Reorder Level
            <input
              name="reorderLevel"
              min="0"
              step="1"
              type="number"
              defaultValue="0"
              className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
            />
          </label>
          <label className="block text-sm font-semibold text-white md:col-span-2">
            Image URL
            <input
              name="imageUrl"
              type="url"
              className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
              placeholder="https://..."
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 text-sm font-semibold text-white">
            <input
              name="active"
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded border-white/20 accent-[#22ddeb]"
            />
            Active in POS
          </label>
          <div className="flex items-center justify-end gap-3 md:col-span-2">
            <Link
              href="/inventory/products"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[#1d3038] px-5 text-sm font-semibold text-white transition hover:bg-[#10181c]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(34,221,235,0.2)] transition hover:bg-[#2ff4ff]"
            >
              Save Product
            </button>
          </div>
        </form>
        {!data.branches.length ? (
          <p className="mt-5 rounded-lg border border-[#8a621f] bg-[#33240b] px-4 py-3 text-sm text-[#f6c76a]">
            No active branch exists for this tenant. The product can be created, but initial stock
            cannot be assigned until a branch exists.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
