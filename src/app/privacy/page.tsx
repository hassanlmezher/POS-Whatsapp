import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | InChouf POS",
  description:
    "Privacy Policy for InChouf POS, including WhatsApp Business messaging, business data, customer data, and service providers.",
  alternates: {
    canonical: "https://inchouf.com/privacy",
  },
};

const lastUpdated = "August 28, 2026";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "InChouf POS may process information provided by business account owners, administrators, employees, and customers. This can include account contact details, business profile information, customer names, phone numbers, WhatsApp messages, order details, product and inventory records, transaction-related information, and support communications.",
      "We also process technical information needed to operate the service, such as authentication records, security logs, device and browser information, IP addresses, and usage events related to maintaining, securing, and improving the platform.",
    ],
  },
  {
    title: "WhatsApp and Meta Data",
    body: [
      "InChouf POS integrates with WhatsApp Business and Meta APIs so businesses can receive and manage customer messages inside their POS workspace. When a customer sends a message to a business's WhatsApp number, InChouf POS may process the sender phone number, display name when available, message content, message identifiers, timestamps, delivery status, and related conversation metadata.",
      "WhatsApp data is processed to provide messaging, customer support, order handling, and business-management functionality. We do not sell WhatsApp message data, customer phone numbers, or customer conversations.",
    ],
  },
  {
    title: "Tenant and Business Data",
    body: [
      "InChouf POS is a multi-tenant platform. Each business has its own tenant account, and business data is logically separated by tenant. Users associated with one business should only access data belonging to that business account.",
      "Business data may include orders, customers, conversations, products, inventory, reporting data, staff account information, and configuration required to operate the POS and WhatsApp inbox.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use information to provide, maintain, secure, and improve InChouf POS; authenticate users; route WhatsApp conversations to the correct business account; manage orders and customer records; provide support; troubleshoot issues; prevent abuse; and comply with legal, security, and operational obligations.",
      "We may use aggregated or de-identified information to understand platform performance and improve product reliability, provided that the information does not identify a customer or business.",
    ],
  },
  {
    title: "Data Storage and Security",
    body: [
      "InChouf POS uses infrastructure providers, including Supabase for database and authentication services and Vercel for application hosting and deployment. Information may be stored and processed by these providers as needed to operate the platform.",
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information against unauthorized access, loss, misuse, or alteration. No system is perfectly secure, and businesses are responsible for managing authorized users, passwords, devices, and account access within their organization.",
    ],
  },
  {
    title: "Data Sharing and Service Providers",
    body: [
      "We do not sell personal information. We share information only as needed to operate the service, provide integrations requested by a business, comply with law, protect rights and security, or support business transfers such as a merger, acquisition, or reorganization.",
      "Service providers may include hosting, database, authentication, analytics, communications, support, and payment or business-operation providers, depending on the features used by a business. These providers are permitted to process information only for service-related purposes.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "Use of WhatsApp Business features is also subject to Meta's and WhatsApp's applicable terms, policies, and privacy notices. Businesses are responsible for their own communications with customers and for ensuring they have an appropriate legal basis to message customers through WhatsApp.",
      "If a business connects or uses third-party services with InChouf POS, information may be processed by those third parties according to their own terms and privacy policies.",
    ],
  },
  {
    title: "Data Retention and Deletion",
    body: [
      "We retain information for as long as needed to provide InChouf POS, maintain business records, support security and audit requirements, resolve disputes, comply with legal obligations, and enforce agreements.",
      "A business may request deletion or export of its tenant data, subject to legal, security, backup, fraud-prevention, and operational retention requirements. Customer message and order records may also be retained when necessary for legitimate business recordkeeping.",
    ],
  },
  {
    title: "User and Business Rights",
    body: [
      "Depending on location and applicable law, individuals and businesses may have rights to access, correct, export, delete, restrict, or object to certain processing of personal information.",
      "Customers who communicate with a business through WhatsApp should contact that business directly for requests about orders, conversations, or customer records. Business account owners may contact InChouf POS for tenant-level privacy and data requests.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time to reflect product, legal, operational, or security changes. When we make material changes, we will update the last-updated date and provide notice where appropriate.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f6ff] text-[#080c1a]">
      <header className="border-b border-black/8 bg-white/82 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/login" aria-label="InChouf POS sign in" className="flex items-center gap-3">
            <Image
              src="/inchouf-pos-mark.png"
              alt=""
              width={44}
              height={44}
              priority
              className="h-11 w-11 rounded-lg object-contain"
            />
            <div>
              <p className="text-[15px] font-bold leading-tight text-black">InChouf POS</p>
              <p className="text-[12px] font-medium text-black/52">Privacy Policy</p>
            </div>
          </Link>
          <Link
            href="/login"
            className="flex h-10 items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-[14px] font-semibold text-black shadow-sm transition hover:border-black/18 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#22ddeb]/25"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.72fr_0.28fr] lg:gap-10">
        <article className="min-w-0 rounded-lg border border-black/8 bg-white px-5 py-7 shadow-[0_18px_50px_rgba(0,0,0,0.06)] sm:px-8 sm:py-9 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#088e99]">
              Effective {lastUpdated}
            </p>
            <h1 className="mt-4 text-[34px] font-bold leading-[1.08] text-black sm:text-[44px]">
              Privacy Policy
            </h1>
            <p className="mt-5 text-[16px] leading-7 text-black/68">
              This Privacy Policy explains how InChouf POS collects, uses, stores, shares, and
              protects information when businesses use the platform, including the WhatsApp Business
              inbox and related POS features.
            </p>
          </div>

          <div className="mt-9 space-y-9">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-black/8 pt-7">
                <h2 className="text-[22px] font-bold leading-tight text-black">{section.title}</h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[15px] leading-7 text-black/68">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section className="border-t border-black/8 pt-7">
              <h2 className="text-[22px] font-bold leading-tight text-black">Contact</h2>
              <p className="mt-4 text-[15px] leading-7 text-black/68">
                For privacy questions, data requests, or concerns about this policy, contact the
                InChouf POS team at{" "}
                <a
                  href="mailto:privacy@inchouf.com"
                  className="font-semibold text-black underline decoration-[#22ddeb] decoration-2 underline-offset-4"
                >
                  privacy@inchouf.com
                </a>
                .
              </p>
            </section>
          </div>
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-black/8 bg-black px-5 py-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
            <Image
              src="/inchouf-pos-logo.png"
              alt="InChouf POS"
              width={180}
              height={135}
              className="h-auto w-28 object-contain"
            />
            <div className="mt-6 space-y-4 text-[14px] leading-6 text-white/70">
              <p>
                This policy applies to InChouf POS at{" "}
                <span className="font-semibold text-white">https://inchouf.com</span>.
              </p>
              <p>
                WhatsApp data is used to provide messaging and business-management functionality
                for the business account that received the message.
              </p>
              <p className="font-semibold text-[#22ddeb]">
                Customer conversations and phone numbers are not sold.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <footer className="border-t border-black/8 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[13px] text-black/52 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>&copy; 2026 InChouf POS. All rights reserved.</p>
          <p>Last updated: {lastUpdated}</p>
        </div>
      </footer>
    </main>
  );
}
