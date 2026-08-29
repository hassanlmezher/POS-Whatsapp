"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant-context";

const productSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(1),
  price: z.coerce.number().min(0),
  categoryId: z.string().uuid().nullable(),
  imageUrl: z.string().trim().url().nullable(),
  initialStock: z.coerce.number().int().min(0),
  reorderLevel: z.coerce.number().int().min(0),
  active: z.boolean(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2),
  icon: z.string().trim().min(1).default("Package"),
});

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length ? text : null;
}

export async function createInventoryProduct(formData: FormData) {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    categoryId: optionalString(formData.get("categoryId")),
    imageUrl: optionalString(formData.get("imageUrl")),
    initialStock: formData.get("initialStock") ?? "0",
    reorderLevel: formData.get("reorderLevel") ?? "0",
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    redirect("/inventory/products/new?error=invalid-product");
  }

  const { tenant } = await getTenantContext();
  const supabase = createSupabaseAdminClient();
  const input = parsed.data;

  if (input.categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("product_categories")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", input.categoryId)
      .maybeSingle<{ id: string }>();

    if (categoryError || !category) {
      redirect("/inventory/products/new?error=invalid-category");
    }
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      tenant_id: tenant.id,
      category_id: input.categoryId,
      name: input.name,
      sku: input.sku,
      price: input.price,
      image_url: input.imageUrl,
      active: input.active,
    })
    .select("id")
    .single<{ id: string }>();

  if (productError || !product) {
    redirect("/inventory/products/new?error=product-create-failed");
  }

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (branchError) {
    redirect("/inventory/products?created=product&stock=skipped");
  }

  if (branch) {
    const { error: inventoryError } = await supabase.from("inventory").insert({
      tenant_id: tenant.id,
      branch_id: branch.id,
      product_id: product.id,
      quantity: input.initialStock,
      reorder_level: input.reorderLevel,
    });

    if (inventoryError) {
      redirect("/inventory/products?created=product&stock=skipped");
    }
  }

  redirect("/inventory/products?created=product");
}

export async function createInventoryCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    icon: optionalString(formData.get("icon")) ?? "Package",
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
    icon: parsed.data.icon,
    sort_order: count ?? 0,
  });

  if (error) {
    redirect("/inventory/categories?error=category-create-failed");
  }

  redirect("/inventory/categories?created=category");
}
