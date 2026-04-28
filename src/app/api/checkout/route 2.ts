import { NextResponse } from "next/server";
import { z } from "zod";
import { company, customers, products } from "@/lib/data/mock-data";

const checkoutSchema = z.object({
  companyId: z.string(),
  customerId: z.string().nullable(),
  paymentMethod: z.enum(["cash", "card"]),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
});

export async function POST(request: Request) {
  const input = checkoutSchema.parse(await request.json());

  if (input.companyId !== company.id) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const subtotal = input.items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }
    return sum + product.price * item.quantity;
  }, 0);
  const taxTotal = subtotal * company.taxRate;
  const customer = input.customerId ? customers.find((item) => item.id === input.customerId) : null;

  // Production path:
  // 1. Open a serializable DB transaction/RPC.
  // 2. Insert order and order_items.
  // 3. Insert payment.
  // 4. Decrement inventory with stock checks.
  // 5. Optionally enqueue a WhatsApp receipt message.
  return NextResponse.json({
    order: {
      id: crypto.randomUUID(),
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      companyId: input.companyId,
      customerId: input.customerId,
      customerName: customer?.name ?? "Walk-in Customer",
      paymentMethod: input.paymentMethod,
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      status: "completed",
      paymentStatus: "paid",
    },
  });
}
