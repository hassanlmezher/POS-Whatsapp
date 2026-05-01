"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Paperclip, Phone, Send, ShoppingCart, Smile, Video } from "lucide-react";
import type { Company, Conversation, Customer, Message, Order } from "@/lib/types/domain";
import { useInboxStore } from "@/lib/stores/inbox-store";
import { useRealtimeMessages } from "@/lib/supabase/realtime";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INBOX_SYNC_INTERVAL_MS = 1000;

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
  const syncInFlightRef = useRef(false);
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
    let timeoutId: number | null = null;

    async function syncInbox() {
      if (cancelled || syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;

      try {
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
      } finally {
        syncInFlightRef.current = false;
      }
    }

    function scheduleSync(delayMs: number) {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void syncInbox().finally(() => {
          scheduleSync(INBOX_SYNC_INTERVAL_MS);
        });
      }, delayMs);
    }

    function handleVisibilitySync() {
      if (document.visibilityState === "visible") {
        void syncInbox();
      }
    }

    void syncInbox();
    scheduleSync(INBOX_SYNC_INTERVAL_MS);
    window.addEventListener("focus", handleVisibilitySync);
    document.addEventListener("visibilitychange", handleVisibilitySync);

    return () => {
      cancelled = true;
      syncInFlightRef.current = false;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("focus", handleVisibilitySync);
      document.removeEventListener("visibilitychange", handleVisibilitySync);
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
    <div className="grid min-h-[calc(100vh-98px)] bg-[#f7f6ff] xl:grid-cols-[405px_minmax(0,1fr)_320px]">
      <aside className="border-r border-[#d9deea] bg-white">
        <div className="flex h-20 items-center justify-between border-b border-[#d9deea] px-6">
          <h2 className="text-xl font-semibold text-[#080c1a]">Messages</h2>
          <Button variant="ghost" size="icon" aria-label="Compose"><Send className="h-5 w-5 rotate-[-35deg] text-[#0b4edb]" /></Button>
        </div>
        <div className="p-4"><Input icon placeholder="Search conversations..." /></div>
        <div>
          {visibleConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setActiveConversation(conversation.id)}
              className={`relative flex w-full items-center gap-4 border-b border-[#d9deea] p-5 text-left transition hover:bg-[#f5f7fb] ${
                conversation.id === activeConversation?.id ? "bg-[#eef2f7]" : ""
              }`}
            >
              {conversation.id === activeConversation?.id ? <span className="absolute right-0 h-full w-1 bg-slate-200" /> : null}
              <Avatar name={conversation.customerName} src={conversation.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate font-semibold text-[#080c1a]">{conversation.customerName}</div>
                  <div className="text-xs font-semibold text-[#8090aa]">
                    {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="mt-1 truncate text-[#536884]">{conversation.lastMessage}</div>
              </div>
              {conversation.unreadCount ? <Badge tone="green">{conversation.unreadCount}</Badge> : null}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col bg-[#f7f6ff]">
        <div className="flex h-20 items-center justify-between border-b border-[#d9deea] bg-white px-6 backdrop-blur">
          {activeConversation ? (
            <div className="flex items-center gap-4">
              <Avatar name={activeConversation.customerName} src={activeConversation.avatarUrl} />
              <div>
                <div className="text-lg font-semibold text-[#080c1a]">{activeConversation.customerName}</div>
                <div className="text-sm text-[#0b4edb]">Online</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-semibold text-[#080c1a]">No conversations</div>
              <div className="text-sm text-[#8090aa]">Incoming WhatsApp messages will appear here.</div>
            </div>
          )}
          <div className="flex items-center gap-3 text-[#536884]">
            <Phone className="h-5 w-5" />
            <Video className="h-5 w-5" />
            <div className="h-8 w-px bg-[#d9deea]" />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="mx-auto w-fit rounded-lg bg-[#eef2f7] px-5 py-2 text-xs font-black uppercase text-[#536884] shadow-sm ring-1 ring-[#d9deea]">Today</div>
          {activeConversation ? activeMessages.map((message) => (
            <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-xl p-4 shadow-sm ${
                  message.direction === "outbound" ? "bg-[#2f66ea] text-white" : "bg-white text-[#080c1a] ring-1 ring-[#d9deea]"
                }`}
              >
                <p className="leading-7">{message.body}</p>
                <div className={`mt-2 text-right text-xs ${message.direction === "outbound" ? "text-blue-100" : "text-[#8090aa]"}`}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {message.direction === "outbound" ? " ✓✓" : ""}
                </div>
              </div>
            </div>
          )) : (
            <div className="mx-auto mt-20 max-w-sm rounded-xl bg-[#f7f9fc] p-6 text-center text-[#536884] shadow-sm ring-1 ring-[#d9deea]">
              Connect WhatsApp and receive a customer message to start a conversation.
            </div>
          )}
        </div>

        <div className="bg-white p-5 backdrop-blur">
          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-lg ring-1 ring-[#d9deea]">
            <Smile className="h-6 w-6 text-[#536884]" />
            <Paperclip className="h-6 w-6 text-[#536884]" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) void sendMessage();
              }}
              placeholder="Type a message"
              disabled={!activeConversation || isSending}
              className="h-10 flex-1 bg-transparent px-3 text-[#080c1a] outline-none placeholder:text-[#8090aa]"
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
            <div className="mt-3 rounded-xl bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c] ring-1 ring-[#fecdd3]">
              {sendError}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="border-l border-[#d9deea] bg-white p-7">
        {customer ? (
          <div className="text-center">
            <Avatar name={customer.name} src={customer.avatarUrl} className="mx-auto h-24 w-24 shadow-xl" />
            <h2 className="mt-5 text-xl font-semibold text-[#080c1a]">{customer.name}</h2>
            <p className="mt-2 text-[#536884]">{customer.phone}</p>
            <Badge tone="green" className="mt-4 uppercase">{customer.tags[0] ?? "customer"}</Badge>
          </div>
        ) : null}
        <div className="mt-10">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-[#8090aa]">Status</div>
          <p className="mt-4 leading-7 text-[#536884]">{customer?.notes}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#f7f9fc] p-5 ring-1 ring-[#d9deea]">
            <div className="text-xs font-black uppercase text-[#8090aa]">Total Spent</div>
            <div className="mt-2 text-lg font-black text-[#080c1a]">{formatCurrency(totals.spent)}</div>
          </div>
          <div className="rounded-xl bg-[#f7f9fc] p-5 ring-1 ring-[#d9deea]">
            <div className="text-xs font-black uppercase text-[#8090aa]">Total Orders</div>
            <div className="mt-2 text-lg font-black text-[#080c1a]">{totals.orders}</div>
          </div>
        </div>
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[#8090aa]">Recent Orders</div>
            <button className="text-sm font-bold text-[#0b4edb]">View All</button>
          </div>
          <div className="space-y-3">
            {activeRecentOrders.slice(0, 2).map((order) => (
              <div key={order.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#d9deea]">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#080c1a]">#{order.orderNumber}</div>
                  <Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.status}</Badge>
                </div>
                <div className="mt-3 flex justify-between text-sm text-[#8090aa]">
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="font-black text-[#0b4edb]">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button className="mt-10 h-16 w-full text-lg">
          <ShoppingCart className="h-6 w-6" /> Create New Order
        </Button>
      </aside>
    </div>
  );
}
