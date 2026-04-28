"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreVertical, Paperclip, Phone, Send, ShoppingCart, Smile, Video } from "lucide-react";
import type { Company, Conversation, Customer, Message, Order } from "@/lib/types/domain";
import { useInboxStore } from "@/lib/stores/inbox-store";
import { useRealtimeMessages } from "@/lib/supabase/realtime";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatSendError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Message could not be sent.";
  }

  const record = payload as { error?: unknown; details?: unknown };
  const error = typeof record.error === "string" ? record.error : "Message could not be sent.";

  if (typeof record.details === "string" && record.details.length > 0) {
    return `${error} ${record.details}`;
  }

  if (record.details && typeof record.details === "object") {
    return `${error} ${JSON.stringify(record.details)}`;
  }

  return error;
}

export function InboxWorkspace({
  company,
  conversations,
  selectedConversation,
  selectedCustomer,
  selectedMessages,
  recentOrders,
}: {
  company: Company;
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedCustomer?: Customer | null;
  selectedMessages: Message[];
  recentOrders: Order[];
}) {
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(selectedCustomer ?? null);
  const [activeRecentOrders, setActiveRecentOrders] = useState<Order[]>(recentOrders);
  const {
    activeConversationId,
    conversations: storeConversations,
    setInitialState,
    setActiveConversation,
    appendMessage,
    messages,
  } = useInboxStore();

  useEffect(() => {
    setInitialState(conversations, selectedMessages, selectedConversation?.id ?? conversations[0]?.id ?? "");
  }, [conversations, selectedConversation?.id, selectedMessages, setInitialState]);

  useRealtimeMessages(company.id, appendMessage);

  const visibleConversations = storeConversations.length ? storeConversations : conversations;
  const activeConversation = visibleConversations.find((item) => item.id === activeConversationId) ?? selectedConversation ?? null;
  const activeMessages = activeConversation
    ? messages.filter((message) => message.conversationId === activeConversation.id)
    : [];
  useEffect(() => {
    let cancelled = false;

    async function syncInbox() {
      const search = activeConversationId ? `?activeConversationId=${encodeURIComponent(activeConversationId)}` : "";
      const response = await fetch(`/api/inbox${search}`, { cache: "no-store" });

      if (!response.ok || cancelled) {
        return;
      }

      const payload = await response.json() as {
        conversations: Conversation[];
        selectedConversation: Conversation | null;
        selectedCustomer?: Customer | null;
        selectedMessages: Message[];
        recentOrders: Order[];
      };

      if (cancelled) {
        return;
      }

      setInitialState(
        payload.conversations,
        payload.selectedMessages,
        payload.selectedConversation?.id ?? activeConversationId ?? payload.conversations[0]?.id ?? "",
      );
      setActiveCustomer(payload.selectedCustomer ?? null);
      setActiveRecentOrders(payload.recentOrders ?? []);
    }

    void syncInbox();
    const intervalId = window.setInterval(() => {
      void syncInbox();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeConversationId, setInitialState]);

  const customer = activeCustomer;

  const totals = useMemo(() => {
    const paidOrders = activeRecentOrders.filter((order) => order.paymentStatus === "paid");
    return {
      spent: paidOrders.reduce((sum, order) => sum + order.total, 0),
      orders: activeRecentOrders.length,
    };
  }, [activeRecentOrders]);

  async function sendMessage() {
    if (!draft.trim() || !activeConversation || isSending) return;
    const body = draft.trim();
    setSendError(null);
    setIsSending(true);
    console.info("[inbox] Sending message", { conversationId: activeConversation.id });
    setDraft("");

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversation.id, body }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.warn("[inbox] Send message failed", {
          status: response.status,
          payload,
        });
        setDraft(body);
        setSendError(formatSendError(payload));
        return;
      }

      if (payload?.message) {
        appendMessage(payload.message);
      }
    } catch (error) {
      console.error("[inbox] Send message request failed", error);
      setDraft(body);
      setSendError("Message request failed. Check the console and server logs.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-67px)] bg-white xl:grid-cols-[405px_minmax(0,1fr)_320px]">
      <aside className="border-r border-slate-200 bg-white">
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <h2 className="text-xl font-semibold">Messages</h2>
          <Button variant="ghost" size="icon" aria-label="Compose"><Send className="h-5 w-5 rotate-[-35deg] text-emerald-700" /></Button>
        </div>
        <div className="p-4"><Input icon placeholder="Search conversations..." /></div>
        <div>
          {visibleConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setActiveConversation(conversation.id)}
              className={`relative flex w-full items-center gap-4 border-b border-slate-100 p-5 text-left transition hover:bg-emerald-50 ${
                conversation.id === activeConversation?.id ? "bg-emerald-50" : ""
              }`}
            >
              {conversation.id === activeConversation?.id ? <span className="absolute right-0 h-full w-1 bg-emerald-700" /> : null}
              <Avatar name={conversation.customerName} src={conversation.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate font-semibold">{conversation.customerName}</div>
                  <div className="text-xs font-semibold text-slate-400">
                    {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="mt-1 truncate text-slate-600">{conversation.lastMessage}</div>
              </div>
              {conversation.unreadCount ? <Badge tone="green">{conversation.unreadCount}</Badge> : null}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col bg-[linear-gradient(130deg,#b5b09e_0%,#c8eadf_52%,#f0eadb_100%)]">
        <div className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">
          {activeConversation ? (
            <div className="flex items-center gap-4">
              <Avatar name={activeConversation.customerName} src={activeConversation.avatarUrl} />
              <div>
                <div className="text-lg font-semibold">{activeConversation.customerName}</div>
                <div className="text-sm text-emerald-700">Online</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-semibold">No conversations</div>
              <div className="text-sm text-slate-500">Incoming WhatsApp messages will appear here.</div>
            </div>
          )}
          <div className="flex items-center gap-3 text-slate-600">
            <Phone className="h-5 w-5" />
            <Video className="h-5 w-5" />
            <div className="h-8 w-px bg-slate-200" />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="mx-auto w-fit rounded-lg bg-white px-5 py-2 text-xs font-black uppercase text-slate-600 shadow-sm">Today</div>
          {activeConversation ? activeMessages.map((message) => (
            <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-xl p-4 shadow-sm ${
                  message.direction === "outbound" ? "bg-[#d9ffd2]" : "bg-white"
                }`}
              >
                <p className="leading-7">{message.body}</p>
                <div className="mt-2 text-right text-xs text-slate-400">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {message.direction === "outbound" ? " ✓✓" : ""}
                </div>
              </div>
            </div>
          )) : (
            <div className="mx-auto mt-20 max-w-sm rounded-xl bg-white/80 p-6 text-center text-slate-600 shadow-sm">
              Connect WhatsApp and receive a customer message to start a conversation.
            </div>
          )}
        </div>

        <div className="bg-white/90 p-5">
          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200">
            <Smile className="h-6 w-6 text-slate-500" />
            <Paperclip className="h-6 w-6 text-slate-500" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) void sendMessage();
              }}
              placeholder="Type a message"
              disabled={!activeConversation || isSending}
              className="h-10 flex-1 bg-transparent px-3 outline-none"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!draft.trim() || !activeConversation || isSending}
              aria-label="Send message"
            >
              {isSending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          {sendError ? (
            <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {sendError}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="border-l border-slate-200 bg-white p-7">
        {customer ? (
          <div className="text-center">
            <Avatar name={customer.name} src={customer.avatarUrl} className="mx-auto h-24 w-24 shadow-xl" />
            <h2 className="mt-5 text-xl font-semibold">{customer.name}</h2>
            <p className="mt-2 text-slate-600">{customer.phone}</p>
            <Badge tone="green" className="mt-4 uppercase">{customer.tags[0] ?? "customer"}</Badge>
          </div>
        ) : null}
        <div className="mt-10">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Status</div>
          <p className="mt-4 leading-7">{customer?.notes}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#eef2ff] p-5">
            <div className="text-xs font-black uppercase text-slate-500">Total Spent</div>
            <div className="mt-2 text-lg font-black">{formatCurrency(totals.spent)}</div>
          </div>
          <div className="rounded-xl bg-[#eef2ff] p-5">
            <div className="text-xs font-black uppercase text-slate-500">Total Orders</div>
            <div className="mt-2 text-lg font-black">{totals.orders}</div>
          </div>
        </div>
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Recent Orders</div>
            <button className="text-sm font-bold text-emerald-700">View All</button>
          </div>
          <div className="space-y-3">
            {activeRecentOrders.slice(0, 2).map((order) => (
              <div key={order.id} className="rounded-xl p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">#{order.orderNumber}</div>
                  <Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.status}</Badge>
                </div>
                <div className="mt-3 flex justify-between text-sm text-slate-500">
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="font-black text-emerald-700">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button className="mt-10 h-16 w-full bg-emerald-700 text-lg hover:bg-emerald-800">
          <ShoppingCart className="h-6 w-6" /> Create New Order
        </Button>
      </aside>
    </div>
  );
}
