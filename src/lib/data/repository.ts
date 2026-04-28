import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  categories as fallbackCategories,
  company as fallbackCompany,
  conversations as fallbackConversations,
  customers as fallbackCustomers,
  dashboardData as fallbackDashboardData,
  messages as fallbackMessages,
  orderItems as fallbackOrderItems,
  orders as fallbackOrders,
  products as fallbackProducts,
} from "@/lib/data/mock-data";
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
} from "@/lib/types/domain";

const SEEDED_COMPANY_ID = process.env.NEXT_PUBLIC_SEEDED_COMPANY_ID ?? fallbackCompany.id;

type DbCompany = {
  id: string;
  name: string;
  currency: string | null;
  tax_rate: number | string | null;
};

type DbCategory = {
  id: string;
  company_id: string;
  name: string;
  icon: string | null;
};

type DbProduct = {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  sku: string;
  price: number | string;
  image_url: string | null;
  active: boolean;
};

type DbCustomer = {
  id: string;
  company_id: string;
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
  company_id: string;
  customer_id: string;
  status: "open" | "pending" | "closed";
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
};

type DbMessage = {
  id: string;
  company_id: string;
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
  company_id: string;
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

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

function getSupabase(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[repository] Supabase env vars missing. Using mock fallback data.");
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeSupabaseUrl(value?: string) {
  if (!value) {
    return value;
  }

  const url = new URL(value);
  if (url.pathname !== "/" && url.pathname !== "") {
    console.warn(`[repository] NEXT_PUBLIC_SUPABASE_URL should be the project base URL. Using ${url.origin}.`);
  }

  return url.origin;
}

async function withSupabase<T>(operation: string, query: (supabase: SupabaseClient) => Promise<T>, fallback: T) {
  if (!hasSupabaseEnv()) {
    return fallback;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return fallback;
  }

  try {
    return await query(supabase);
  } catch (error) {
    console.error(`[repository] Supabase query failed in ${operation}. Using mock fallback.`, error);
    return fallback;
  }
}

function assertNoError(error: unknown, context: string) {
  if (error) {
    throw new Error(`${context}: ${JSON.stringify(error)}`);
  }
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function mapCompany(row: DbCompany): Company {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency ?? "USD",
    taxRate: money(row.tax_rate),
  };
}

function mapCategory(row: DbCategory): Category {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    icon: row.icon ?? "LayoutGrid",
  };
}

function mapCustomer(row: DbCustomer): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
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
    companyId: row.company_id,
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
    companyId: row.company_id,
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
    companyId: row.company_id,
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
    companyId: row.company_id,
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

async function fetchCompany(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,currency,tax_rate")
    .eq("id", SEEDED_COMPANY_ID)
    .single<DbCompany>();
  assertNoError(error, "companies select failed");
  if (!data) {
    throw new Error(`Company ${SEEDED_COMPANY_ID} was not found`);
  }
  return mapCompany(data);
}

async function fetchCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id,company_id,name,icon")
    .eq("company_id", SEEDED_COMPANY_ID)
    .order("sort_order", { ascending: true })
    .returns<DbCategory[]>();
  assertNoError(error, "product_categories select failed");
  return [
    { id: "cat-all", companyId: SEEDED_COMPANY_ID, name: "All Items", icon: "LayoutGrid" },
    ...(data ?? []).map(mapCategory),
  ];
}

