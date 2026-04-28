import "server-only";
import {
  categories,
  company,
  conversations,
  customers,
  dashboardData,
  messages,
  orderItems,
  orders,
  products,
} from "@/lib/data/mock-data";

export async function getCompanyContext() {
  return company;
}

export async function getDashboardData() {
  return dashboardData;
}

export async function getPOSData() {
  return { company, categories, products, customers };
}

export async function getInboxData() {
  const selectedConversation = conversations[0];
  const selectedCustomer = customers.find((customer) => customer.id === selectedConversation.customerId);
  const selectedMessages = messages.filter((message) => message.conversationId === selectedConversation.id);
  const recentOrders = orders.filter((order) => order.customerId === selectedConversation.customerId);

  return {
    company,
    conversations,
    selectedConversation,
    selectedCustomer,
    selectedMessages,
    recentOrders,
  };
}

export async function getOrdersData() {
  return { company, orders, customers };
}

export async function getOrderDetails(orderId: string) {
  const order = orders.find((item) => item.id === orderId || item.orderNumber === orderId);
  return {
    company,
    order,
    items: order ? orderItems.filter((item) => item.orderId === order.id) : [],
    customer: order?.customerId ? customers.find((item) => item.id === order.customerId) : null,
    conversation: order?.conversationId ? conversations.find((item) => item.id === order.conversationId) : null,
  };
}

export async function getCustomersData() {
  return { company, customers, orders, conversations };
}

export async function getCustomerDetails(customerId: string) {
  const customer = customers.find((item) => item.id === customerId);
  return {
    company,
    customer,
    orders: orders.filter((item) => item.customerId === customerId),
    conversations: conversations.filter((item) => item.customerId === customerId),
  };
}
