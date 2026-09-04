"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { ImageUp, Package, RefreshCw } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Category, Product } from "@/lib/types/domain";

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  product?: Product;
  skuSeed?: string;
  submitLabel: string;
};

function buildSku(name: string, categoryName: string | undefined, seed: string) {
  const source = `${categoryName ?? ""} ${name}`.trim() || "Product";
  const compact = source.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = (compact || "SKU").slice(0, 3).padEnd(3, "X");
  return `${prefix}-${seed}`;
}

export function ProductForm({ action, categories, product, skuSeed = "0001", submitLabel }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [sku, setSku] = useState(product?.sku ?? buildSku("", undefined, skuSeed));
  const [skuEdited, setSkuEdited] = useState(Boolean(product?.sku));
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");
  const [fileName, setFileName] = useState("");

  const categoryName = categories.find((category) => category.id === categoryId)?.name;

  function updateAutoSku(nextName: string, nextCategoryId: string) {
    if (!skuEdited) {
      const nextCategoryName = categories.find((category) => category.id === nextCategoryId)?.name;
      setSku(buildSku(nextName, nextCategoryName, skuSeed));
    }
  }

  function regenerateSku() {
    setSku(buildSku(name, categoryName, skuSeed));
    setSkuEdited(false);
  }

  return (
    <CardLikeForm action={action}>
      <label className="block text-sm font-semibold text-black">
        Product Name
        <input
          name="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            updateAutoSku(event.target.value, categoryId);
          }}
          className="mt-2 h-12 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-4 text-black outline-none placeholder:text-[#000000] focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
          placeholder="Example: Premium Coffee"
        />
      </label>

      <label className="block text-sm font-semibold text-black">
        SKU
        <span className="mt-2 flex h-12 rounded-lg border border-[#d8c3ff] bg-[#ffffff] focus-within:border-[#7c3aed] focus-within:ring-4 focus-within:ring-[#7c3aed]/15">
          <input
            name="sku"
            required
            value={sku}
            onChange={(event) => {
              setSku(event.target.value);
              setSkuEdited(true);
            }}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-4 text-black outline-none placeholder:text-[#000000]"
            placeholder="Auto-generated"
          />
          <button
            type="button"
            onClick={regenerateSku}
            className="flex w-12 items-center justify-center rounded-r-lg text-[#000000] transition hover:bg-[#f4ecff] hover:text-[#7c3aed]"
            aria-label="Regenerate SKU"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </span>
      </label>

      <label className="block text-sm font-semibold text-black">
        Category
        <select
          name="categoryId"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            updateAutoSku(name, event.target.value);
          }}
          className="mt-2 h-12 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-4 text-black outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
        >
          <option value="">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-black">
        Price
        <input
          name="price"
          required
          min="0"
          step="0.01"
          type="number"
          defaultValue={product?.price ?? ""}
          className="mt-2 h-12 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-4 text-black outline-none placeholder:text-[#000000] focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
          placeholder="0.00"
        />
      </label>

      <label className="block text-sm font-semibold text-black">
        {product ? "Stock" : "Initial Stock"}
        <input
          name="initialStock"
          min="0"
          step="1"
          type="number"
          defaultValue={product?.stock ?? 0}
          className="mt-2 h-12 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-4 text-black outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
        />
      </label>

      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold text-black md:self-end">
        <input
          name="active"
          type="checkbox"
          defaultChecked={product?.active ?? true}
          className="h-5 w-5 rounded border-black/20 accent-[#7c3aed]"
        />
        Active in POS
      </label>

      <div className="md:col-span-2">
        <label className="block text-sm font-semibold text-black">
          Product Image
          <div className="mt-2 grid gap-4 rounded-lg border border-dashed border-[#c4a5ff] bg-[#ffffff] p-4 md:grid-cols-[140px_minmax(0,1fr)]">
            <div
              className="flex h-32 w-full items-center justify-center rounded-lg border border-[#d8c3ff] bg-cover bg-center text-[#000000] md:w-32"
              style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}
            >
              {!previewUrl ? <Package className="h-9 w-9" /> : null}
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-3">
              <span className="text-sm text-[#000000]">
                {fileName || (product?.imageUrl ? "Current image selected" : "Choose an image from this device.")}
              </span>
              <span className="inline-flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#f4ecff] px-4 text-sm font-bold text-[#7c3aed] ring-1 ring-[#7c3aed]/35 transition hover:bg-[#eadbff]">
                <ImageUp className="h-4 w-4" />
                Upload Image
              </span>
              <input
                name="imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setFileName(file?.name ?? "");
                  if (file) {
                    setPreviewUrl(URL.createObjectURL(file));
                  } else {
                    setPreviewUrl(product?.imageUrl ?? "");
                  }
                }}
              />
            </div>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 md:col-span-2">
        <Link
          href="/inventory/products"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-[#d8c3ff] px-5 text-sm font-semibold text-black transition hover:bg-[#f4ecff]"
        >
          Cancel
        </Link>
        <SubmitButton
          pendingText="Saving product..."
          className="inline-flex h-12 items-center justify-center rounded-lg bg-[#7c3aed] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(124,58,237,0.2)] transition hover:bg-[#6d28d9]"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </CardLikeForm>
  );
}

function CardLikeForm({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <form action={action} encType="multipart/form-data" className="grid gap-5 md:grid-cols-2">
      {children}
    </form>
  );
}
