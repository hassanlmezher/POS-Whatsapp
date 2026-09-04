import Link from "next/link";
import { notFound } from "next/navigation";
import { updateInventoryProduct } from "@/app/(app)/inventory/actions";
import { getEditProductData } from "@/lib/data/repository";
import { ProductForm } from "@/components/inventory/product-form";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-product": "Check the product name, SKU, price, and stock.",
  "invalid-image": "Upload a JPG, PNG, WebP, or GIF image under 8 MB.",
  "invalid-category": "The selected category does not belong to this tenant.",
  "product-update-failed": "Product could not be updated. The SKU may already exist.",
};

export default async function EditInventoryProductPage({ params, searchParams }: EditProductPageProps) {
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  const data = await getEditProductData(productId);

  if (!data) {
    notFound();
  }

  const updateProduct = updateInventoryProduct.bind(null, data.product.id);
  const errorMessage = query.error ? errorMessages[query.error] : null;

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div>
        <Link href="/inventory/products" className="text-sm font-bold text-[#7c3aed]">
          Product Catalog
        </Link>
        <h1 className="mt-3 text-2xl font-black text-black">Edit Product</h1>
        <p className="mt-2 max-w-2xl text-[#000000]">
          Update product details, stock, image, and POS availability.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-[#7c3aed] bg-[#f4ecff] px-4 py-3 text-sm text-[#6d28d9]">
          {errorMessage}
        </div>
      ) : null}

      <Card className="max-w-3xl p-6">
        <ProductForm
          action={updateProduct}
          categories={data.categories}
          product={data.product}
          submitLabel="Update Product"
        />
        {!data.branches.length ? (
          <p className="mt-5 rounded-lg border border-[#7c3aed] bg-[#f4ecff] px-4 py-3 text-sm text-[#6d28d9]">
            No active branch exists for this tenant. Product details can be updated, but stock
            cannot be assigned until a branch exists.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
