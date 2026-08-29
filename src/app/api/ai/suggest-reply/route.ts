import { NextResponse } from "next/server";
import { z } from "zod";
import { AiConfigurationError, AiProviderError, suggestReply, type SuggestReplyInput } from "@/lib/ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext, tenantContextErrorStatus } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  conversationId: z.string().uuid(),
});

const acceptSchema = z.object({
  suggestionId: z.string().uuid(),
});

type DbConversation = {
  id: string;
  tenant_id: string;
  customer_id: string;
};

type DbCustomer = {
  id: string;
  name: string;
  notes: string | null;
  tags: string[] | null;
};

type DbMessage = {
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
};

type DbCategory = {
  id: string;
  name: string;
};

type DbProduct = {
  id: string;
  category_id: string | null;
  name: string;
  price: number | string;
  active: boolean;
};

type DbInventory = {
  product_id: string;
  quantity: number | null;
};

type DbOrder = {
  order_number: string;
  status: string;
  payment_status: string;
  total: number | string;
  created_at: string;
};

function money(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid suggest-reply payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { tenant } = await getTenantContext();
    const supabase = createSupabaseAdminClient();
    // Production note: add per-tenant/user rate limiting here before calling any AI provider.
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id,tenant_id,customer_id")
      .eq("id", parsed.data.conversationId)
      .eq("tenant_id", tenant.id)
      .maybeSingle<DbConversation>();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const [
      customerResult,
      messagesResult,
      categoriesResult,
      productsResult,
      inventoryResult,
      ordersResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id,name,notes,tags")
        .eq("id", conversation.customer_id)
        .eq("tenant_id", tenant.id)
        .single<DbCustomer>(),
      supabase
        .from("messages")
        .select("direction,body,created_at")
        .eq("tenant_id", tenant.id)
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<DbMessage[]>(),
      supabase
        .from("product_categories")
        .select("id,name")
        .eq("tenant_id", tenant.id)
        .returns<DbCategory[]>(),
      supabase
        .from("products")
        .select("id,category_id,name,price,active")
        .eq("tenant_id", tenant.id)
        .order("name")
        .limit(40)
        .returns<DbProduct[]>(),
      supabase
        .from("inventory")
        .select("product_id,quantity")
        .eq("tenant_id", tenant.id)
        .returns<DbInventory[]>(),
      supabase
        .from("orders")
        .select("order_number,status,payment_status,total,created_at")
        .eq("tenant_id", tenant.id)
        .eq("customer_id", conversation.customer_id)
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<DbOrder[]>(),
    ]);

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json({ error: "Customer context could not be loaded" }, { status: 500 });
    }

    if (messagesResult.error || productsResult.error || categoriesResult.error || inventoryResult.error || ordersResult.error) {
      console.error("[ai/suggest-reply] Context lookup failed", {
        messagesError: messagesResult.error,
        productsError: productsResult.error,
        categoriesError: categoriesResult.error,
        inventoryError: inventoryResult.error,
        ordersError: ordersResult.error,
      });
      return NextResponse.json({ error: "AI suggestion context could not be loaded" }, { status: 500 });
    }

    const categoryById = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));
    const stockByProductId = new Map<string, number>();

    for (const row of inventoryResult.data ?? []) {
      stockByProductId.set(row.product_id, (stockByProductId.get(row.product_id) ?? 0) + Number(row.quantity ?? 0));
    }

    const input: SuggestReplyInput = {
      business: {
        name: tenant.name,
        currency: tenant.currency,
        timezone: tenant.timezone ?? undefined,
      },
      customer: {
        name: customerResult.data.name,
        notes: customerResult.data.notes ?? undefined,
        tags: customerResult.data.tags ?? [],
      },
      messages: [...(messagesResult.data ?? [])].reverse().map((message) => ({
        direction: message.direction,
        body: message.body,
        createdAt: message.created_at,
      })),
      products: (productsResult.data ?? []).map((product) => ({
        name: product.name,
        category: product.category_id ? categoryById.get(product.category_id) : undefined,
        price: money(product.price),
        stock: stockByProductId.get(product.id),
      })),
      orders: (ordersResult.data ?? []).map((order) => ({
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        total: money(order.total),
        createdAt: order.created_at,
      })),
    };

    const result = await suggestReply(input);

    const { data: suggestionLog, error: logError } = await supabase
      .from("ai_suggestions")
      .insert({
        tenant_id: tenant.id,
        conversation_id: conversation.id,
        suggestion_text: result.suggestion,
        provider: result.provider,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (logError) {
      console.warn("[ai/suggest-reply] Suggestion logging skipped", logError);
    }

    return NextResponse.json({
      suggestion: result.suggestion,
      provider: result.provider,
      model: result.model,
      wasRetried: result.wasRetried,
      suggestionId: suggestionLog?.id,
    });
  } catch (error) {
    console.error("[ai/suggest-reply] Failed", error);

    if (error instanceof AiConfigurationError || error instanceof AiProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected AI suggestion failure" },
      { status: tenantContextErrorStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  const parsed = acceptSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid accept-suggestion payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { tenant } = await getTenantContext();
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("ai_suggestions")
      .update({ accepted: true })
      .eq("id", parsed.data.suggestionId)
      .eq("tenant_id", tenant.id);

    if (error) {
      console.warn("[ai/suggest-reply] Suggestion accept logging skipped", error);
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected AI suggestion failure" },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