async function fetchProducts(supabase: SupabaseClient) {
  const [{ data: productRows, error: productsError }, { data: inventoryRows, error: inventoryError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id,company_id,category_id,name,sku,price,image_url,active")
        .eq("company_id", SEEDED_COMPANY_ID)
        .eq("active", true)
        .order("name")
        .returns<DbProduct[]>(),
      supabase
        .from("inventory")
        .select("product_id,quantity")
        .eq("company_id", SEEDED_COMPANY_ID)
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

async function fetchCustomers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("customers")
    .select("id,company_id,name,phone,whatsapp_phone,avatar_url,notes,tags,created_at")
    .eq("company_id", SEEDED_COMPANY_ID)
    .order("created_at", { ascending: false })
    .returns<DbCustomer[]>();
  assertNoError(error, "customers select failed");
  return (data ?? []).map(mapCustomer);
}

async function fetchOrders(supabase: SupabaseClient, customersById = new Map<string, Customer>()) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,company_id,customer_id,conversation_id,order_number,status,payment_status,subtotal,tax_total,total,created_at")
    .eq("company_id", SEEDED_COMPANY_ID)
    .order("created_at", { ascending: false })
    .returns<DbOrder[]>();
  assertNoError(error, "orders select failed");
  return (data ?? []).map((row) => mapOrder(row, customersById));
}

async function fetchConversations(supabase: SupabaseClient, customersById: Map<string, Customer>) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,company_id,customer_id,status,last_message,last_message_at,unread_count")
    .eq("company_id", SEEDED_COMPANY_ID)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<DbConversation[]>();
  assertNoError(error, "conversations select failed");
  return (data ?? []).map((row) => mapConversation(row, customersById));
}

async function fetchMessages(supabase: SupabaseClient, conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,company_id,conversation_id,customer_id,direction,body,status,whatsapp_message_id,created_at")
    .eq("company_id", SEEDED_COMPANY_ID)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<DbMessage[]>();
  assertNoError(error, "messages select failed");
  return (data ?? []).map(mapMessage);
}

async function fetchOrderItems(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("id,order_id,product_id,product_name,quantity,unit_price,line_total")
    .eq("company_id", SEEDED_COMPANY_ID)
    .eq("order_id", orderId)
    .returns<DbOrderItem[]>();
  assertNoError(error, "order_items select failed");
  return (data ?? []).map(mapOrderItem);
}

export async function getCompanyContext() {
  return withSupabase("getCompanyContext", fetchCompany, fallbackCompany);
}

export async function getDashboardData() {
  return withSupabase<DashboardData>("getDashboardData", async (supabase) => {
    const [products, customers] = await Promise.all([
      fetchProducts(supabase),
      fetchCustomers(supabase),
    ]);
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const [orders, conversations] = await Promise.all([
      fetchOrders(supabase, customersById),
      fetchConversations(supabase, customersById),
    ]);

    const { data: orderItemRows, error: orderItemsError } = await supabase
      .from("order_items")
      .select("product_id,quantity")
      .eq("company_id", SEEDED_COMPANY_ID)
      .returns<{ product_id: string | null; quantity: number }[]>();
    assertNoError(orderItemsError, "dashboard order_items select failed");

    const salesByProductId = new Map<string, number>();
    for (const row of orderItemRows ?? []) {
      if (row.product_id) {
        salesByProductId.set(row.product_id, (salesByProductId.get(row.product_id) ?? 0) + row.quantity);
      }
    }

    const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
    const chart = Array.from({ length: 5 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (4 - index) * 7);
      const dayTotal = paidOrders
        .filter((order) => new Date(order.createdAt) <= date)
        .reduce((sum, order) => sum + order.total, 0);
      return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: dayTotal };
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
  }, fallbackDashboardData);
}

export async function getPOSData() {
  return withSupabase("getPOSData", async (supabase) => {
    const [company, categories, products, customers] = await Promise.all([
      fetchCompany(supabase),
      fetchCategories(supabase),
      fetchProducts(supabase),
      fetchCustomers(supabase),
    ]);
    return { company, categories, products, customers };
  }, { company: fallbackCompany, categories: fallbackCategories, products: fallbackProducts, customers: fallbackCustomers });
}

