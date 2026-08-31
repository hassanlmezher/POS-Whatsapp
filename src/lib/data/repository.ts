import "server-only";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTenantContext as getAuthenticatedTenantContext, type Tenant } from "@/lib/tenant-context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Category,
  Company,
  Conversation,
  Customer,
  DashboardData,
  MessageAudio,
  Message,
  MessageType,
  Order,
  OrderItem,
  Product,
  WhatsAppConnection,
} from "@/lib/types/domain";

const MESSAGE_SELECT =
  "id,tenant_id,conversation_id,customer_id,message_type,direction,body,status,whatsapp_message_id,media_id,media_mime_type,media_sha256,media_is_voice,media_duration_seconds,media_file_size,media_storage_bucket,media_storage_path,media_file_name,media_error,created_at";
const LEGACY_MESSAGE_SELECT =
  "id,tenant_id,conversation_id,customer_id,direction,body,status,whatsapp_message_id,created_at";

type DbCategory = { id: string; tenant_id: string; name: string; icon: string | null };
type DbProduct = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  sku: string;
  price: number | string;
  image_url: string | null;
  active: boolean;
};
type DbCustomer = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  whatsapp_phone: string;
  avatar_url: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
};
type DbConversation = {
  id: string;
  tenant_id: string;
  customer_id: string;
  status: "open" | "pending" | "closed";
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
};
type DbMessage = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  customer_id: string;
  message_type?: string | null;
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id: string | null;
  media_id?: string | null;
  media_mime_type?: string | null;
  media_sha256?: string | null;
  media_is_voice?: boolean | null;
  media_duration_seconds?: number | string | null;
  media_file_size?: number | string | null;
  media_storage_bucket?: string | null;
  media_storage_path?: string | null;
  media_file_name?: string | null;
  media_error?: string | null;
  created_at: string;
};
type DbOrder = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  conversation_id: string | null;
  order_number: string;
  status: "draft" | "processing" | "completed" | "cancelled" | "delivered";
  payment_status: "pending" | "paid" | "refunded" | "failed";
  subtotal: number | string;
  tax_total: number | string;
  total: number | string;
  created_at: string;
};
type DbOrderItem = {
  id: string;
  tenant_id?: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};
type DbProductImage = { id: string; image_url: string | null };

function assertNoError(error: unknown, context: string) {
  if (error) throw new Error(`${context}: ${JSON.stringify(error)}`);
}

function isMissingMessageMediaSchema(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const message = typeof record.message === "string" ? record.message : "";

  return (
    record.code === "PGRST204" ||
    record.code === "42703" ||
    message.includes("message_type") ||
    message.includes("media_") ||
    message.includes("schema cache")
  );
}

