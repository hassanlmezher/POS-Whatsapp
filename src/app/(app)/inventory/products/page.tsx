import Link from "next/link";
import { PackagePlus, Pencil, Trash2 } from "lucide-react";
import { deleteInventoryProduct } from "@/app/(app)/inventory/actions";
import { getInventoryProductsData } from "@/lib/data/repository";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams: Promise<{ created?: string; updated?: string; deleted?: string; stock?: string; image?: string; error?: string }>;
};

export default async function InventoryProductsPage({ searchParams }: ProductsPageProps) {
  const [data, params] = await Promise.all([getInventoryProductsData(), searchParams]);
  const categoryById = new Map(data.categories.map((category) => [category.id, category.name]));

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <Link href="/inventory" className="text-sm font-bold text-[#22ddeb]">
            Inventory
          </Link>
          <h1 className="mt-3 text-2xl font-black text-white">Product Catalog</h1>
          <p className="mt-2 text-[#8fa3ad]">
            All products stored for this tenant in Supabase.
          </p>
        </div>
        <Link
          href="/inventory/products/new"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(34,221,235,0.2)] transition hover:bg-[#2ff4ff]"
        >
          <PackagePlus className="h-4 w-4" />
          Add Product
        </Link>
      </section>

      {params.created === "product" ? (
        <div className="rounded-lg border border-[#22ddeb]/35 bg-[#082529] px-4 py-3 text-sm text-white">
          Product created. {params.stock === "skipped" ? "Stock was skipped." : ""} {params.image === "skipped" ? "Image upload was skipped." : ""}
        </div>
      ) : null}
      {params.updated === "product" ? (
        <div className="rounded-lg border border-[#22ddeb]/35 bg-[#082529] px-4 py-3 text-sm text-white">
          Product updated. {params.stock === "skipped" ? "Stock was skipped." : ""} {params.image === "skipped" ? "Image upload was skipped." : ""}
        </div>
      ) : null}
      {params.deleted === "product" ? (
        <div className="rounded-lg border border-[#22ddeb]/35 bg-[#082529] px-4 py-3 text-sm text-white">
          Product deleted.
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-lg border border-[#8d2638] bg-[#351018] px-4 py-3 text-sm text-[#ff9aac]">
          Product action failed. It may be linked to an existing order.
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left">
            <thead className="bg-[#0b1114] text-xs uppercase tracking-[0.12em] text-[#6f858f]">
              <tr>
                <th className="px-6 py-5">Product</th>
                <th className="px-6 py-5">SKU</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Stock</th>
                <th className="px-6 py-5">Price</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((product) => {
                const deleteProduct = deleteInventoryProduct.bind(null, product.id);

                return (
                  <tr key={product.id} className="border-t border-[#1d3038] text-white">
                    <td className="px-6 py-5 font-semibold">{product.name}</td>
                    <td className="px-6 py-5 text-[#8fa3ad]">{product.sku}</td>
                    <td className="px-6 py-5 text-[#8fa3ad]">
                      {categoryById.get(product.categoryId) ?? "Uncategorized"}
                    </td>
                    <td className="px-6 py-5 font-semibold">{product.stock.toLocaleString()}</td>
                    <td className="px-6 py-5 font-black text-[#22ddeb]">
                      {formatCurrency(product.price, data.company.currency)}
                    </td>
                    <td className="px-6 py-5">
                      <Badge tone={product.active ? "green" : "slate"}>
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/inventory/products/${product.id}/edit`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#1d3038] px-3 text-sm font-bold text-[#f8fbff] transition hover:bg-[#10181c] hover:text-[#22ddeb]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                        <form action={deleteProduct}>
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#5c1d29] bg-[#351018] px-3 text-sm font-bold text-[#ff9aac] transition hover:bg-[#43131e]"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data.products.length ? (
          <div className="border-t border-[#1d3038] px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-white">No products yet</h2>
            <p className="mt-2 text-sm text-[#8fa3ad]">
              Add the first product for this tenant to start selling from POS.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
