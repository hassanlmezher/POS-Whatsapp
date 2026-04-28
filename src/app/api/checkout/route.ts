import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { company as fallbackCompany, customers as fallbackCustomers, products as fallbackProducts } from "@/lib/data/mock-data";

const checkoutSchema = z.object({
  companyId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  paymentMethod: z.enum(["cash", "card"]),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
});

type DbCompany = {
  id: string;
  tax_rate: number | string | null;
};

type DbProduct = {
  id: string;
  company_id: string;
  name: string;
  price: number | string;
  active: boolean;
};

type DbInventory = {
  id: string;
  product_id: string;
  quantity: number;
};

function normalizeSupabaseUrl(value?: string) {
  if (!value) {
    return value;
  }

  return new URL(value).origin;
}

function getSupabase() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function makeOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `ORD-${timestamp}${suffix}`;
}

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = getSupabase();

  if (!supabase) {
    return checkoutWithFallback(input);
  }

  try {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id,tax_rate")
      .eq("id", input.companyId)
      .single<DbCompany>();

    if (companyError || !company) {
      console.error("[checkout] Company lookup failed", { companyId: input.companyId, companyError });
      return NextResponse.json({ error: "Company not found for checkout" }, { status: 404 });
    }

    const productIds = input.items.map((item) => item.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id,company_id,name,price,active")
      .eq("company_id", input.companyId)
      .in("id", productIds)
      .returns<DbProduct[]>();

    if (productsError) {
      console.error("[checkout] Product lookup failed", { productIds, productsError });
      return NextResponse.json({ error: "Could not validate checkout products" }, { status: 500 });
    }

    const productsById = new Map((products ?? []).map((product) => [product.id, product]));
    const missingProductIds = productIds.filter((productId) => !productsById.has(productId));

    if (missingProductIds.length > 0) {
      console.error("[checkout] Product IDs not found in Supabase", {
        companyId: input.companyId,
        missingProductIds,
        receivedProductIds: productIds,
      });
      return NextResponse.json(
        {
          error: "One or more checkout products were not found in the database",
          missingProductIds,
        },
        { status: 400 },
      );
    }

    const inactiveProductIds = (products ?? []).filter((product) => !product.active).map((product) => product.id);
    if (inactiveProductIds.length > 0) {
      return NextResponse.json(
        { error: "One or more checkout products are inactive", inactiveProductIds },
        { status: 409 },
      );
    }

    const { data: inventoryRows, error: inventoryError } = await supabase
      .from("inventory")
      .select("id,product_id,quantity")
      .eq("company_id", input.companyId)
      .in("product_id", productIds)
      .returns<DbInventory[]>();

    if (inventoryError) {
      console.error("[checkout] Inventory lookup failed", { productIds, inventoryError });
      return NextResponse.json({ error: "Could not validate inventory" }, { status: 500 });
    }

    const inventoryByProductId = new Map((inventoryRows ?? []).map((row) => [row.product_id, row]));
    const missingInventoryIds = productIds.filter((productId) => !inventoryByProductId.has(productId));
    if (missingInventoryIds.length > 0) {
      console.error("[checkout] Inventory rows missing for products", { missingInventoryIds });
      return NextResponse.json(
        {
          error: "Inventory is not configured for one or more products",
          missingProductIds: missingInventoryIds,
        },
        { status: 409 },
      );
    }

    const insufficientStock = input.items
      .map((item) => {
        const inventory = inventoryByProductId.get(item.productId);
        return inventory && inventory.quantity < item.quantity
          ? { productId: item.productId, available: inventory.quantity, requested: item.quantity }
          : null;
      })
      .filter(Boolean);

    if (insufficientStock.length > 0) {
      return NextResponse.json({ error: "Insufficient inventory", insufficientStock }, { status: 409 });
    }

    const subtotal = input.items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      return sum + money(product?.price) * item.quantity;
    }, 0);
    const taxTotal = subtotal * money(company.tax_rate);
    const total = subtotal + taxTotal;
    const orderNumber = makeOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        company_id: input.companyId,
        customer_id: input.customerId,
        order_number: orderNumber,
        status: "completed",
        payment_status: "paid",
        subtotal,
        tax_total: taxTotal,
        total,
      })
      .select("id,order_number,total")
      .single<{ id: string; order_number: string; total: number | string }>();

    if (orderError || !order) {
      console.error("[checkout] Order insert failed", { orderNumber, orderError });
      return NextResponse.json({ error: "Could not create order" }, { status: 500 });
    }

    const orderItems = input.items.map((item) => {
      const product = productsById.get(item.productId);
      const unitPrice = money(product?.price);
      return {
        company_id: input.companyId,
        order_id: order.id,
        product_id: item.productId,
        product_name: product?.name ?? "Product",
        quantity: item.quantity,
        unit_price: unitPrice,
        line_total: unitPrice * item.quantity,
      };
    });

    const { error: orderItemsError } = await supabase.from("order_items").insert(orderItems);
    if (orderItemsError) {
      console.error("[checkout] Order items insert failed", { orderId: order.id, orderItemsError });
      return NextResponse.json({ error: "Order created but items could not be saved" }, { status: 500 });
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      company_id: input.companyId,
      order_id: order.id,
      method: input.paymentMethod,
      amount: total,
      status: "paid",
    });

    if (paymentError) {
      console.error("[checkout] Payment insert failed", { orderId: order.id, paymentError });
      return NextResponse.json({ error: "Order created but payment could not be saved" }, { status: 500 });
    }

    for (const item of input.items) {
      const inventory = inventoryByProductId.get(item.productId);
      if (!inventory) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("inventory")
        .update({ quantity: inventory.quantity - item.quantity })
        .eq("id", inventory.id);

      if (updateError) {
        console.error("[checkout] Inventory update failed", {
          orderId: order.id,
          productId: item.productId,
          updateError,
        });
        return NextResponse.json({ error: "Order created but inventory could not be updated" }, { status: 500 });
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        companyId: input.companyId,
        customerId: input.customerId,
        paymentMethod: input.paymentMethod,
        subtotal,
        taxTotal,
        total,
        status: "completed",
        paymentStatus: "paid",
      },
    });
  } catch (error) {
    console.error("[checkout] Unexpected checkout failure", error);
    return NextResponse.json({ error: "Unexpected checkout failure" }, { status: 500 });
  }
}