function isMissingOrderItemTenantSchema(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";

  return (
    record.code === "PGRST204" ||
    record.code === "42703" ||
    message.includes("tenant_id") ||
    message.includes("schema cache")
  );
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function mapTenant(tenant: Tenant): Company {
  return { id: tenant.id, name: tenant.name, currency: tenant.currency, taxRate: tenant.taxRate };
}

function mapCategory(row: DbCategory): Category {
  return { id: row.id, companyId: row.tenant_id, name: row.name, icon: row.icon ?? "LayoutGrid" };
}

function mapCustomer(row: DbCustomer): Customer {
  return {
    id: row.id,
    companyId: row.tenant_id,
    name: row.name,
    phone: row.phone ?? row.whatsapp_phone,
    whatsappPhone: row.whatsapp_phone,
    avatarUrl: row.avatar_url,
    notes: row.notes ?? "",
    tags: row.tags ?? [],
    createdAt: row.created_at,
  };
}

function mapProduct(row: DbProduct, stockByProductId: Map<string, number>): Product {
  return {
    id: row.id,
    companyId: row.tenant_id,
    categoryId: row.category_id ?? "",
    name: row.name,
    sku: row.sku,
    price: money(row.price),
    stock: stockByProductId.get(row.id) ?? 0,
    imageUrl: row.image_url ?? "",
    active: row.active,
  };
}

function mapOrder(row: DbOrder, customersById = new Map<string, Customer>()): Order {
  return {
    id: row.id,
    companyId: row.tenant_id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerName: row.customer_id ? customersById.get(row.customer_id)?.name ?? "Customer" : "Walk-in Customer",
    conversationId: row.conversation_id,
    status: row.status,
    paymentStatus: row.payment_status,
    subtotal: money(row.subtotal),
    taxTotal: money(row.tax_total),
    total: money(row.total),
    createdAt: row.created_at,
  };
}

function mapConversation(row: DbConversation, customersById: Map<string, Customer>): Conversation {
  const customer = customersById.get(row.customer_id);
  return {
    id: row.id,
    companyId: row.tenant_id,
    customerId: row.customer_id,
    customerName: customer?.name ?? "Customer",
    customerPhone: customer?.phone ?? "",
    avatarUrl: customer?.avatarUrl,
    lastMessage: row.last_message === "[audio message]" ? "🎤 Voice message" : row.last_message ?? "",
    lastMessageAt: row.last_message_at ?? new Date(0).toISOString(),
    unreadCount: row.unread_count ?? 0,
    status: row.status,
  };
}

function mapMessageType(value: string | null | undefined): MessageType {
  if (value === "audio" || value === "unsupported") {
    return value;
  }

  return "text";
}

function mapAudio(row: DbMessage, messageId: string): MessageAudio | null {
  if (mapMessageType(row.message_type) !== "audio") {
    return null;
  }

  const duration = Number(row.media_duration_seconds);
  const fileSize = Number(row.media_file_size);
  const hasStorage = Boolean(row.media_storage_bucket && row.media_storage_path);

  return {
    mediaId: row.media_id ?? row.whatsapp_message_id,
    mimeType: row.media_mime_type ?? null,
    sha256: row.media_sha256 ?? null,
    isVoice: row.media_is_voice ?? false,
    durationSeconds: Number.isFinite(duration) ? duration : null,
    fileSize: Number.isFinite(fileSize) ? fileSize : null,
    fileName: row.media_file_name ?? null,
    storageBucket: row.media_storage_bucket ?? null,
    storagePath: row.media_storage_path ?? null,
    error: row.media_error ?? null,
    url: hasStorage ? `/api/messages/${messageId}/audio` : null,
  };
}

function mapMessage(row: DbMessage): Message {
  const messageType = row.body === "[audio message]" ? "audio" : mapMessageType(row.message_type);

  return {
    id: row.id,
    companyId: row.tenant_id,
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    messageType,
    direction: row.direction,
    body: messageType === "audio" && row.body === "[audio message]" ? "🎤 Voice message" : row.body,
    status: row.status,
    whatsappMessageId: row.whatsapp_message_id,
    audio: mapAudio(row, row.id),
    createdAt: row.created_at,
  };
}

function mapOrderItem(row: DbOrderItem, productImagesById = new Map<string, string | null>()): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id ?? "",
    productName: row.product_name,
    productImageUrl: row.product_id ? productImagesById.get(row.product_id) ?? "" : "",
    quantity: row.quantity,
    unitPrice: money(row.unit_price),
    lineTotal: money(row.line_total),
  };
}

async function fetchCategories(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id,tenant_id,name,icon")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .returns<DbCategory[]>();
  assertNoError(error, "product_categories select failed");
  return [
    { id: "cat-all", companyId: tenantId, name: "All Items", icon: "LayoutGrid" },
    ...(data ?? []).map(mapCategory),
  ];
}

async function fetchProducts(supabase: SupabaseClient, tenantId: string) {
  const [{ data: productRows, error: productsError }, { data: inventoryRows, error: inventoryError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id,tenant_id,category_id,name,sku,price,image_url,active")
        .eq("tenant_id", tenantId)
        .order("name")
        .returns<DbProduct[]>(),
      supabase
        .from("inventory")
        .select("product_id,quantity")
        .eq("tenant_id", tenantId)
        .returns<{ product_id: string; quantity: number }[]>(),
    ]);
  assertNoError(productsError, "products select failed");
  assertNoError(inventoryError, "inventory select failed");

  const stockByProductId = new Map<string, number>();
  for (const row of inventoryRows ?? []) {
    stockByProductId.set(row.product_id, (stockByProductId.get(row.product_id) ?? 0) + row.quantity);
  }
  return (productRows ?? []).map((row) => mapProduct(row, stockByProductId));
}

