import { FileText, ImageIcon } from "lucide-react";
import type { Message } from "@/lib/types/domain";

function formatFileSize(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentMessage({ message }: { message: Message }) {
  const attachment = message.attachment;
  const isBusy = message.status === "uploading" || message.status === "sending";
  const isFailed = message.status === "failed";
  const fileName = attachment?.fileName ?? (message.messageType === "image" ? "Image attachment" : "Document attachment");
  const fileSize = formatFileSize(attachment?.fileSize);

  if (message.messageType === "image" && attachment?.url) {
    return (
      <div className="min-w-[240px] max-w-[420px]">
        <div className="overflow-hidden rounded-lg border border-black/10 bg-black/10">
          <img src={attachment.url} alt={fileName} className="max-h-[320px] w-full object-contain" />
        </div>
        <div className={`mt-2 flex items-center justify-between gap-3 text-xs ${message.direction === "outbound" ? "text-black/65" : "text-[#8fa3ad]"}`}>
          <span className="truncate">{fileName}</span>
          {fileSize ? <span className="shrink-0">{fileSize}</span> : null}
        </div>
        {isBusy ? <AttachmentStatus label={message.status === "uploading" ? "Uploading" : "Sending"} /> : null}
        {isFailed ? <AttachmentError error={attachment.error} /> : null}
      </div>
    );
  }

  return (
    <div className="min-w-[260px] max-w-[420px]">
      <div className={`flex items-center gap-4 rounded-lg border p-4 ${
        message.direction === "outbound"
          ? "border-black/15 bg-black/10"
          : "border-[#1d3038] bg-[#0b1114]"
      }`}>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
          message.direction === "outbound" ? "bg-black/15 text-black" : "bg-[#082529] text-[#22ddeb]"
        }`}>
          {message.messageType === "image" ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{fileName}</div>
          <div className={`mt-1 text-xs ${message.direction === "outbound" ? "text-black/60" : "text-[#8fa3ad]"}`}>
            {message.messageType === "image" ? "Image" : "Document"}{fileSize ? ` | ${fileSize}` : ""}
          </div>
        </div>
      </div>
      {isBusy ? <AttachmentStatus label={message.status === "uploading" ? "Uploading" : "Sending"} /> : null}
      {isFailed ? <AttachmentError error={attachment?.error} /> : null}
    </div>
  );
}

function AttachmentStatus({ label }: { label: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs font-semibold opacity-70">{label}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/15">
        <span className="block h-full w-1/2 animate-[progress-slide_1s_ease-in-out_infinite] rounded-full bg-current opacity-70" />
      </div>
    </div>
  );
}

function AttachmentError({ error }: { error: string | null | undefined }) {
  return (
    <div className="mt-3 rounded-lg border border-[#8d2638] bg-[#351018] px-3 py-2 text-xs font-semibold text-[#ff7a94]">
      {error ?? "Attachment could not be sent."}
    </div>
  );
}