function checkoutWithFallback(input: z.infer<typeof checkoutSchema>) {
  if (input.companyId !== fallbackCompany.id) {
    return NextResponse.json({ error: "Company not found in fallback checkout" }, { status: 404 });
  }

  const productIds = input.items.map((item) => item.productId);
  const productsById = new Map(fallbackProducts.map((product) => [product.id, product]));
  const missingProductIds = productIds.filter((productId) => !productsById.has(productId));

  if (missingProductIds.length > 0) {
    console.error("[checkout:fallback] Product IDs not found in fallback data", {
      missingProductIds,
      receivedProductIds: productIds,
    });
    return NextResponse.json(
      { error: "One or more checkout products were not found in fallback data", missingProductIds },
      { status: 400 },
    );
  }

  const subtotal = input.items.reduce((sum, item) => {
    const product = productsById.get(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const taxTotal = subtotal * fallbackCompany.taxRate;
  const customer = input.customerId ? fallbackCustomers.find((item) => item.id === input.customerId) : null;

  return NextResponse.json({
    order: {
      id: crypto.randomUUID(),
      orderNumber: makeOrderNumber(),
      companyId: input.companyId,
      customerId: input.customerId,
      customerName: customer?.name ?? "Walk-in Customer",
      paymentMethod: input.paymentMethod,
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      status: "completed",
      paymentStatus: "paid",
      fallbackMode: true,
    },
  });
}