export async function getInboxData(activeConversationId?: string) {
  return withSupabase("getInboxData", async (supabase) => {
    const [company, customers] = await Promise.all([fetchCompany(supabase), fetchCustomers(supabase)]);
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const conversations = await fetchConversations(supabase, customersById);
    const selectedConversation =
      conversations.find((conversation) => conversation.id === activeConversationId) ??
      conversations[0] ??
      null;
    const selectedCustomer = selectedConversation ? customersById.get(selectedConversation.customerId) ?? null : null;
    const selectedMessages = selectedConversation ? await fetchMessages(supabase, selectedConversation.id) : [];
    const orders = selectedConversation ? await fetchOrders(supabase, customersById) : [];

    return {
      company,
      conversations,
      selectedConversation,
      selectedCustomer,
      selectedMessages,
      recentOrders: selectedConversation
        ? orders.filter((order) => order.customerId === selectedConversation.customerId)
        : [],
    };
  }, {
    company: fallbackCompany,
    conversations: fallbackConversations,
    selectedConversation: fallbackConversations[0],
    selectedCustomer: fallbackCustomers[0],
    selectedMessages: fallbackMessages.filter((message) => message.conversationId === fallbackConversations[0]?.id),
    recentOrders: fallbackOrders.filter((order) => order.customerId === fallbackConversations[0]?.customerId),
  });
}

export async function getOrdersData() {
  return withSupabase("getOrdersData", async (supabase) => {
    const [company, customers] = await Promise.all([fetchCompany(supabase), fetchCustomers(supabase)]);
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const orders = await fetchOrders(supabase, customersById);
    return { company, orders, customers };
  }, { company: fallbackCompany, orders: fallbackOrders, customers: fallbackCustomers });
}

export async function getOrderDetails(orderId: string) {
  return withSupabase("getOrderDetails", async (supabase) => {
    const [company, customers] = await Promise.all([fetchCompany(supabase), fetchCustomers(supabase)]);
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const { data, error } = await supabase
      .from("orders")
      .select("id,company_id,customer_id,conversation_id,order_number,status,payment_status,subtotal,tax_total,total,created_at")
      .eq("company_id", SEEDED_COMPANY_ID)
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle<DbOrder>();
    assertNoError(error, "order details select failed");

    const order = data ? mapOrder(data, customersById) : undefined;
    const conversations = order ? await fetchConversations(supabase, customersById) : [];
    return {
      company,
      order,
      items: order ? await fetchOrderItems(supabase, order.id) : [],
      customer: order?.customerId ? customersById.get(order.customerId) ?? null : null,
      conversation: order?.conversationId ? conversations.find((item) => item.id === order.conversationId) ?? null : null,
    };
  }, {
    company: fallbackCompany,
    order: fallbackOrders.find((item) => item.id === orderId || item.orderNumber === orderId),
    items: fallbackOrderItems.filter((item) => item.orderId === orderId),
    customer: fallbackCustomers.find((item) => fallbackOrders.find((order) => order.id === orderId)?.customerId === item.id) ?? null,
    conversation: fallbackConversations.find((item) => fallbackOrders.find((order) => order.id === orderId)?.conversationId === item.id) ?? null,
  });
}

export async function getCustomersData() {
  return withSupabase("getCustomersData", async (supabase) => {
    const [company, customers] = await Promise.all([fetchCompany(supabase), fetchCustomers(supabase)]);
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const [orders, conversations] = await Promise.all([
      fetchOrders(supabase, customersById),
      fetchConversations(supabase, customersById),
    ]);
    return { company, customers, orders, conversations };
  }, { company: fallbackCompany, customers: fallbackCustomers, orders: fallbackOrders, conversations: fallbackConversations });
}

export async function getCustomerDetails(customerId: string) {
  return withSupabase("getCustomerDetails", async (supabase) => {
    const [company, customers] = await Promise.all([fetchCompany(supabase), fetchCustomers(supabase)]);
    const customer = customers.find((item) => item.id === customerId);
    const customersById = new Map(customers.map((item) => [item.id, item]));
    const [orders, conversations] = await Promise.all([
      fetchOrders(supabase, customersById),
      fetchConversations(supabase, customersById),
    ]);

    return {
      company,
      customer,
      orders: orders.filter((item) => item.customerId === customerId),
      conversations: conversations.filter((item) => item.customerId === customerId),
    };
  }, {
    company: fallbackCompany,
    customer: fallbackCustomers.find((item) => item.id === customerId),
    orders: fallbackOrders.filter((item) => item.customerId === customerId),
    conversations: fallbackConversations.filter((item) => item.customerId === customerId),
  });
}
