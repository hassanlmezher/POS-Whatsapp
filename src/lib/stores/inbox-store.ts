"use client";

import { create } from "zustand";
import type { Conversation, Message } from "@/lib/types/domain";

type InboxState = {
  activeConversationId: string | null;
  conversations: Conversation[];
  messages: Message[];
  setInitialState: (conversations: Conversation[], messages: Message[], activeConversationId: string) => void;
  setActiveConversation: (conversationId: string) => void;
  appendMessage: (message: Message) => void;
};

export const useInboxStore = create<InboxState>((set) => ({
  activeConversationId: null,
  conversations: [],
  messages: [],
  setInitialState: (conversations, messages, activeConversationId) =>
    set({ conversations, messages, activeConversationId }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  appendMessage: (message) =>
    set((state) => ({
      messages: state.messages.some((item) => item.id === message.id)
        ? state.messages
        : [...state.messages, message],
      conversations: state.conversations.map((conversation) =>
        conversation.id === message.conversationId
          ? {
              ...conversation,
              lastMessage: message.body,
              lastMessageAt: message.createdAt,
              unreadCount:
                message.direction === "inbound"
                  ? conversation.unreadCount + 1
                  : conversation.unreadCount,
            }
          : conversation,
      ),
    })),
}));