async function fetchCustomers(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id,tenant_id,name,phone,whatsapp_phone,avatar_url,notes,tags,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<DbCustomer[]>();
  assertNoError(error, "customers select failed");
  return (data ?? []).map(mapCustomer);
}

async function fetchOrders(supabase: SupabaseClient, tenantId: string, customersById = new Map<string, Customer>()) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,tenant_id,customer_id,conversation_id,order_number,status,payment_status,subtotal,tax_total,total,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<DbOrder[]>();
  assertNoError(error, "orders select failed");
  return (data ?? []).map((row) => mapOrder(row, customersById));
}

async function fetchConversations(supabase: SupabaseClient, tenantId: string, customersById: Map<string, Customer>) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,tenant_id,customer_id,status,last_message,last_message_at,unread_count")
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<DbConversation[]>();
  assertNoError(error, "conversations select failed");
  return (data ?? []).map((row) => mapConversation(row, customersById));
}

async function fetchMessages(supabase: SupabaseClient, tenantId: string, conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("tenant_id", tenantId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<DbMessage[]>();
  if (error && isMissingMessageMediaSchema(error)) {
    console.warn("[repository] Message media columns missing; falling back to legacy message select");
    const { data: legacyData, error: legacyError } = await supabase
      .from("messages")
      .select(LEGACY_MESSAGE_SELECT)
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .returns<DbMessage[]>();
    assertNoError(legacyError, "legacy messages select failed");
    return (legacyData ?? []).map(mapMessage);
  }

  assertNoError(error, "messages select failed");
  return (data ?? []).map(mapMessage);
}

async function fetchOrderItems(supabase: SupabaseClient, tenantId: string, orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("id,tenant_id,order_id,product_id,product_name,quantity,unit_price,line_total")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .returns<DbOrderItem[]>();

  if (error && isMissingOrderItemTenantSchema(error)) {
    console.warn("[repository] order_items.tenant_id unavailable; falling back to tenant-scoped order id lookup");
    const { data: legacyData, error: legacyError } = await supabase
      .from("order_items")
      .select("id,order_id,product_id,product_name,quantity,unit_price,line_total")
      .eq("order_id", orderId)
      .returns<DbOrderItem[]>();
    assertNoError(legacyError, "legacy order_items select failed");
    const productImagesById = await fetchProductImagesForOrderItems(supabase, tenantId, legacyData ?? []);
    return (legacyData ?? []).map((row) => mapOrderItem(row, productImagesById));
  }

  assertNoError(error, "order_items select failed");
  const productImagesById = await fetchProductImagesForOrderItems(supabase, tenantId, data ?? []);
  return (data ?? []).map((row) => mapOrderItem(row, productImagesById));
}

async function fetchOrderItemsForOrders(supabase: SupabaseClient, tenantId: string, orderIds: string[]) {
  if (!orderIds.length) {
    return new Map<string, OrderItem[]>();
  }

  const { data, error } = await supabase
    .from("order_items")
    .select("id,tenant_id,order_id,product_id,product_name,quantity,unit_price,line_total")
    .eq("tenant_id", tenantId)
    .in("order_id", orderIds)
    .returns<DbOrderItem[]>();

  if (error && isMissingOrderItemTenantSchema(error)) {
    console.warn("[repository] order_items.tenant_id unavailable; falling back to tenant-scoped order ids lookup");
    const { data: legacyData, error: legacyError } = await supabase
      .from("order_items")
      .select("id,order_id,product_id,product_name,quantity,unit_price,line_total")
      .in("order_id", orderIds)
      .returns<DbOrderItem[]>();
    assertNoError(legacyError, "legacy order_items preview select failed");

    const productImagesById = await fetchProductImagesForOrderItems(supabase, tenantId, legacyData ?? []);
    const legacyItemsByOrderId = new Map<string, OrderItem[]>();
    for (const item of (legacyData ?? []).map((row) => mapOrderItem(row, productImagesById))) {
      legacyItemsByOrderId.set(item.orderId, [...(legacyItemsByOrderId.get(item.orderId) ?? []), item]);
    }

    return legacyItemsByOrderId;
  }

  assertNoError(error, "order_items preview select failed");

  const productImagesById = await fetchProductImagesForOrderItems(supabase, tenantId, data ?? []);
  const itemsByOrderId = new Map<string, OrderItem[]>();
  for (const item of (data ?? []).map((row) => mapOrderItem(row, productImagesById))) {
    itemsByOrderId.set(item.orderId, [...(itemsByOrderId.get(item.orderId) ?? []), item]);
  }

  return itemsByOrderId;
}

async function fetchProductImagesForOrderItems(supabase: SupabaseClient, tenantId: string, items: DbOrderItem[]) {
  const productIds = Array.from(
    new Set(items.map((item) => item.product_id).filter((productId): productId is string => Boolean(productId))),
  );

  if (!productIds.length) {
    return new Map<string, string | null>();
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,image_url")
    .eq("tenant_id", tenantId)
    .in("id", productIds)
    .returns<DbProductImage[]>();
  assertNoError(error, "order item product image select failed");

  return new Map((data ?? []).map((product) => [product.id, product.image_url]));
}

export async function getCompanyContext() {
  const { tenant } = await getAuthenticatedTenantContext();
  return mapTenant(tenant);
}

export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const [products, customers, orderItemRows] = await Promise.all([
    fetchProducts(supabase, tenant.id),
    fetchCustomers(supabase, tenant.id),
    supabase
      .from("order_items")
      .select("product_id,quantity")
      .eq("tenant_id", tenant.id)
      .returns<{ product_id: string | null; quantity: number }[]>()
      .then(({ data, error }) => {
        assertNoError(error, "dashboard order_items select failed");
        return data ?? [];
      }),
  ]);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const [orders, conversations] = await Promise.all([
    fetchOrders(supabase, tenant.id, customersById),
    fetchConversations(supabase, tenant.id, customersById),
  ]);
  const salesByProductId = new Map<string, number>();
  for (const row of orderItemRows) {
    if (row.product_id) {
      salesByProductId.set(row.product_id, (salesByProductId.get(row.product_id) ?? 0) + row.quantity);
    }
  }
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const chart = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (4 - index) * 7);
    const revenue = paidOrders
      .filter((order) => new Date(order.createdAt) <= date)
      .reduce((sum, order) => sum + order.total, 0);
    return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue };
  });
  return {
    stats: {
      revenue: paidOrders.reduce((sum, order) => sum + order.total, 0),
      orders: orders.length,
      customers: customers.length,
      activeChats: conversations.filter((conversation) => conversation.status !== "closed").length,
    },
    chart,
    bestSellers: products
      .map((product) => ({ ...product, sales: salesByProductId.get(product.id) ?? 0 }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4),
    recentSales: orders.slice(0, 3),
    recentMessages: conversations.slice(0, 3),
  };
}

