"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Paperclip, Phone, RefreshCw, Send, ShoppingCart, Smile, Sparkles, Video, X } from "lucide-react";
import type { Company, Conversation, Customer, Message, Order, WhatsAppConnection } from "@/lib/types/domain";
import { useInboxStore } from "@/lib/stores/inbox-store";
import { useRealtimeMessages } from "@/lib/supabase/realtime";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INBOX_SYNC_INTERVAL_MS = 5000;
const INBOX_SYNC_DEBOUNCE_MS = 250;

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
  whatsappConnection,
  conversations,
  selectedConversation,
  selectedCustomer,
  selectedMessages,
  recentOrders,
}: {
  company: Company;
  whatsappConnection: WhatsAppConnection;
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedCustomer?: Customer | null;
  selectedMessages: Message[];
  recentOrders: Order[];
}) {
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [suggestionConversationId, setSuggestionConversationId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(selectedCustomer ?? null);
  const [activeRecentOrders, setActiveRecentOrders] = useState<Order[]>(recentOrders);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeConversationIdRef = useRef<string | null>(selectedConversation?.id ?? conversations[0]?.id ?? null);
  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const syncSequenceRef = useRef(0);
  const syncTimerRef = useRef<number | null>(null);
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

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const visibleConversations = storeConversations.length ? storeConversations : conversations;
  const activeConversation = visibleConversations.find((item) => item.id === activeConversationId) ?? selectedConversation ?? null;
  const activeMessages = activeConversation
    ? messages.filter((message) => message.conversationId === activeConversation.id)
    : [];
  const activeSuggestion = suggestionConversationId === activeConversation?.id ? suggestion : null;
  const activeSuggestionError = suggestionConversationId === activeConversation?.id ? suggestionError : null;

  useEffect(() => {
    const textarea = draftTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${nextHeight}px`;
  }, [draft]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation?.id]);

  const syncInbox = useCallback(async (reason: string) => {
    const requestId = syncSequenceRef.current + 1;
    syncSequenceRef.current = requestId;

    syncAbortControllerRef.current?.abort();
    const controller = new AbortController();
    syncAbortControllerRef.current = controller;
    setIsSyncing(true);

    try {
      const latestConversationId = activeConversationIdRef.current;
      const search = latestConversationId
        ? `?activeConversationId=${encodeURIComponent(latestConversationId)}`
        : "";
      const response = await fetch(`/api/inbox${search}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.warn("[inbox] Inbox sync request failed", {
          reason,
          status: response.status,
          body: errorBody,
        });
        return;
      }

      const payload = await response.json() as {
        conversations: Conversation[];
        selectedConversation: Conversation | null;
        selectedCustomer?: Customer | null;
        selectedMessages: Message[];
        recentOrders: Order[];
      };

      if (controller.signal.aborted || requestId !== syncSequenceRef.current) {
        return;
      }

      setInitialState(
        payload.conversations,
        payload.selectedMessages,
        payload.selectedConversation?.id ?? activeConversationIdRef.current ?? payload.conversations[0]?.id ?? "",
      );
      setActiveCustomer(payload.selectedCustomer ?? null);
      setActiveRecentOrders(payload.recentOrders ?? []);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      console.warn("[inbox] Inbox sync request failed", {
        reason,
        error,
      });
    } finally {
      if (syncAbortControllerRef.current === controller) {
        syncAbortControllerRef.current = null;
      }

      if (requestId === syncSequenceRef.current) {
        setIsSyncing(false);
      }
    }
  }, [setInitialState]);

  const scheduleSync = useCallback((reason: string, delayMs = INBOX_SYNC_DEBOUNCE_MS) => {
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null;
      void syncInbox(reason);
    }, delayMs);
  }, [syncInbox]);

  const realtimeStatus = useRealtimeMessages(company.id, (message) => {
    appendMessage(message);
    scheduleSync("realtime");
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void syncInbox("interval");
    }, INBOX_SYNC_INTERVAL_MS);

    function handleVisibilitySync() {
      if (document.visibilityState === "visible") {
        scheduleSync("visibility");
      }
    }

    scheduleSync("mount", 0);
    window.addEventListener("focus", handleVisibilitySync);
    document.addEventListener("visibilitychange", handleVisibilitySync);

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      window.clearInterval(intervalId);
      syncAbortControllerRef.current?.abort();
      syncAbortControllerRef.current = null;
      window.removeEventListener("focus", handleVisibilitySync);
      document.removeEventListener("visibilitychange", handleVisibilitySync);
    };
  }, [scheduleSync, syncInbox]);

  useEffect(() => {
    scheduleSync("conversation-change");
  }, [activeConversationId, scheduleSync]);

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
        setSuggestion(null);
        setSuggestionConversationId(null);
        setSuggestionError(null);
        scheduleSync("send-message");
      }
    } catch (error) {
      console.error("[inbox] Send message request failed", error);
      setDraft(body);
      setSendError("Message request failed. Check the console and server logs.");
    } finally {
      setIsSending(false);
    }
  }

  async function suggestMessageReply() {
    if (!activeConversation || isSuggesting) return;

    setSuggestionConversationId(activeConversation.id);
    setSuggestionError(null);
    setIsSuggesting(true);

    try {
      const response = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversation.id }),
      });
      const payload = await response.json().catch(() => null) as {
        suggestion?: string;
        suggestionId?: string;
        provider?: string;
        model?: string;
        wasRetried?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !payload?.suggestion) {
        setSuggestionError(payload?.error ?? "AI suggestion could not be generated.");
        return;
      }

      setDraft(payload.suggestion);
      setSuggestion(payload.suggestion);
      if (payload.suggestionId) {
        void fetch("/api/ai/suggest-reply", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suggestionId: payload.suggestionId }),
        }).catch((error) => {
          console.warn("[inbox] AI suggestion accept logging failed", error);
        });
      }
    } catch (error) {
      console.error("[inbox] AI suggestion request failed", error);
      setSuggestionError("AI suggestion request failed. Check the console and server logs.");
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-98px)] overflow-hidden bg-[#030607] xl:grid-cols-[405px_minmax(0,1fr)_320px]">
      <aside className="flex h-full min-h-0 flex-col border-r border-[#1d3038] bg-[#070b0d]">
        <div className="flex h-20 items-center justify-between border-b border-[#1d3038] px-6">
          <h2 className="text-xl font-semibold text-[#f8fbff]">Messages</h2>
          <Button variant="ghost" size="icon" aria-label="Compose"><Send className="h-5 w-5 rotate-[-35deg] text-[#22ddeb]" /></Button>
        </div>
        <div className="p-4"><Input icon placeholder="Search conversations..." /></div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setActiveConversation(conversation.id)}
              className={`relative flex w-full items-center gap-4 border-b border-[#1d3038] p-5 text-left transition hover:bg-[#0d1519] ${
                conversation.id === activeConversation?.id ? "bg-[#10181c]" : ""
              }`}
            >
              {conversation.id === activeConversation?.id ? <span className="absolute right-0 h-full w-1 bg-[#22ddeb]" /> : null}
              <Avatar name={conversation.customerName} src={conversation.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate font-semibold text-[#f8fbff]">{conversation.customerName}</div>
                  <div className="text-xs font-semibold text-[#6f858f]">
                    {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="mt-1 truncate text-[#8fa3ad]">{conversation.lastMessage}</div>
              </div>
              {conversation.unreadCount ? <Badge tone="green">{conversation.unreadCount}</Badge> : null}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex h-full min-w-0 min-h-0 flex-col bg-[#030607]">
        <div className="flex h-20 items-center justify-between border-b border-[#1d3038] bg-[#070b0d] px-6 backdrop-blur">
          {activeConversation ? (
            <div className="flex items-center gap-4">
              <Avatar name={activeConversation.customerName} src={activeConversation.avatarUrl} />
              <div>
                <div className="text-lg font-semibold text-[#f8fbff]">{activeConversation.customerName}</div>
                <div className="text-sm text-[#22ddeb]">Online</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-semibold text-[#f8fbff]">No conversations</div>
              <div className="text-sm text-[#6f858f]">Incoming WhatsApp messages will appear here.</div>
            </div>
          )}
          <div className="flex items-center gap-3 text-[#8fa3ad]">
            <span className="flex items-center gap-2 text-xs font-semibold text-[#6f858f]">
              <span
                className={`h-2 w-2 rounded-full ${realtimeStatus === "live" ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {isSyncing ? "Updating..." : realtimeStatus === "live" ? "Live" : realtimeStatus === "fallback" ? "Polling" : "Connecting..."}
            </span>
            <Phone className="h-5 w-5" />
            <Video className="h-5 w-5" />
            <div className="h-8 w-px bg-[#1d3038]" />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="mx-auto w-fit rounded-lg bg-[#10181c] px-5 py-2 text-xs font-black uppercase text-[#8fa3ad] shadow-sm ring-1 ring-[#1d3038]">Today</div>
          {activeConversation ? activeMessages.map((message) => (
            <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-xl p-4 shadow-sm ${
                  message.direction === "outbound" ? "bg-[#22ddeb] text-black" : "bg-[#070b0d] text-[#f8fbff] ring-1 ring-[#1d3038]"
                }`}
              >
                <p className="leading-7">{message.body}</p>
                <div className={`mt-2 text-right text-xs ${message.direction === "outbound" ? "text-black/60" : "text-[#6f858f]"}`}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {message.direction === "outbound" ? " ✓✓" : ""}
                </div>
              </div>
            </div>
          )) : (
            <div className="mx-auto mt-20 max-w-sm rounded-xl bg-[#0b1114] p-6 text-center text-[#8fa3ad] shadow-sm ring-1 ring-[#1d3038]">
              {whatsappConnection.isConnected ? (
                <>
                  <p className="font-semibold text-[#f8fbff]">No conversations yet</p>
                  <p className="mt-2">
                    New messages sent to {whatsappConnection.phoneNumber} will appear here.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#f8fbff]">WhatsApp setup required</p>
                  <p className="mt-2">
                    {whatsappConnection.phoneNumber && !whatsappConnection.phoneNumberId
                      ? "Add this tenant's Meta Phone Number ID to finish connecting WhatsApp."
                      : "Add this tenant's WhatsApp number and Meta Phone Number ID in the database."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#070b0d] p-5 backdrop-blur">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={suggestMessageReply}
              disabled={!activeConversation || isSuggesting}
            >
              {isSuggesting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#6f858f]/40 border-t-[#22ddeb]" />
              ) : (
                <Sparkles className="h-4 w-4 text-[#22ddeb]" />
              )}
              {isSuggesting ? "Suggesting..." : "AI Suggest Reply"}
            </Button>
          </div>
          {activeSuggestion ? (
            <div className="mb-3 rounded-xl bg-[#0b1114] p-4 ring-1 ring-[#1d3038]">
              <p className="text-sm leading-6 text-[#8fa3ad]">Suggestion added to the message input.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={suggestMessageReply} disabled={isSuggesting}>
                  <RefreshCw className="h-4 w-4" /> Regenerate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSuggestion(null);
                  }}
                >
                  <X className="h-4 w-4" /> Dismiss
                </Button>
              </div>
            </div>
          ) : null}
          {activeSuggestionError ? (
            <div className="mb-3 rounded-xl bg-[#33240b] px-4 py-3 text-sm font-medium text-[#f6c76a] ring-1 ring-[#8a621f]">
              {activeSuggestionError}
            </div>
          ) : null}
          <div className="flex items-end gap-3 rounded-xl bg-[#070b0d] p-3 shadow-lg ring-1 ring-[#1d3038]">
            <Smile className="h-6 w-6 text-[#8fa3ad]" />
            <Paperclip className="h-6 w-6 text-[#8fa3ad]" />
            <textarea
              ref={draftTextareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Type a message"
              disabled={!activeConversation || isSending}
              rows={1}
              className="max-h-40 min-h-10 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-[#f8fbff] outline-none placeholder:text-[#6f858f]"
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
            <div className="mt-3 rounded-xl bg-[#351018] px-4 py-3 text-sm font-medium text-[#ff7a94] ring-1 ring-[#8d2638]">
              {sendError}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="h-full overflow-y-auto border-l border-[#1d3038] bg-[#070b0d] p-7">
        {customer ? (
          <div className="text-center">
            <Avatar name={customer.name} src={customer.avatarUrl} className="mx-auto h-24 w-24 shadow-xl" />
            <h2 className="mt-5 text-xl font-semibold text-[#f8fbff]">{customer.name}</h2>
            <p className="mt-2 text-[#8fa3ad]">{customer.phone}</p>
            <Badge tone="green" className="mt-4 uppercase">{customer.tags[0] ?? "customer"}</Badge>
          </div>
        ) : null}
        <div className="mt-10">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-[#6f858f]">Status</div>
          <p className="mt-4 leading-7 text-[#8fa3ad]">{customer?.notes}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#0b1114] p-5 ring-1 ring-[#1d3038]">
            <div className="text-xs font-black uppercase text-[#6f858f]">Total Spent</div>
            <div className="mt-2 text-lg font-black text-[#f8fbff]">{formatCurrency(totals.spent)}</div>
          </div>
          <div className="rounded-xl bg-[#0b1114] p-5 ring-1 ring-[#1d3038]">
            <div className="text-xs font-black uppercase text-[#6f858f]">Total Orders</div>
            <div className="mt-2 text-lg font-black text-[#f8fbff]">{totals.orders}</div>
          </div>
        </div>
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[#6f858f]">Recent Orders</div>
            <button className="text-sm font-bold text-[#22ddeb]">View All</button>
          </div>
          <div className="space-y-3">
            {activeRecentOrders.slice(0, 2).map((order) => (
              <div key={order.id} className="rounded-xl bg-[#070b0d] p-4 shadow-sm ring-1 ring-[#1d3038]">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#f8fbff]">#{order.orderNumber}</div>
                  <Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.status}</Badge>
                </div>
                <div className="mt-3 flex justify-between text-sm text-[#6f858f]">
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="font-black text-[#22ddeb]">{formatCurrency(order.total)}</span>
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
