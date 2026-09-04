"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MoreVertical,
  Paperclip,
  Pause,
  Phone,
  Play,
  RefreshCw,
  Send,
  ShoppingCart,
  Smile,
  Sparkles,
  Square,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type { Company, Conversation, Customer, Message, Order, WhatsAppConnection } from "@/lib/types/domain";
import { useInboxStore } from "@/lib/stores/inbox-store";
import { useRealtimeMessages } from "@/lib/supabase/realtime";
import { formatCurrency } from "@/lib/utils";
import {
  getAudioExtension,
  getConfiguredMaxRecordingSeconds,
  RECORDABLE_AUDIO_MIME_TYPES,
} from "@/lib/whatsapp-audio";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttachmentMessage } from "@/components/inbox/attachment-message";
import { VoiceMessage } from "@/components/inbox/voice-message";

const INBOX_SYNC_INTERVAL_MS = 5000;
const INBOX_SYNC_DEBOUNCE_MS = 250;
const MIN_RECORDING_SECONDS = 0.5;
const MAX_RECORDING_SECONDS = getConfiguredMaxRecordingSeconds();
const MAX_IMAGE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_ATTACHMENT_BYTES = 100 * 1024 * 1024;
const IMAGE_ATTACHMENT_TYPES = ["image/jpeg", "image/png"];
const DOCUMENT_ATTACHMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const ATTACHMENT_ACCEPT_TYPES = [...IMAGE_ATTACHMENT_TYPES, ...DOCUMENT_ATTACHMENT_TYPES].join(",");
const EMOJI_GROUPS = [
  ["😀", "😄", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤔"],
  ["🥺", "😭", "😅", "🙌", "👏", "👍", "👎", "🙏", "💪", "🤝"],
  ["❤️", "💙", "🔥", "✨", "🎉", "✅", "❌", "⭐", "💯", "🚀"],
  ["🛍️", "🛒", "💵", "📦", "📍", "⏰", "📞", "💬", "☕", "🍽️"],
];

type RecorderState = "idle" | "recording" | "preview" | "sending";

function formatRecordingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function selectRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return RECORDABLE_AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

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

function validateSelectedAttachment(file: File) {
  const mimeType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";

  if (IMAGE_ATTACHMENT_TYPES.includes(mimeType)) {
    if (file.size > MAX_IMAGE_ATTACHMENT_BYTES) {
      return { ok: false as const, error: "Image is too large. Maximum image size is 5 MB." };
    }

    return { ok: true as const, kind: "image" as const, mimeType };
  }

  if (DOCUMENT_ATTACHMENT_TYPES.includes(mimeType)) {
    if (file.size > MAX_DOCUMENT_ATTACHMENT_BYTES) {
      return { ok: false as const, error: "Document is too large. Maximum document size is 100 MB." };
    }

    return { ok: true as const, kind: "document" as const, mimeType };
  }

  return {
    ok: false as const,
    error: "Unsupported attachment type. Use PNG, JPG, PDF, TXT, Word, Excel, or PowerPoint files.",
  };
}

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [recordingLevels, setRecordingLevels] = useState<number[]>(Array.from({ length: 34 }, () => 8));
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioMimeType, setRecordedAudioMimeType] = useState("");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [suggestionConversationId, setSuggestionConversationId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(selectedCustomer ?? null);
  const [activeRecentOrders, setActiveRecentOrders] = useState<Order[]>(recentOrders);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const latestMessageRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingAnimationRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceMessageIdRef = useRef<string | null>(null);
  const recordedAudioUrlRef = useRef<string | null>(null);
  const previousRecorderConversationIdRef = useRef<string | null>(selectedConversation?.id ?? null);
  const activeConversationIdRef = useRef<string | null>(selectedConversation?.id ?? conversations[0]?.id ?? null);
  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const syncSequenceRef = useRef(0);
  const syncTimerRef = useRef<number | null>(null);
  const {
    activeConversationId,
    conversations: storeConversations,
    setInitialState,
    setActiveConversation,
    markConversationRead,
    appendMessage,
    upsertMessage,
    messages,
  } = useInboxStore();

  useEffect(() => {
    setInitialState(conversations, selectedMessages, selectedConversation?.id ?? conversations[0]?.id ?? "");
  }, [conversations, selectedConversation?.id, selectedMessages, setInitialState]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    recordedAudioUrlRef.current = recordedAudioUrl;
  }, [recordedAudioUrl]);

  const visibleConversations = storeConversations.length ? storeConversations : conversations;
  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();

    if (!query) {
      return visibleConversations;
    }

    return visibleConversations.filter((conversation) =>
      [
        conversation.customerName,
        conversation.customerPhone,
        conversation.lastMessage,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [conversationSearch, visibleConversations]);
  const activeConversation = visibleConversations.find((item) => item.id === activeConversationId) ?? selectedConversation ?? null;
  const activeMessages = activeConversation
    ? messages.filter((message) => message.conversationId === activeConversation.id)
    : [];
  const latestMessageId = activeMessages[activeMessages.length - 1]?.id ?? "";
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

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    markConversationRead(conversationId);

    try {
      const response = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.warn("[inbox] Mark conversation read failed", {
          conversationId,
          status: response.status,
          body: errorBody,
        });
        return;
      }
    } catch (error) {
      console.warn("[inbox] Mark conversation read request failed", {
        conversationId,
        error,
      });
    } finally {
      scheduleSync("mark-read");
    }
  }, [markConversationRead, scheduleSync]);

  const realtimeStatus = useRealtimeMessages(company.id, (message) => {
    appendMessage(message);
    if (message.direction === "inbound" && activeConversationIdRef.current === message.conversationId) {
      void markConversationAsRead(message.conversationId);
    }
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
    if (!activeConversationId) {
      return;
    }

    void markConversationAsRead(activeConversationId);
  }, [activeConversationId, markConversationAsRead]);

  useEffect(() => {
    if (!activeConversation?.id) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      latestMessageRef.current?.scrollIntoView({ block: "end" });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeConversation?.id, latestMessageId]);

  const customer = activeCustomer;

  const totals = useMemo(() => {
    const paidOrders = activeRecentOrders.filter((order) => order.paymentStatus === "paid");
    return {
      spent: paidOrders.reduce((sum, order) => sum + order.total, 0),
      orders: activeRecentOrders.length,
    };
  }, [activeRecentOrders]);
  const isComposerBusy = isSending || isUploadingAttachment;

  const resetRecording = useCallback(() => {
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    recordingStartedAtRef.current = 0;
    voiceMessageIdRef.current = null;

    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (recordingAnimationRef.current !== null) {
      window.cancelAnimationFrame(recordingAnimationRef.current);
      recordingAnimationRef.current = null;
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;

    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;

    if (recordedAudioUrlRef.current) {
      URL.revokeObjectURL(recordedAudioUrlRef.current);
      recordedAudioUrlRef.current = null;
    }

    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordedAudioMimeType("");
    setRecordingElapsed(0);
    setPreviewCurrentTime(0);
    setIsPreviewPlaying(false);
    setRecordingLevels(Array.from({ length: 34 }, () => 8));
    setRecorderState("idle");
  }, []);

  useEffect(() => {
    return () => {
      resetRecording();
    };
  }, [resetRecording]);

  useEffect(() => {
    const previousConversationId = previousRecorderConversationIdRef.current;
    const nextConversationId = activeConversation?.id ?? null;

    if (previousConversationId && previousConversationId !== nextConversationId && recorderState !== "idle") {
      resetRecording();
    }

    previousRecorderConversationIdRef.current = nextConversationId;
  }, [activeConversation?.id, recorderState, resetRecording]);

  const stopRecordingTracks = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (recordingAnimationRef.current !== null) {
      window.cancelAnimationFrame(recordingAnimationRef.current);
      recordingAnimationRef.current = null;
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  function updateRecordingLevels() {
    const analyser = analyserRef.current;

    if (!analyser) {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let sum = 0;

    for (const value of data) {
      const normalized = (value - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / data.length);
    const level = Math.max(8, Math.min(36, Math.round(8 + rms * 100)));

    setRecordingLevels((current) => [...current.slice(1), level]);
    recordingAnimationRef.current = window.requestAnimationFrame(updateRecordingLevels);
  }

  async function startRecording() {
    if (!activeConversation || recorderState !== "idle") return;

    setSendError(null);
    setRecordingError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError("Microphone recording is not supported in this browser.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setRecordingError("MediaRecorder is not supported in this browser.");
      return;
    }

    const mimeType = selectRecordingMimeType();

    if (!mimeType) {
      setRecordingError("This browser cannot record a supported audio format.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);

      recordingStreamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      setRecordedAudioBlob(null);
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }
      setRecordedAudioMimeType(mimeType);
      setRecordingElapsed(0);
      setRecorderState("recording");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingError("Recording was interrupted. Please try again.");
        stopRecordingTracks();
        setRecorderState("idle");
      };

      recorder.onstop = () => {
        const elapsed = (Date.now() - recordingStartedAtRef.current) / 1000;
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        stopRecordingTracks();

        if (elapsed < MIN_RECORDING_SECONDS || blob.size === 0) {
          setRecordingError("Recording is too short. Please record again.");
          setRecorderState("idle");
          return;
        }

        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);
        setRecordingElapsed(elapsed);
        setPreviewCurrentTime(0);
        setRecorderState("preview");
      };

      recorder.start(250);
      updateRecordingLevels();
      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - recordingStartedAtRef.current) / 1000;
        setRecordingElapsed(elapsed);

        if (elapsed >= MAX_RECORDING_SECONDS && mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 250);
    } catch (error) {
      stopRecordingTracks();
      setRecorderState("idle");
      setRecordingError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access and try again."
          : "Microphone could not be started.",
      );
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function discardRecording() {
    resetRecording();
    setRecordingError(null);
  }

  async function togglePreviewPlayback() {
    const audio = previewAudioRef.current;

    if (!audio) {
      return;
    }

    if (isPreviewPlaying) {
      audio.pause();
      return;
    }

    await audio.play().catch(() => setRecordingError("Preview could not be played."));
  }

  async function sendVoiceMessage() {
    if (!activeConversation || !recordedAudioBlob || recorderState === "sending") return;

    const messageId = voiceMessageIdRef.current ?? crypto.randomUUID();
    voiceMessageIdRef.current = messageId;
    setRecorderState("sending");
    setSendError(null);

    const formData = new FormData();
    formData.append("conversationId", activeConversation.id);
    formData.append("messageId", messageId);
    formData.append("durationSeconds", String(recordingElapsed));
    formData.append("audio", recordedAudioBlob, `${messageId}.${getAudioExtension(recordedAudioMimeType)}`);

    try {
      const response = await fetch("/api/messages/send-audio", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.message) {
          upsertMessage(payload.message);
          setSuggestion(null);
          setSuggestionConversationId(null);
          setSuggestionError(null);
          scheduleSync("send-audio-failed");
          resetRecording();
        } else {
          setRecorderState("preview");
        }

        setSendError(formatSendError(payload));
        return;
      }

      if (payload?.message) {
        upsertMessage(payload.message);
        setSuggestion(null);
        setSuggestionConversationId(null);
        setSuggestionError(null);
        scheduleSync("send-audio");
        resetRecording();
        return;
      }

      setRecorderState("preview");
      setSendError("Voice message sent, but the server did not return the saved message.");
    } catch (error) {
      console.error("[inbox] Send voice message request failed", error);
      setRecorderState("preview");
      setSendError("Voice message request failed. Check the console and server logs.");
    }
  }

  function handleAttachmentSelection(file: File | undefined) {
    if (!file) {
      return;
    }

    const validation = validateSelectedAttachment(file);

    if (!validation.ok) {
      setSendError(validation.error);
      setSelectedFile(null);
      return;
    }

    setSendError(null);
    setSelectedFile(file);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendAttachmentMessage() {
    if (!activeConversation || !selectedFile || isUploadingAttachment || isSending) return;

    const validation = validateSelectedAttachment(selectedFile);

    if (!validation.ok) {
      setSendError(validation.error);
      return;
    }

    const messageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const attachmentUrl = URL.createObjectURL(selectedFile);
    const optimisticMessage: Message = {
      id: messageId,
      companyId: company.id,
      conversationId: activeConversation.id,
      customerId: activeConversation.customerId,
      messageType: validation.kind,
      direction: "outbound",
      body: "📎 Attachment",
      status: "uploading",
      whatsappMessageId: null,
      audio: null,
      attachment: {
        mediaId: null,
        mimeType: validation.mimeType,
        sha256: null,
        fileSize: selectedFile.size,
        fileName: selectedFile.name,
        storageBucket: null,
        storagePath: null,
        error: null,
        url: attachmentUrl,
      },
      createdAt,
    };

    upsertMessage(optimisticMessage);
    setIsUploadingAttachment(true);
    setSendError(null);

    const formData = new FormData();
    formData.append("conversationId", activeConversation.id);
    formData.append("messageId", messageId);
    formData.append("file", selectedFile, selectedFile.name);

    try {
      upsertMessage({ ...optimisticMessage, status: "sending" });
      const response = await fetch("/api/messages/send-attachment", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const failedMessage = payload?.message
          ? {
              ...payload.message,
              attachment: {
                ...payload.message.attachment,
                url: payload.message.attachment?.url ?? attachmentUrl,
              },
            }
          : {
              ...optimisticMessage,
              status: "failed" as const,
              attachment: {
                ...optimisticMessage.attachment!,
                error: formatSendError(payload),
              },
            };
        upsertMessage(failedMessage);
        setSendError(formatSendError(payload));
        return;
      }

      if (payload?.message) {
        upsertMessage(payload.message);
        URL.revokeObjectURL(attachmentUrl);
        clearSelectedFile();
        setSuggestion(null);
        setSuggestionConversationId(null);
        setSuggestionError(null);
        scheduleSync("send-attachment");
      }
    } catch (error) {
      console.error("[inbox] Send attachment request failed", error);
      upsertMessage({
        ...optimisticMessage,
        status: "failed",
        attachment: {
          ...optimisticMessage.attachment!,
          error: "Attachment request failed.",
        },
      });
      setSendError("Attachment request failed. Check the console and server logs.");
    } finally {
      setIsUploadingAttachment(false);
    }
  }

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
    <div className="grid h-[calc(100vh-98px)] overflow-hidden bg-[#ffffff] xl:grid-cols-[405px_minmax(0,1fr)_320px]">
      <aside className="flex h-full min-h-0 flex-col border-r border-[#d8c3ff] bg-[#fbf8ff]">
        <div className="flex h-20 items-center justify-between border-b border-[#d8c3ff] px-6">
          <h2 className="text-xl font-semibold text-[#000000]">Messages</h2>
          <Button variant="ghost" size="icon" aria-label="Compose"><Send className="h-5 w-5 rotate-[-35deg] text-[#7c3aed]" /></Button>
        </div>
        <div className="p-4">
          <Input
            icon
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
            placeholder="Search conversations..."
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                setActiveConversation(conversation.id);
                markConversationRead(conversation.id);
              }}
              className={`relative flex w-full items-center gap-4 border-b border-[#d8c3ff] p-5 text-left transition hover:bg-[#f4ecff] ${
                conversation.id === activeConversation?.id ? "bg-[#f4ecff]" : ""
              }`}
            >
              {conversation.id === activeConversation?.id ? <span className="absolute right-0 h-full w-1 bg-[#7c3aed]" /> : null}
              <Avatar name={conversation.customerName} src={conversation.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate font-semibold text-[#000000]">{conversation.customerName}</div>
                  <div className="text-xs font-semibold text-[#000000]">
                    {new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="mt-1 truncate text-[#000000]">{conversation.lastMessage}</div>
              </div>
              {conversation.unreadCount ? <Badge tone="green">{conversation.unreadCount}</Badge> : null}
            </button>
          ))}
          {!filteredConversations.length ? (
            <div className="px-6 py-10 text-center text-sm leading-6 text-[#000000]">
              No conversations match your search.
            </div>
          ) : null}
        </div>
      </aside>

      <section className="flex h-full min-w-0 min-h-0 flex-col bg-[#ffffff]">
        <div className="flex h-20 items-center justify-between border-b border-[#d8c3ff] bg-[#fbf8ff] px-6 backdrop-blur">
          {activeConversation ? (
            <div className="flex items-center gap-4">
              <Avatar name={activeConversation.customerName} src={activeConversation.avatarUrl} />
              <div>
                <div className="text-lg font-semibold text-[#000000]">{activeConversation.customerName}</div>
                <div className="text-sm text-[#7c3aed]">Online</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-semibold text-[#000000]">No conversations</div>
              <div className="text-sm text-[#000000]">Incoming WhatsApp messages will appear here.</div>
            </div>
          )}
          <div className="flex items-center gap-3 text-[#000000]">
            <span className="flex items-center gap-2 text-xs font-semibold text-[#000000]">
              <span
                className={`h-2 w-2 rounded-full ${realtimeStatus === "live" ? "bg-[#7c3aed]" : "bg-[#d8c3ff]"}`}
              />
              {isSyncing ? "Updating..." : realtimeStatus === "live" ? "Live" : realtimeStatus === "fallback" ? "Polling" : "Connecting..."}
            </span>
            <Phone className="h-5 w-5" />
            <Video className="h-5 w-5" />
            <div className="h-8 w-px bg-[#d8c3ff]" />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="mx-auto w-fit rounded-lg bg-[#f4ecff] px-5 py-2 text-xs font-black uppercase text-[#000000] shadow-sm ring-1 ring-[#d8c3ff]">Today</div>
          {activeConversation ? activeMessages.map((message) => (
            <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div
                className={`${message.messageType === "audio" || message.messageType === "image" || message.messageType === "document" ? "max-w-[82%]" : "max-w-[70%]"} rounded-xl p-4 shadow-sm ${
                  message.direction === "outbound" ? "bg-[#f4ecff] text-black ring-1 ring-[#7c3aed]/40" : "bg-[#fbf8ff] text-[#000000] ring-1 ring-[#d8c3ff]"
                }`}
              >
                {message.messageType === "audio" ? (
                  <VoiceMessage message={message} />
                ) : message.messageType === "image" || message.messageType === "document" ? (
                  <AttachmentMessage message={message} />
                ) : (
                  <p className="leading-7">{message.body}</p>
                )}
                <div className={`mt-2 text-right text-xs ${message.direction === "outbound" ? "text-black/60" : "text-[#000000]"}`}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {message.direction === "outbound" ? " ✓✓" : ""}
                </div>
              </div>
            </div>
          )) : (
            <div className="mx-auto mt-20 max-w-sm rounded-xl bg-[#ffffff] p-6 text-center text-[#000000] shadow-sm ring-1 ring-[#d8c3ff]">
              {whatsappConnection.isConnected ? (
                <>
                  <p className="font-semibold text-[#000000]">No conversations yet</p>
                  <p className="mt-2">
                    New messages sent to {whatsappConnection.phoneNumber} will appear here.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#000000]">WhatsApp setup required</p>
                  <p className="mt-2">
                    {whatsappConnection.phoneNumber && !whatsappConnection.phoneNumberId
                      ? "Add this tenant's Meta Phone Number ID to finish connecting WhatsApp."
                      : "Add this tenant's WhatsApp number and Meta Phone Number ID in the database."}
                  </p>
                </>
              )}
            </div>
          )}
          <div ref={latestMessageRef} aria-hidden="true" />
        </div>

        <div className="bg-[#fbf8ff] p-5 backdrop-blur">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={suggestMessageReply}
              disabled={!activeConversation || isSuggesting}
            >
              {isSuggesting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#000000]/40 border-t-[#7c3aed]" />
              ) : (
                <Sparkles className="h-4 w-4 text-[#7c3aed]" />
              )}
              {isSuggesting ? "Suggesting..." : "AI Suggest Reply"}
            </Button>
          </div>
          {activeSuggestion ? (
            <div className="mb-3 rounded-xl bg-[#ffffff] p-4 ring-1 ring-[#d8c3ff]">
              <p className="text-sm leading-6 text-[#000000]">Suggestion added to the message input.</p>
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
            <div className="mb-3 rounded-xl bg-[#f4ecff] px-4 py-3 text-sm font-medium text-[#6d28d9] ring-1 ring-[#7c3aed]">
              {activeSuggestionError}
            </div>
          ) : null}
          {recorderState === "recording" ? (
            <div className="flex items-center gap-4 rounded-xl bg-[#ffffff] p-4 shadow-lg ring-1 ring-[#7c3aed]/30">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f4ecff] text-[#6d28d9]">
                <span className="absolute h-full w-full animate-ping rounded-full bg-[#6d28d9]/20" />
                <Mic className="relative h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#000000]">Recording voice message</span>
                  <span className="font-mono text-[#7c3aed]">{formatRecordingTime(recordingElapsed)}</span>
                </div>
                <div className="flex h-9 items-center gap-1">
                  {recordingLevels.map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className="w-1 rounded-full bg-[#7c3aed] transition-all"
                      style={{ height }}
                    />
                  ))}
                </div>
              </div>
              <Button type="button" variant="danger" size="icon" onClick={discardRecording} aria-label="Cancel recording">
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button type="button" size="icon" onClick={stopRecording} aria-label="Stop recording">
                <Square className="h-5 w-5 fill-current" />
              </Button>
            </div>
          ) : recorderState === "preview" || recorderState === "sending" ? (
            <div className="overflow-hidden rounded-xl bg-[#ffffff] shadow-lg ring-1 ring-[#d8c3ff]">
              {recorderState === "sending" ? (
                <div className="h-1 w-full overflow-hidden bg-[#f4ecff]">
                  <div className="h-full w-1/2 animate-[progress-slide_1.1s_ease-in-out_infinite] rounded-full bg-[#7c3aed]" />
                </div>
              ) : null}
              <div className="p-4">
              {recordedAudioUrl ? (
                <audio
                  ref={previewAudioRef}
                  src={recordedAudioUrl}
                  preload="metadata"
                  onEnded={() => {
                    setIsPreviewPlaying(false);
                    setPreviewCurrentTime(0);
                  }}
                  onPause={() => setIsPreviewPlaying(false)}
                  onPlay={() => setIsPreviewPlaying(true)}
                  onTimeUpdate={(event) => setPreviewCurrentTime(event.currentTarget.currentTime)}
                />
              ) : null}
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={togglePreviewPlayback}
                  disabled={!recordedAudioUrl || recorderState === "sending"}
                  aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
                >
                  {isPreviewPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#000000]">Preview before sending</span>
                    <span className="font-mono text-[#7c3aed]">
                      {formatRecordingTime(previewCurrentTime || recordingElapsed)} / {formatRecordingTime(recordingElapsed)}
                    </span>
                  </div>
                  {recorderState === "sending" ? (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">
                      Sending voice note
                    </p>
                  ) : null}
                  <div className="flex h-9 items-center gap-1">
                    {recordingLevels.map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className="w-1 rounded-full bg-[#7c3aed]/80"
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={discardRecording}
                  disabled={recorderState === "sending"}
                  aria-label="Discard recording"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button type="button" onClick={sendVoiceMessage} disabled={recorderState === "sending"}>
                  <Send className="h-4 w-4" />
                  {recorderState === "sending" ? "Sending" : "Send"}
                </Button>
              </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#d8c3ff] bg-[#ffffff] px-4 py-3 shadow-lg">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f4ecff] text-[#7c3aed]">
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#000000]">{selectedFile.name}</div>
                    <div className="mt-0.5 text-xs text-[#000000]">{formatAttachmentSize(selectedFile.size)}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSelectedFile}
                    disabled={isUploadingAttachment}
                    aria-label="Clear selected attachment"
                    className="h-9 w-9 text-[#000000] hover:text-[#6d28d9]"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : null}
              <div className="relative flex items-end gap-3 rounded-xl bg-[#fbf8ff] p-3 shadow-lg ring-1 ring-[#d8c3ff]">
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-4 w-[292px] rounded-xl bg-[#ffffff] p-3 shadow-xl ring-1 ring-[#d8c3ff]">
                    <div className="grid grid-cols-10 gap-1">
                      {EMOJI_GROUPS.flat().map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setDraft((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                            draftTextareaRef.current?.focus();
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition hover:bg-[#d8c3ff]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={ATTACHMENT_ACCEPT_TYPES}
                  onChange={(event) => {
                    handleAttachmentSelection(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isComposerBusy}
                  className="h-10 w-10 shrink-0 text-[#000000] hover:text-[#000000]"
                  aria-label="Choose emoji"
                >
                  <Smile className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activeConversation || isComposerBusy}
                  className="h-10 w-10 shrink-0 text-[#000000] hover:text-[#000000]"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-6 w-6" />
                </Button>
                <textarea
                  ref={draftTextareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (selectedFile) {
                        void sendAttachmentMessage();
                      } else {
                        void sendMessage();
                      }
                    }
                  }}
                  placeholder={selectedFile ? "Attachment ready" : "Type a message"}
                  disabled={!activeConversation || isComposerBusy}
                  rows={1}
                  className="max-h-40 min-h-10 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-[#000000] outline-none placeholder:text-[#000000] disabled:opacity-60"
                />
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={startRecording}
                    disabled={!activeConversation || isComposerBusy || Boolean(selectedFile)}
                    aria-label="Record voice message"
                    className="h-10 w-10 text-[#000000] hover:text-[#000000]"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => {
                      if (selectedFile) {
                        void sendAttachmentMessage();
                      } else {
                        void sendMessage();
                      }
                    }}
                    disabled={(!draft.trim() && !selectedFile) || !activeConversation || isComposerBusy}
                    aria-label="Send message"
                  >
                    {isComposerBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {sendError ? (
            <div className="mt-3 rounded-xl bg-[#f4ecff] px-4 py-3 text-sm font-medium text-[#6d28d9] ring-1 ring-[#7c3aed]">
              {sendError}
            </div>
          ) : null}
          {recordingError ? (
            <div className="mt-3 rounded-xl bg-[#f4ecff] px-4 py-3 text-sm font-medium text-[#6d28d9] ring-1 ring-[#7c3aed]">
              {recordingError}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="h-full overflow-y-auto border-l border-[#d8c3ff] bg-[#fbf8ff] p-7">
        {customer ? (
          <div className="text-center">
            <Avatar name={customer.name} src={customer.avatarUrl} className="mx-auto h-24 w-24 shadow-xl" />
            <h2 className="mt-5 text-xl font-semibold text-[#000000]">{customer.name}</h2>
            <p className="mt-2 text-[#000000]">{customer.phone}</p>
            <Badge tone="green" className="mt-4 uppercase">{customer.tags[0] ?? "customer"}</Badge>
          </div>
        ) : null}
        <div className="mt-10">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-[#000000]">Status</div>
          <p className="mt-4 leading-7 text-[#000000]">{customer?.notes}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#ffffff] p-5 ring-1 ring-[#d8c3ff]">
            <div className="text-xs font-black uppercase text-[#000000]">Total Spent</div>
            <div className="mt-2 text-lg font-black text-[#000000]">{formatCurrency(totals.spent)}</div>
          </div>
          <div className="rounded-xl bg-[#ffffff] p-5 ring-1 ring-[#d8c3ff]">
            <div className="text-xs font-black uppercase text-[#000000]">Total Orders</div>
            <div className="mt-2 text-lg font-black text-[#000000]">{totals.orders}</div>
          </div>
        </div>
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[#000000]">Recent Orders</div>
            <button className="text-sm font-bold text-[#7c3aed]">View All</button>
          </div>
          <div className="space-y-3">
            {activeRecentOrders.slice(0, 2).map((order) => (
              <div key={order.id} className="rounded-xl bg-[#fbf8ff] p-4 shadow-sm ring-1 ring-[#d8c3ff]">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#000000]">#{order.orderNumber}</div>
                  <Badge tone={order.paymentStatus === "paid" ? "green" : "yellow"}>{order.status}</Badge>
                </div>
                <div className="mt-3 flex justify-between text-sm text-[#000000]">
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="font-black text-[#7c3aed]">{formatCurrency(order.total)}</span>
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