export async function getPOSData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const [categories, products, customers] = await Promise.all([
    fetchCategories(supabase, tenant.id),
    fetchProducts(supabase, tenant.id),
    fetchCustomers(supabase, tenant.id),
  ]);
  return { company: mapTenant(tenant), categories, products, customers };
}

export async function getInventoryOverviewData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const [categories, products] = await Promise.all([
    fetchCategories(supabase, tenant.id),
    fetchProducts(supabase, tenant.id),
  ]);
  const realCategories = categories.filter((category) => category.id !== "cat-all");

  return {
    company: mapTenant(tenant),
    categories: realCategories,
    products,
    stats: {
      totalProducts: products.length,
      activeProducts: products.filter((product) => product.active).length,
      outOfStock: products.filter((product) => product.stock <= 0).length,
      categories: realCategories.length,
    },
  };
}

export async function getInventoryProductsData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const [categories, products] = await Promise.all([
    fetchCategories(supabase, tenant.id),
    fetchProducts(supabase, tenant.id),
  ]);

  return {
    company: mapTenant(tenant),
    categories: categories.filter((category) => category.id !== "cat-all"),
    products,
  };
}

export async function getInventoryCategoriesData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const [categories, products] = await Promise.all([
    fetchCategories(supabase, tenant.id),
    fetchProducts(supabase, tenant.id),
  ]);
  const realCategories = categories.filter((category) => category.id !== "cat-all");

  return {
    company: mapTenant(tenant),
    categories: realCategories.map((category) => ({
      ...category,
      productCount: products.filter((product) => product.categoryId === category.id).length,
      products: products.filter((product) => product.categoryId === category.id),
    })),
    uncategorizedCount: products.filter((product) => !product.categoryId).length,
    uncategorizedProducts: products.filter((product) => !product.categoryId),
  };
}

