type SendWhatsAppTextInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
};

export async function sendWhatsAppTextMessage({
  phoneNumberId,
  accessToken,
  to,
  body,
}: SendWhatsAppTextInput) {
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "WhatsApp Cloud API request failed");
  }

  return payload as { messages?: { id: string }[] };
}

export function isInsideCustomerServiceWindow(lastInboundAt: string | null) {
  if (!lastInboundAt) {
    return false;
  }

  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}
