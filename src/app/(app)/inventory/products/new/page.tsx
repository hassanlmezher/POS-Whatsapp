import Link from "next/link";
import { createInventoryProduct } from "@/app/(app)/inventory/actions";
import { getNewProductData } from "@/lib/data/repository";
import { ProductForm } from "@/components/inventory/product-form";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type NewProductPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-product": "Check the product name, SKU, price, and stock.",
  "invalid-image": "Upload a JPG, PNG, WebP, or GIF image under 8 MB.",
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
        <ProductForm
          action={createInventoryProduct}
          categories={data.categories}
          skuSeed={data.skuSeed}
          submitLabel="Save Product"
        />
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
