"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant-context";

const PRODUCT_IMAGE_BUCKET = process.env.PRODUCT_IMAGE_BUCKET ?? "product-images";
const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const productSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(1),
  price: z.coerce.number().min(0),
  categoryId: z.string().uuid().nullable(),
  initialStock: z.coerce.number().int().min(0),
  active: z.boolean(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2),
});

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length ? text : null;
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    categoryId: optionalString(formData.get("categoryId")),
    initialStock: formData.get("initialStock") ?? "0",
    active: formData.get("active") === "on",
  });
}

function getProductImageFile(formData: FormData) {
  const file = formData.get("imageFile");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new Error("invalid-image");
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("invalid-image");
  }

  return file;
}

async function ensureProductImageBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket(PRODUCT_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_PRODUCT_IMAGE_BYTES,
    allowedMimeTypes: Array.from(PRODUCT_IMAGE_TYPES.keys()),
  });

  if (!error) {
    return;
  }

  const message = error.message.toLowerCase();
  if (!message.includes("already exists") && !message.includes("duplicate")) {
    throw error;
  }
}

async function uploadProductImage({
  supabase,
  tenantId,
  productId,
  file,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  productId: string;
  file: File;
}) {
  await ensureProductImageBucket(supabase);

  const extension = PRODUCT_IMAGE_TYPES.get(file.type) ?? "jpg";
  const storagePath = `${tenantId}/${productId}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function assertTenantCategory(input: { categoryId: string | null; tenantId: string; supabase: SupabaseClient }) {
  if (!input.categoryId) {
    return;
  }

  const { data: category, error: categoryError } = await input.supabase
    .from("product_categories")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("id", input.categoryId)
    .maybeSingle<{ id: string }>();

  if (categoryError || !category) {
    redirect("/inventory/products/new?error=invalid-category");
  }
}

async function setProductStock(input: {
  supabase: SupabaseClient;
  tenantId: string;
  productId: string;
  quantity: number;
}) {
  const { data: branch, error: branchError } = await input.supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (branchError || !branch) {
    return false;
  }

  const { error: inventoryError } = await input.supabase.from("inventory").upsert(
    {
      tenant_id: input.tenantId,
      branch_id: branch.id,
      product_id: input.productId,
      quantity: input.quantity,
    },
    { onConflict: "tenant_id,branch_id,product_id" },
  );

  return !inventoryError;
}

export async function createInventoryProduct(formData: FormData) {
  const parsed = parseProductForm(formData);

  if (!parsed.success) {
    redirect("/inventory/products/new?error=invalid-product");
  }

  let imageFile: File | null = null;
  try {
    imageFile = getProductImageFile(formData);
  } catch {
    redirect("/inventory/products/new?error=invalid-image");
  }

  const { tenant } = await getTenantContext();
  const supabase = createSupabaseAdminClient();
  const input = parsed.data;

  await assertTenantCategory({ categoryId: input.categoryId, tenantId: tenant.id, supabase });

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      tenant_id: tenant.id,
      category_id: input.categoryId,
      name: input.name,
      sku: input.sku,
      price: input.price,
      image_url: null,
      active: input.active,
    })
    .select("id")
    .single<{ id: string }>();

  if (productError || !product) {
    redirect("/inventory/products/new?error=product-create-failed");
  }

  let imageSkipped = false;
  if (imageFile) {
    try {
      const imageUrl = await uploadProductImage({
        supabase,
        tenantId: tenant.id,
        productId: product.id,
        file: imageFile,
      });
      const { error: imageUpdateError } = await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("tenant_id", tenant.id)
        .eq("id", product.id);
      imageSkipped = Boolean(imageUpdateError);
    } catch (error) {
      console.error("[inventory] Product image upload failed", error);
      imageSkipped = true;
    }
  }

  const stockSaved = await setProductStock({
    supabase,
    tenantId: tenant.id,
    productId: product.id,
    quantity: input.initialStock,
  });

  const params = new URLSearchParams({ created: "product" });
  if (!stockSaved) params.set("stock", "skipped");
  if (imageSkipped) params.set("image", "skipped");
  redirect(`/inventory/products?${params.toString()}`);
}

export async function updateInventoryProduct(productId: string, formData: FormData) {
  const productIdResult = z.string().uuid().safeParse(productId);
  const parsed = parseProductForm(formData);

  if (!productIdResult.success || !parsed.success) {
    redirect(`/inventory/products/${productId}/edit?error=invalid-product`);
  }

  let imageFile: File | null = null;
  try {
    imageFile = getProductImageFile(formData);
  } catch {
    redirect(`/inventory/products/${productId}/edit?error=invalid-image`);
  }

  const { tenant } = await getTenantContext();
  const supabase = createSupabaseAdminClient();
  const input = parsed.data;

  await assertTenantCategory({ categoryId: input.categoryId, tenantId: tenant.id, supabase });

  const { data: product, error: productLookupError } = await supabase
    .from("products")
    .select("id,image_url")
    .eq("tenant_id", tenant.id)
    .eq("id", productIdResult.data)
    .maybeSingle<{ id: string; image_url: string | null }>();

  if (productLookupError || !product) {
    redirect("/inventory/products?error=product-not-found");
  }

  let imageUrl = product.image_url;
  let imageSkipped = false;
  if (imageFile) {
    try {
      imageUrl = await uploadProductImage({
        supabase,
        tenantId: tenant.id,
        productId: product.id,
        file: imageFile,
      });
    } catch (error) {
      console.error("[inventory] Product image upload failed", error);
      imageSkipped = true;
    }
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      category_id: input.categoryId,
      name: input.name,
      sku: input.sku,
      price: input.price,
      image_url: imageUrl,
      active: input.active,
    })
    .eq("tenant_id", tenant.id)
    .eq("id", product.id);

  if (updateError) {
    redirect(`/inventory/products/${product.id}/edit?error=product-update-failed`);
  }

  const stockSaved = await setProductStock({
    supabase,
    tenantId: tenant.id,
    productId: product.id,
    quantity: input.initialStock,
  });

  const params = new URLSearchParams({ updated: "product" });
  if (!stockSaved) params.set("stock", "skipped");
  if (imageSkipped) params.set("image", "skipped");
  redirect(`/inventory/products?${params.toString()}`);
}

export async function deleteInventoryProduct(productId: string) {
  const productIdResult = z.string().uuid().safeParse(productId);
  if (!productIdResult.success) {
    redirect("/inventory/products?error=delete-failed");
  }

  const { tenant } = await getTenantContext();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("tenant_id", tenant.id)
    .eq("id", productIdResult.data);

  if (error) {
    redirect("/inventory/products?error=delete-failed");
  }

  redirect("/inventory/products?deleted=product");
}

export async function createInventoryCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirect("/inventory/categories?error=invalid-category");
  }

  const { tenant } = await getTenantContext();
  const supabase = createSupabaseAdminClient();

  const { count } = await supabase
    .from("product_categories")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const { error } = await supabase.from("product_categories").insert({
    tenant_id: tenant.id,
    name: parsed.data.name,
    icon: "Package",
    sort_order: count ?? 0,
  });

  if (error) {
    redirect("/inventory/categories?error=category-create-failed");
  }

  redirect("/inventory/categories?created=category");
}
