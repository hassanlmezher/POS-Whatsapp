import Link from "next/link";
import { Boxes, FolderTree, PackagePlus, ShoppingCart, TableProperties } from "lucide-react";
import { getInventoryOverviewData } from "@/lib/data/repository";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const actions = [
  {
    title: "Product Catalog",
    description: "View every product assigned to this tenant, including stock and status.",
    href: "/inventory/products",
    icon: TableProperties,
  },
  {
    title: "Add Product",
    description: "Create a new SKU, assign a category, and set initial stock.",
    href: "/inventory/products/new",
    icon: PackagePlus,
  },
  {
    title: "Categories",
    description: "Organize the catalog by product groups for faster selling.",
    href: "/inventory/categories",
    icon: FolderTree,
  },
  {
    title: "Make Order",
    description: "Open the POS workspace and sell from the tenant catalog.",
    href: "/pos",
    icon: ShoppingCart,
  },
];

export default async function InventoryPage() {
  const data = await getInventoryOverviewData();
  const stats = [
    ["Total Products", data.stats.totalProducts.toLocaleString()],
    ["Active Products", data.stats.activeProducts.toLocaleString()],
    ["Out of Stock", data.stats.outOfStock.toLocaleString()],
    ["Categories", data.stats.categories.toLocaleString()],
  ];

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#22ddeb]">
            Inventory
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Products, stock, and catalog setup
          </h1>
          <p className="mt-2 max-w-2xl text-[#8fa3ad]">
            Manage the products that belong to {data.company.name}. Use this area for catalog
            setup, then open POS when it is time to sell.
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

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#6f858f]">
              {label}
            </div>
            <div className="mt-5 text-3xl font-black text-white">{value}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link key={action.href} href={action.href}>
              <Card className="h-full p-6 transition hover:-translate-y-0.5 hover:border-[#22ddeb]/55">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-white">{action.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#8fa3ad]">{action.description}</p>
              </Card>
            </Link>
          );
        })}
      </section>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#1d3038] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Catalog Health</h2>
            <p className="mt-1 text-sm text-[#8fa3ad]">Quick scan of what needs attention.</p>
          </div>
          <Boxes className="h-5 w-5 text-[#22ddeb]" />
        </div>
        <div className="grid gap-0 md:grid-cols-3">
          <div className="border-b border-[#1d3038] p-6 md:border-b-0 md:border-r">
            <div className="text-sm font-semibold text-white">Categories in use</div>
            <p className="mt-2 text-sm leading-6 text-[#8fa3ad]">
              {data.categories.length
                ? `${data.categories.length} categories are available for filtering products.`
                : "No categories exist yet. Add categories before the catalog grows."}
            </p>
          </div>
          <div className="border-b border-[#1d3038] p-6 md:border-b-0 md:border-r">
            <div className="text-sm font-semibold text-white">Sellable products</div>
            <p className="mt-2 text-sm leading-6 text-[#8fa3ad]">
              {data.stats.activeProducts} active products can be managed from the product catalog.
            </p>
          </div>
          <div className="p-6">
            <div className="text-sm font-semibold text-white">Stock attention</div>
            <p className="mt-2 text-sm leading-6 text-[#8fa3ad]">
              {data.stats.outOfStock
                ? `${data.stats.outOfStock} products are currently out of stock.`
                : "No out-of-stock products found."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