export async function getNewProductData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const [{ data: branchRows, error: branchError }, categories] = await Promise.all([
    supabase
      .from("branches")
      .select("id,name")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("created_at")
      .returns<{ id: string; name: string }[]>(),
    fetchCategories(supabase, tenant.id),
  ]);
  assertNoError(branchError, "branches select failed");

  return {
    company: mapTenant(tenant),
    categories: categories.filter((category) => category.id !== "cat-all"),
    branches: branchRows ?? [],
    skuSeed: randomUUID().slice(0, 4).toUpperCase(),
  };
}

export async function getEditProductData(productId: string) {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const [{ data: productRow, error: productError }, categories, { data: inventoryRows, error: inventoryError }, { data: branchRows, error: branchError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id,tenant_id,category_id,name,sku,price,image_url,active")
        .eq("tenant_id", tenant.id)
        .eq("id", productId)
        .maybeSingle<DbProduct>(),
      fetchCategories(supabase, tenant.id),
      supabase
        .from("inventory")
        .select("product_id,quantity")
        .eq("tenant_id", tenant.id)
        .eq("product_id", productId)
        .returns<{ product_id: string; quantity: number }[]>(),
      supabase
        .from("branches")
        .select("id,name")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .order("created_at")
        .returns<{ id: string; name: string }[]>(),
    ]);

  assertNoError(productError, "product edit lookup failed");
  assertNoError(inventoryError, "product edit inventory lookup failed");
  assertNoError(branchError, "product edit branches lookup failed");

  if (!productRow) {
    return null;
  }

  const stockByProductId = new Map<string, number>();
  for (const row of inventoryRows ?? []) {
    stockByProductId.set(row.product_id, (stockByProductId.get(row.product_id) ?? 0) + row.quantity);
  }

  return {
    company: mapTenant(tenant),
    categories: categories.filter((category) => category.id !== "cat-all"),
    branches: branchRows ?? [],
    product: mapProduct(productRow, stockByProductId),
  };
}

export async function getInboxData(activeConversationId?: string) {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const customers = await fetchCustomers(supabase, tenant.id);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const conversations = await fetchConversations(supabase, tenant.id, customersById);
  const selectedConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null;
  const selectedCustomer = selectedConversation ? customersById.get(selectedConversation.customerId) ?? null : null;
  const [selectedMessages, orders] = await Promise.all([
    selectedConversation ? fetchMessages(supabase, tenant.id, selectedConversation.id) : Promise.resolve([]),
    selectedConversation ? fetchOrders(supabase, tenant.id, customersById) : Promise.resolve([]),
  ]);
  return {
    company: mapTenant(tenant),
    whatsappConnection: {
      phoneNumber: tenant.whatsappPhoneNumber,
      phoneNumberId: tenant.whatsappPhoneNumberId,
      isConnected: Boolean(tenant.whatsappPhoneNumber && tenant.whatsappPhoneNumberId),
    } satisfies WhatsAppConnection,
    conversations,
    selectedConversation,
    selectedCustomer,
    selectedMessages,
    recentOrders: selectedConversation
      ? orders.filter((order) => order.customerId === selectedConversation.customerId)
      : [],
  };
}

