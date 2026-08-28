import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTenantContext as getAuthenticatedTenantContext, type Tenant } from "@/lib/tenant-context";
import type {
  Category,
  Company,
  Conversation,
  Customer,
  DashboardData,
  Message,
  Order,
  OrderItem,
  Product,
  WhatsAppConnection,
} from "@/lib/types/domain";

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
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id: string | null;
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
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

function assertNoError(error: unknown, context: string) {
  if (error) throw new Error(`${context}: ${JSON.stringify(error)}`);
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
    imageUrl: row.image_url ?? "/window.svg",
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
    lastMessage: row.last_message ?? "",
    lastMessageAt: row.last_message_at ?? new Date(0).toISOString(),
    unreadCount: row.unread_count ?? 0,
    status: row.status,
  };
}

function mapMessage(row: DbMessage): Message {
  return {
    id: row.id,
    companyId: row.tenant_id,
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    direction: row.direction,
    body: row.body,
    status: row.status,
    whatsappMessageId: row.whatsapp_message_id,
    createdAt: row.created_at,
  };
}

function mapOrderItem(row: DbOrderItem): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id ?? "",
    productName: row.product_name,
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
        .eq("active", true)
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
    .select("id,tenant_id,conversation_id,customer_id,direction,body,status,whatsapp_message_id,created_at")
    .eq("tenant_id", tenantId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<DbMessage[]>();
  assertNoError(error, "messages select failed");
  return (data ?? []).map(mapMessage);
}

async function fetchOrderItems(supabase: SupabaseClient, tenantId: string, orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("id,order_id,product_id,product_name,quantity,unit_price,line_total")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .returns<DbOrderItem[]>();
  assertNoError(error, "order_items select failed");
  return (data ?? []).map(mapOrderItem);
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

export async function getOrdersData() {
  const { supabase, tenant } = await getAuthenticatedTenantContext();
  const customers = await fetchCustomers(supabase, tenant.id);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const orders = await fetchOrders(supabase, tenant.id, customersById);
  return { company: mapTenant(tenant), orders, customers };
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
