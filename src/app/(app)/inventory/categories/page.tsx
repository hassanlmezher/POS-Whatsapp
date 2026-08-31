import Link from "next/link";
import { FolderTree, Package, Plus } from "lucide-react";
import { createInventoryCategory } from "@/app/(app)/inventory/actions";
import { getInventoryCategoriesData } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type CategoriesPageProps = {
  searchParams: Promise<{ category?: string; created?: string; error?: string }>;
};

export default async function InventoryCategoriesPage({ searchParams }: CategoriesPageProps) {
  const [data, params] = await Promise.all([getInventoryCategoriesData(), searchParams]);
  const selectedCategory = data.categories.find((category) => category.id === params.category) ?? data.categories[0] ?? null;
  const selectedProducts = selectedCategory?.products ?? [];

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <Link href="/inventory" className="text-sm font-bold text-[#22ddeb]">
            Inventory
          </Link>
          <h1 className="mt-3 text-2xl font-black text-white">Categories</h1>
          <p className="mt-2 max-w-2xl text-[#8fa3ad]">
            Group products so cashiers can filter the POS catalog quickly.
          </p>
        </div>
      </section>

      {params.created === "category" ? (
        <div className="rounded-lg border border-[#22ddeb]/35 bg-[#082529] px-4 py-3 text-sm text-white">
          Category created.
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-lg border border-[#8d2638] bg-[#351018] px-4 py-3 text-sm text-[#ff9aac]">
          Category could not be created. Check the name or use a unique category for this tenant.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-4 md:grid-cols-2">
          {data.categories.map((category) => (
            <Link key={category.id} href={`/inventory/categories?category=${category.id}`}>
            <Card
              className={`h-full p-6 transition hover:border-[#22ddeb]/55 ${
                selectedCategory?.id === category.id ? "border-[#22ddeb]/70 bg-[#082529]/35" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div className="rounded-full bg-[#10181c] px-3 py-1 text-xs font-bold text-[#8fa3ad] ring-1 ring-[#1d3038]">
                  {category.productCount} products
                </div>
              </div>
              <h2 className="mt-5 text-lg font-semibold text-white">{category.name}</h2>
              <p className="mt-2 text-sm text-[#8fa3ad]">View products in this category.</p>
            </Card>
            </Link>
          ))}
          {!data.categories.length ? (
            <Card className="p-8 text-center md:col-span-2">
              <FolderTree className="mx-auto h-10 w-10 text-[#22ddeb]" />
              <h2 className="mt-4 text-lg font-semibold text-white">No categories yet</h2>
              <p className="mt-2 text-sm text-[#8fa3ad]">
                Add categories before the catalog grows too large.
              </p>
            </Card>
          ) : null}
          {data.uncategorizedCount ? (
            <Card className="p-6 md:col-span-2">
              <h2 className="text-lg font-semibold text-white">Uncategorized</h2>
              <p className="mt-2 text-sm text-[#8fa3ad]">
                {data.uncategorizedCount} products are not assigned to a category yet.
              </p>
            </Card>
          ) : null}
          {selectedCategory ? (
            <Card className="overflow-hidden md:col-span-2">
              <div className="border-b border-[#1d3038] px-6 py-5">
                <h2 className="text-lg font-semibold text-white">{selectedCategory.name}</h2>
                <p className="mt-1 text-sm text-[#8fa3ad]">
                  {selectedProducts.length} product{selectedProducts.length === 1 ? "" : "s"} in this category.
                </p>
              </div>
              <div className="divide-y divide-[#1d3038]">
                {selectedProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/inventory/products/${product.id}/edit`}
                    className="flex items-center gap-4 px-6 py-4 transition hover:bg-[#10181c]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1d3038] bg-[#0b1114] text-[#6f858f]">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{product.name}</div>
                      <div className="mt-1 text-sm text-[#8fa3ad]">{product.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[#22ddeb]">
                        {formatCurrency(product.price, data.company.currency)}
                      </div>
                      <Badge tone={product.active ? "green" : "slate"} className="mt-2">
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {!selectedProducts.length ? (
                  <div className="px-6 py-8 text-sm text-[#8fa3ad]">
                    No products are assigned to this category yet.
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </section>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Add Category</h2>
              <p className="text-sm text-[#8fa3ad]">Keep names short and cashier-friendly.</p>
            </div>
          </div>
          <form action={createInventoryCategory} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-white">
              Category Name
              <input
                name="name"
                required
                minLength={2}
                className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
                placeholder="Example: Drinks"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(34,221,235,0.2)] transition hover:bg-[#2ff4ff]"
            >
              Save Category
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