export async function markConversationRead(conversationId: string) {
  const { tenant } = await getAuthenticatedTenantContext();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({
      unread_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", tenant.id)
    .select("id,unread_count")
    .maybeSingle<{ id: string; unread_count: number }>();

  assertNoError(error, "conversation mark-read update failed");
  return data ? { conversationId: data.id, unreadCount: data.unread_count } : null;
}

export async function getMessageAudioStorage(messageId: string) {
  const { tenant } = await getAuthenticatedTenantContext();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id,tenant_id,message_type,media_mime_type,media_storage_bucket,media_storage_path,media_file_name")
    .eq("id", messageId)
    .eq("tenant_id", tenant.id)
    .eq("message_type", "audio")
    .maybeSingle<{
      id: string;
      tenant_id: string;
      message_type: string;
      media_mime_type: string | null;
      media_storage_bucket: string | null;
      media_storage_path: string | null;
      media_file_name: string | null;
    }>();

  if (error && isMissingMessageMediaSchema(error)) {
    return null;
  }

  assertNoError(error, "message audio lookup failed");

  if (!data?.media_storage_bucket || !data.media_storage_path) {
    return null;
  }

  return {
    bucket: data.media_storage_bucket,
    path: data.media_storage_path,
    mimeType: data.media_mime_type,
    fileName: data.media_file_name,
  };
}

export async function getUnreadInboxCount() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const { count, error } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .gt("unread_count", 0);

  assertNoError(error, "unread inbox count failed");
  return count ?? 0;
}

export async function getOrdersData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const customers = await fetchCustomers(supabase, tenant.id);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const orders = await fetchOrders(supabase, tenant.id, customersById);
  const itemsByOrderId = await fetchOrderItemsForOrders(
    supabase,
    tenant.id,
    orders.map((order) => order.id),
  );
  return {
    company: mapTenant(tenant),
    orders: orders.map((order) => ({ ...order, items: itemsByOrderId.get(order.id) ?? [] })),
    customers,
  };
}

export async function getOrderDetails(orderId: string) {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const customers = await fetchCustomers(supabase, tenant.id);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const { data, error } = await supabase
    .from("orders")
    .select("id,tenant_id,customer_id,conversation_id,order_number,status,payment_status,subtotal,tax_total,total,created_at")
    .eq("tenant_id", tenant.id)
    .or(`id.eq.${orderId},order_number.eq.${orderId}`)
    .maybeSingle<DbOrder>();
  assertNoError(error, "order details select failed");
  const order = data ? mapOrder(data, customersById) : undefined;
  const conversations = order ? await fetchConversations(supabase, tenant.id, customersById) : [];
  return {
    company: mapTenant(tenant),
    order,
    items: order ? await fetchOrderItems(supabase, tenant.id, order.id) : [],
    customer: order?.customerId ? customersById.get(order.customerId) ?? null : null,
    conversation: order?.conversationId
      ? conversations.find((item) => item.id === order.conversationId) ?? null
      : null,
  };
}

export async function getCustomersData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const customers = await fetchCustomers(supabase, tenant.id);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const [orders, conversations] = await Promise.all([
    fetchOrders(supabase, tenant.id, customersById),
    fetchConversations(supabase, tenant.id, customersById),
  ]);
  return { company: mapTenant(tenant), customers, orders, conversations };
}

export async function getCustomerDetails(customerId: string) {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const customers = await fetchCustomers(supabase, tenant.id);
  const customer = customers.find((item) => item.id === customerId);
  const customersById = new Map(customers.map((item) => [item.id, item]));
  const [orders, conversations] = await Promise.all([
    fetchOrders(supabase, tenant.id, customersById),
    fetchConversations(supabase, tenant.id, customersById),
  ]);
  return {
    company: mapTenant(tenant),
    customer,
    orders: orders.filter((item) => item.customerId === customerId),
    conversations: conversations.filter((item) => item.customerId === customerId),
  };
}
