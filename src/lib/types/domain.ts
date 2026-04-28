export type Role = "owner" | "admin" | "manager" | "cashier" | "support";
export type OrderStatus = "draft" | "processing" | "completed" | "cancelled" | "delivered";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "read" | "failed" | "received";

export type Company = {
  id: string;
  name: string;
  currency: string;
  taxRate: number;
};

export type Category = {
  id: string;
  companyId: string;
  name: string;
  icon: string;
};

export type Product = {
  id: string;
  companyId: string;
  categoryId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl: string;
  active: boolean;
};

export type Customer = {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  whatsappPhone: string;
  avatarUrl?: string | null;
  notes: string;
  tags: string[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  avatarUrl?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "open" | "pending" | "closed";
};

export type Message = {
  id: string;
  companyId: string;
  conversationId: string;
  customerId: string;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  whatsappMessageId?: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  companyId: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  conversationId?: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Payment = {
  id: string;
  orderId: string;
  method: "cash" | "card" | "bank_transfer" | "other";
  amount: number;
  status: PaymentStatus;
  createdAt: string;
};

export type DashboardData = {
  stats: {
    revenue: number;
    orders: number;
    customers: number;
    activeChats: number;
  };
  chart: { label: string; revenue: number }[];
  bestSellers: (Product & { sales: number })[];
  recentSales: Order[];
  recentMessages: Conversation[];
};
