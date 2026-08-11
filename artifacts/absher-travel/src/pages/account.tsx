import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import {
  useListVisaApplications, useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  useListMyBookings, useUpdateProfile, useGetCurrentUser, getGetCurrentUserQueryKey,
  VisaApplication, Notification as ApiNotification, Booking
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/* ── PDF Ticket Generator ── */
function generateFlightTicketHTML(booking: Booking, ar: boolean): string {
  const logo = "ABSHER TRAVEL";
  const date = new Date(booking.createdAt).toLocaleDateString(ar ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const ref = `ABR-${String(booking.id).padStart(6, "0")}`;

  return `<!DOCTYPE html>
<html dir="${ar ? "rtl" : "ltr"}" lang="${ar ? "ar" : "en"}">
<head>
  <meta charset="UTF-8">
  <title>${ar ? "تذكرة حجز" : "Booking Ticket"} — ${ref}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Tajawal',Arial,sans-serif; background:#f1f5f9; padding:24px; color:#1e293b; }
    .ticket { max-width:680px; margin:0 auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.12); }
    .header { background:linear-gradient(135deg,#0d2351 0%,#1a3875 100%); padding:28px 32px; color:#fff; }
    .header-row { display:flex; justify-content:space-between; align-items:center; }
    .logo { font-size:22px; font-weight:900; letter-spacing:-0.5px; }
    .type-badge { background:rgba(200,168,75,.25); color:#c8a84b; border:1px solid rgba(200,168,75,.4); padding:4px 14px; border-radius:20px; font-size:13px; font-weight:700; }
    .ref-block { margin-top:18px; }
    .ref-label { font-size:11px; color:rgba(255,255,255,.5); text-transform:uppercase; letter-spacing:2px; margin-bottom:4px; }
    .ref-number { font-size:28px; font-weight:900; color:#c8a84b; letter-spacing:3px; }
    .divider { display:flex; align-items:center; gap:0; position:relative; }
    .circle-left,.circle-right { width:22px; height:22px; border-radius:50%; background:#f1f5f9; flex-shrink:0; }
    .dashed { flex:1; border-top:2px dashed #e2e8f0; }
    .body { padding:28px 32px; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
    .field label { font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:4px; }
    .field .val { font-size:16px; font-weight:700; color:#0d2351; }
    .status-bar { background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; margin:20px 0; }
    .status-label { font-size:12px; color:#64748b; font-weight:600; }
    .status-val { font-size:14px; font-weight:900; color:#0d2351; }
    .footer { background:#f8fafc; border-top:1.5px dashed #e2e8f0; padding:18px 32px; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#94a3b8; }
    .footer .company { font-weight:700; color:#0d2351; }
    @media print { body{background:#fff;padding:0;} .ticket{box-shadow:none;border-radius:0;} }
  </style>
</head>
<body>
<div class="ticket">
  <div class="header">
    <div class="header-row">
      <span class="logo">${logo}</span>
      <span class="type-badge">${ar ? (booking.type === "flight" ? "رحلة طيران" : booking.type === "hotel" ? "فندق" : booking.type === "program" ? "برنامج سياحي" : "حجز") : (booking.type === "flight" ? "Flight" : booking.type === "hotel" ? "Hotel" : booking.type === "program" ? "Program" : "Booking")}</span>
    </div>
    <div class="ref-block">
      <div class="ref-label">${ar ? "رقم الحجز المرجعي" : "Booking Reference"}</div>
      <div class="ref-number">${ref}</div>
    </div>
  </div>
  <div class="divider"><div class="circle-left"></div><div class="dashed"></div><div class="circle-right"></div></div>
  <div class="body">
    <div class="row">
      <div class="field"><label>${ar ? "اسم العميل" : "Passenger Name"}</label><div class="val">${booking.clientName}</div></div>
      <div class="field"><label>${ar ? "رقم الهاتف" : "Phone"}</label><div class="val" dir="ltr">${booking.clientPhone}</div></div>
    </div>
    <div class="row">
      <div class="field"><label>${ar ? "الوجهة" : "Destination"}</label><div class="val">${booking.destination || "—"}</div></div>
      <div class="field"><label>${ar ? "تاريخ السفر" : "Travel Date"}</label><div class="val">${booking.travelDate || "—"}</div></div>
    </div>
    ${booking.returnDate ? `<div class="row"><div class="field"><label>${ar ? "تاريخ العودة" : "Return Date"}</label><div class="val">${booking.returnDate}</div></div><div class="field"><label>${ar ? "عدد المسافرين" : "Passengers"}</label><div class="val">${(booking.adults || 1) + (booking.children || 0)} ${ar ? "مسافر" : "pax"}</div></div></div>` : ""}
    ${booking.totalPrice ? `<div class="row"><div class="field"><label>${ar ? "السعر الإجمالي" : "Total Price"}</label><div class="val">${Number(booking.totalPrice).toLocaleString()} ${ar ? "ريال" : "SAR"}</div></div><div class="field"></div></div>` : ""}
    <div class="status-bar">
      <span class="status-label">${ar ? "حالة الحجز" : "Booking Status"}</span>
      <span class="status-val">${ar ? (booking.status === "confirmed" ? "✓ مؤكد" : booking.status === "pending" ? "⏳ قيد الانتظار" : "✕ ملغى") : (booking.status === "confirmed" ? "✓ Confirmed" : booking.status === "pending" ? "⏳ Pending" : "✕ Cancelled")}</span>
    </div>
    ${booking.notes ? `<div class="field"><label>${ar ? "ملاحظات" : "Notes"}</label><div class="val" style="font-weight:400;font-size:14px;color:#475569;">${booking.notes}</div></div>` : ""}
  </div>
  <div class="footer">
    <span>${ar ? "تاريخ الإصدار:" : "Issued:"} ${date}</span>
    <span class="company">ABSHER TRAVEL</span>
  </div>
</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1500);};</script>
</body>
</html>`;
}

function downloadTicketPdf(booking: Booking, ar: boolean) {
  // If server-provided ticket URL exists, open it directly
  if ((booking as Booking & { ticketUrl?: string | null }).ticketUrl) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    const url = (booking as Booking & { ticketUrl?: string | null }).ticketUrl!;
    window.open(url.startsWith("/api") ? `${base}${url}` : url, "_blank");
    return;
  }
  // Otherwise generate a printable ticket in a new window
  const html = generateFlightTicketHTML(booking, ar);
  const win = window.open("", "_blank", "width=780,height=700");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText, Bell, User, CheckCheck, Circle, Plane, Building2, MapPin, Shield,
  Camera, Save, Package, AlertCircle, Loader2, Download, Share2, CheckCircle2,
  Clock, Send, TicketCheck,
} from "lucide-react";

/* ── Visa status config ── */
const STATUS_ORDER = [
  "received", "under_review", "awaiting_documents", "documents_uploaded",
  "sent_to_embassy", "processing", "issued", "completed",
];

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  received:             { ar: "تم الاستلام",        en: "Received" },
  under_review:         { ar: "قيد المراجعة",       en: "Under review" },
  awaiting_documents:   { ar: "بانتظار مستندات",    en: "Awaiting documents" },
  documents_uploaded:   { ar: "تم رفع المستندات",   en: "Documents uploaded" },
  sent_to_embassy:      { ar: "أُرسل للسفارة",      en: "Sent to embassy" },
  processing:           { ar: "قيد المعالجة",       en: "Processing" },
  issued:               { ar: "تم الإصدار",         en: "Issued" },
  completed:            { ar: "مكتمل",              en: "Completed" },
  rejected:             { ar: "مرفوض",              en: "Rejected" },
};

/* ── Flight booking status timeline steps ── */
const FLIGHT_STEPS_AR = ["تم الحجز", "تم الدفع", "إصدار التذكرة", "مكتمل"];
const FLIGHT_STEPS_EN = ["Booked", "Paid", "Ticket Issued", "Completed"];

/* ── Visa status timeline steps (condensed) ── */
const VISA_STEPS_AR = ["تقديم الطلب", "مراجعة", "معالجة", "إصدار التأشيرة", "مكتمل"];
const VISA_STEPS_EN = ["Applied", "Review", "Processing", "Visa Issued", "Completed"];

function mapVisaStatusToStep(status: string): number {
  const map: Record<string, number> = {
    received: 0,
    under_review: 1,
    awaiting_documents: 1,
    documents_uploaded: 1,
    sent_to_embassy: 2,
    processing: 2,
    issued: 3,
    completed: 4,
    rejected: -1,
  };
  return map[status] ?? 0;
}

function mapFlightStatusToStep(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    confirmed: 2,
    cancelled: -1,
  };
  return map[status] ?? 0;
}

/* ── Horizontal status timeline ── */
function StatusTimeline({
  steps, currentStep, ar, rejected,
}: {
  steps: string[];
  currentStep: number;
  ar: boolean;
  rejected?: boolean;
}) {
  if (rejected) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
        <span className="text-xs font-bold text-red-500">{ar ? "مرفوض" : "Rejected"}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 w-full overflow-x-auto">
      <div className="flex items-center min-w-max gap-0" dir="ltr">
        {steps.map((step, i) => {
          const done = i <= currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black transition-all
                  ${done ? (active ? "bg-[#c8a84b] text-white shadow-sm" : "bg-[#0d2351] text-white") : "bg-slate-100 text-slate-400"}`}>
                  {done && !active ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span className={`text-[9px] font-semibold whitespace-nowrap max-w-[56px] text-center leading-tight
                  ${active ? "text-[#c8a84b]" : done ? "text-[#0d2351]" : "text-slate-300"}`}>
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 mb-4 rounded-full transition-all ${i < currentStep ? "bg-[#0d2351]" : "bg-slate-100"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Visa StatusStepper (detailed) ── */
function StatusStepper({ status, language }: { status: string; language: string }) {
  const ar = language === "ar";
  if (status === "rejected") {
    return <Badge variant="destructive" className="mt-2">{ar ? STATUS_LABELS.rejected.ar : STATUS_LABELS.rejected.en}</Badge>;
  }
  const currentIndex = STATUS_ORDER.indexOf(status);
  return (
    <div className="mt-2">
      <StatusTimeline
        steps={ar ? VISA_STEPS_AR : VISA_STEPS_EN}
        currentStep={mapVisaStatusToStep(status)}
        ar={ar}
        rejected={status === "rejected"}
      />
    </div>
  );
}

function ApplicationCard({ app, language }: { app: VisaApplication; language: string }) {
  const ar = language === "ar";
  const currentIdx = STATUS_ORDER.indexOf(app.status);
  const isCompleted = app.status === "completed" || app.status === "issued";
  const isRejected = app.status === "rejected";

  return (
    <Card className={`border rounded-2xl overflow-hidden transition-all hover:shadow-md ${isCompleted ? "border-emerald-200" : isRejected ? "border-red-200" : "border-slate-200 hover:border-[#0d2351]/30"}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className={`px-5 py-3 flex items-center justify-between ${isCompleted ? "bg-emerald-50" : isRejected ? "bg-red-50" : "bg-gradient-to-r from-[#0d2351]/5 to-transparent"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? "bg-emerald-100" : isRejected ? "bg-red-100" : "bg-[#0d2351]/10"}`}>
              <Shield className={`w-5 h-5 ${isCompleted ? "text-emerald-600" : isRejected ? "text-red-500" : "text-[#0d2351]"}`} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">
                {ar ? "طلب تأشيرة" : "Visa Application"} #{app.id}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{app.fullName} · {app.nationality}</div>
            </div>
          </div>
          <div className="text-end">
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              isCompleted ? "bg-emerald-100 text-emerald-700" :
              isRejected  ? "bg-red-100 text-red-700" :
              "bg-[#0d2351]/10 text-[#0d2351]"
            }`}>
              {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : isRejected ? null : <Clock className="w-3 h-3" />}
              {ar ? STATUS_LABELS[app.status]?.ar : STATUS_LABELS[app.status]?.en}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{new Date(app.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Progress timeline */}
        <div className="px-5 pb-4">
          <StatusStepper status={app.status} language={language} />
        </div>
      </CardContent>
    </Card>
  );
}

function BookingCard({ booking, language, onToast }: {
  booking: Booking;
  language: string;
  onToast: (msg: string) => void;
}) {
  const ar = language === "ar";

  const typeLabels = {
    flight: { ar: "رحلة طيران", en: "Flight", icon: Plane },
    hotel:  { ar: "فندق",       en: "Hotel",  icon: Building2 },
    program:{ ar: "برنامج سياحي",en: "Program",icon: MapPin },
    visa:   { ar: "تأشيرة",     en: "Visa",   icon: Shield },
  };

  const statusConfig = {
    pending:   { ar: "قيد الانتظار", en: "Pending",   color: "bg-amber-100 text-amber-700",   step: 0 },
    confirmed: { ar: "مؤكد",         en: "Confirmed", color: "bg-emerald-100 text-emerald-700", step: 2 },
    cancelled: { ar: "ملغى",         en: "Cancelled", color: "bg-red-100 text-red-700",        step: -1 },
  };

  const typeInfo  = typeLabels[booking.type as keyof typeof typeLabels]   || { ar: booking.type, en: booking.type, icon: Package };
  const statusInfo = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending;
  const TypeIcon  = typeInfo.icon;
  const isFlightBooking = booking.type === "flight";
  const isVisa = booking.type === "visa";
  const flightStep = mapFlightStatusToStep(booking.status);
  const visaStep = 0; // basic bookings don't have detailed visa status
  const cancelled = booking.status === "cancelled";

  const handleDownload = () => {
    downloadTicketPdf(booking, ar);
  };

  const handleWhatsapp = () => {
    const bookingText = encodeURIComponent(
      ar
        ? `مرحباً، أريد الاستفسار عن حجزي رقم #${booking.id} — ${ar ? typeInfo.ar : typeInfo.en}`
        : `Hello, I'd like to inquire about my booking #${booking.id} — ${typeInfo.en}`
    );
    window.open(`https://wa.me/?text=${bookingText}`, "_blank");
  };

  return (
    <Card className={`border rounded-2xl overflow-hidden transition-all hover:shadow-md ${cancelled ? "border-red-200 opacity-80" : "border-slate-200 hover:border-[#0d2351]/30"}`}>
      <CardContent className="p-0">
        {/* Header row */}
        <div className="px-5 py-3 flex items-center justify-between bg-gradient-to-r from-[#0d2351]/4 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0d2351]/8 border border-[#0d2351]/10 rounded-xl flex items-center justify-center shrink-0">
              <TypeIcon className="w-5 h-5 text-[#0d2351]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">
                  {ar ? typeInfo.ar : typeInfo.en} #{booking.id}
                </span>
                <Badge variant="outline" className={`border-0 text-xs px-2 py-0.5 ${statusInfo.color}`}>
                  {ar ? statusInfo.ar : statusInfo.en}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {booking.destination || booking.clientName || (ar ? "حجز" : "Booking")}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 text-end whitespace-nowrap">
            {new Date(booking.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Timeline for flight bookings */}
        {isFlightBooking && !cancelled && (
          <div className="px-5 pb-3">
            <StatusTimeline
              steps={ar ? FLIGHT_STEPS_AR : FLIGHT_STEPS_EN}
              currentStep={flightStep}
              ar={ar}
            />
          </div>
        )}

        {/* Timeline for visa bookings */}
        {isVisa && !cancelled && (
          <div className="px-5 pb-3">
            <StatusTimeline
              steps={ar ? VISA_STEPS_AR : VISA_STEPS_EN}
              currentStep={visaStep}
              ar={ar}
            />
          </div>
        )}

        {/* Action buttons for flight bookings */}
        {isFlightBooking && !cancelled && (
          <div className="px-5 pb-4 flex gap-2 flex-wrap">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#0d2351]/20 bg-[#0d2351]/5 hover:bg-[#0d2351]/10 text-[#0d2351] text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              {ar ? "تحميل التذكرة" : "Download Ticket"}
            </button>
            <button
              onClick={handleWhatsapp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              {ar ? "مشاركة عبر واتساب" : "Share via WhatsApp"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationRow({ n, language, onRead }: { n: ApiNotification; language: string; onRead: (id: string) => void }) {
  const ar = language === "ar";
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${n.isRead ? "border-slate-100 bg-white" : "border-[#0d2351]/20 bg-[#0d2351]/5 hover:border-[#0d2351]/30"}`}>
      {!n.isRead ? <Circle className="h-2 w-2 mt-1.5 fill-[#0d2351] text-[#0d2351] shrink-0" /> : <div className="w-2 shrink-0" />}
      <div className="flex-1">
        <div className="font-medium text-slate-800 text-sm">{ar ? n.titleAr : n.titleEn}</div>
        <div className="text-sm text-slate-500 mt-0.5">{ar ? n.messageAr : n.messageEn}</div>
        <div className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
      </div>
      {!n.isRead && (
        <Button variant="ghost" size="sm" onClick={() => onRead(n.id)}>
          {ar ? "تحديد كمقروء" : "Mark read"}
        </Button>
      )}
    </div>
  );
}

const getDisplayUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith('/api')) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}${url}`;
  }
  return url;
};

async function uploadFileDirect(file: File): Promise<{ objectPath: string } | null> {
  const formData = new FormData();
  formData.append("file", file);
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const res = await fetch(`${base}/api/storage/uploads`, { method: "POST", body: formData });
  if (!res.ok) return null;
  return res.json();
}

function ProfileFileUpload({ label, value, onChange }: { label: string; value?: string | null; onChange: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  return (
    <div>
      <Label className="text-sm font-semibold">{label}</Label>
      {value ? (
        <div className="flex items-center gap-3 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <img src={getDisplayUrl(value)} className="h-16 w-16 object-cover rounded-lg border bg-white" />
          <div className="flex-1 min-w-0"><p className="text-xs text-slate-400 truncate" dir="ltr">{value.split('/').pop()}</p></div>
          <Button variant="outline" size="sm" onClick={() => onChange("")}>إزالة</Button>
        </div>
      ) : (
        <label className="mt-2 flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-[#0d2351]/5 hover:border-[#0d2351]/40 transition-colors text-sm text-slate-500">
          <input type="file" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            setIsUploading(true);
            const r = await uploadFileDirect(f);
            setIsUploading(false);
            if (r) onChange(r.objectPath);
          }} disabled={isUploading} />
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-[#0d2351]" /> : <Camera className="h-5 w-5 text-slate-400" />}
          <span className="font-medium">{isUploading ? "جاري الرفع..." : "اختر ملفاً"}</span>
        </label>
      )}
    </div>
  );
}

type RequestTab = "all" | "visas" | "flights" | "hotels" | "programs";

export default function Account() {
  const { language } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ar = language === "ar";

  const { data: applications, isLoading: appsLoading } = useListVisaApplications();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings();
  const { data: notifications, isLoading: notifsLoading } = useListNotifications();
  const { data: currentUserData } = useGetCurrentUser({ query: { staleTime: 0, queryKey: getGetCurrentUserQueryKey() } });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [activeSubTab, setActiveSubTab] = useState<RequestTab>("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>({});

  const authUser = currentUserData || user;

  useEffect(() => {
    if (authUser) {
      setProfile({
        firstName: authUser.firstName || "",
        lastName: authUser.lastName || "",
        email: authUser.email || "",
        phone: authUser.phone || "",
        whatsapp: authUser.whatsapp || "",
        address: authUser.address || "",
        nationality: authUser.nationality || "",
        gender: authUser.gender || "male",
        dateOfBirth: authUser.dateOfBirth || "",
        passportNumber: authUser.passportNumber || "",
        passportIssueCountry: authUser.passportIssueCountry || "",
        passportIssuePlace: authUser.passportIssuePlace || "",
        passportIssueDate: authUser.passportIssueDate || "",
        passportExpiryDate: authUser.passportExpiryDate || "",
        passportImageUrl: authUser.passportImageUrl || "",
        isGccResident: authUser.isGccResident || false,
        gccResidenceCountry: authUser.gccResidenceCountry || "",
        gccResidenceNumber: authUser.gccResidenceNumber || "",
        gccResidenceExpiry: authUser.gccResidenceExpiry || "",
        gccResidenceFrontUrl: authUser.gccResidenceFrontUrl || "",
        gccResidenceBackUrl: authUser.gccResidenceBackUrl || "",
        profilePhotoUrl: authUser.profilePhotoUrl || "",
      });
    }
  }, [authUser]);

  const updateProfileMutation = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        toast({ title: ar ? "تم التحديث بنجاح" : "Profile Updated", description: ar ? "تم حفظ بيانات الملف الشخصي" : "Your profile has been saved." });
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        toast({ variant: "destructive", title: ar ? "خطأ" : "Error", description: err.message || (ar ? "فشل تحديث الملف الشخصي" : "Failed to update profile.") });
      }
    }
  });

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ data: profile });
  };

  const keyFields = ["firstName", "lastName", "phone", "nationality", "dateOfBirth", "passportNumber", "passportExpiryDate", "profilePhotoUrl"];
  const completedKeyFields = keyFields.filter(k => !!profile[k]).length;
  const completionPercentage = Math.round((completedKeyFields / keyFields.length) * 100);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const allItems = [
    ...(applications || []).map(a => ({ ...a, _itemType: 'app', date: new Date(a.createdAt).getTime() })),
    ...(bookings || []).map(b => ({ ...b, _itemType: 'booking', date: new Date(b.createdAt).getTime() }))
  ].sort((a, b) => b.date - a.date);

  const filteredItems = allItems.filter(item => {
    if (activeSubTab === "all") return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookingType = item._itemType === "booking" ? (item as any).type as string : undefined;
    if (activeSubTab === "visas") return item._itemType === "app" || bookingType === "visa";
    if (activeSubTab === "flights") return bookingType === "flight";
    if (activeSubTab === "hotels") return bookingType === "hotel";
    if (activeSubTab === "programs") return bookingType === "program";
    return true;
  });

  const REQUEST_TABS: { id: RequestTab; ar: string; en: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "all",      ar: "جميع الطلبات",   en: "All Requests", icon: Package },
    { id: "visas",    ar: "تأشيرات",         en: "Visas",        icon: Shield },
    { id: "flights",  ar: "رحلات طيران",    en: "Flights",      icon: Plane },
    { id: "hotels",   ar: "فنادق",           en: "Hotels",       icon: Building2 },
    { id: "programs", ar: "برامج سياحية",   en: "Programs",     icon: MapPin },
  ];

  const isLoadingRequests = appsLoading || bookingsLoading;

  const showToast = (msg: string) => {
    toast({ title: msg });
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10" dir={ar ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Profile header */}
        <div className="flex items-center gap-5 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-white shadow-md">
              <AvatarImage src={getDisplayUrl(profile.profilePhotoUrl)} />
              <AvatarFallback className="bg-[#0d2351]/10 text-[#0d2351] text-2xl font-bold">
                {(authUser?.firstName?.[0] || authUser?.email?.[0] || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-800">
              {authUser?.firstName ? `${authUser.firstName} ${authUser.lastName ?? ""}` : (ar ? "حسابي" : "My Account")}
            </h1>
            <p className="text-slate-500 font-medium">{authUser?.email ?? authUser?.phone}</p>
          </div>
          {/* Stats summary */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center px-4 border-s border-slate-100">
              <div className="text-2xl font-black text-[#0d2351]">{(applications?.length ?? 0) + (bookings?.length ?? 0)}</div>
              <div className="text-xs text-slate-400 font-medium">{ar ? "إجمالي الطلبات" : "Total Requests"}</div>
            </div>
            <div className="text-center px-4 border-s border-slate-100">
              <div className="text-2xl font-black text-[#c8a84b]">{completionPercentage}%</div>
              <div className="text-xs text-slate-400 font-medium">{ar ? "اكتمال الملف" : "Profile"}</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="bg-white border mb-6 flex-wrap h-auto p-1.5 shadow-sm rounded-xl">
            <TabsTrigger value="requests" className="gap-2 rounded-lg py-2.5">
              <TicketCheck size={16} />{ar ? "طلباتي" : "My Requests"}
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 rounded-lg py-2.5">
              <User size={16} />{ar ? "ملفي الشخصي" : "Profile"}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 rounded-lg py-2.5">
              <Bell size={16} />{ar ? "الإشعارات" : "Notifications"}
              {unreadCount > 0 && (
                <Badge className="ml-1 rtl:mr-1 rtl:ml-0 bg-[#c8a84b] text-white px-1.5 min-w-[20px] h-5 flex items-center justify-center border-0">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Requests tab ── */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {REQUEST_TABS.map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id as RequestTab)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold transition-all shadow-sm
                      ${activeSubTab === tab.id
                        ? "bg-[#0d2351] text-white scale-[1.02]"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {ar ? tab.ar : tab.en}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              {isLoadingRequests && (
                <div className="text-slate-400 text-center py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0d2351]/40" />
                  <span className="font-medium">{ar ? "جاري التحميل..." : "Loading..."}</span>
                </div>
              )}
              {!isLoadingRequests && filteredItems.length === 0 && (
                <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">{ar ? "لا توجد طلبات هنا" : "No requests found"}</h3>
                  <p className="text-sm">{ar ? "لم تقم بأي حجوزات أو طلبات في هذا القسم بعد." : "You haven't made any bookings in this category yet."}</p>
                </div>
              )}
              {filteredItems.map(item =>
                item._itemType === "app" ? (
                  <ApplicationCard key={`app-${item.id}`} app={item as VisaApplication} language={language} />
                ) : (
                  <BookingCard key={`booking-${item.id}`} booking={item as Booking} language={language} onToast={showToast} />
                )
              )}
            </div>
          </TabsContent>

          {/* ── Profile tab ── */}
          <TabsContent value="profile" className="space-y-6">
            {/* Completion card */}
            <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800">{ar ? "اكتمال الملف الشخصي" : "Profile Completion"}</h4>
                    {completionPercentage < 100 && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {ar ? "يرجى إكمال البيانات الأساسية لضمان سرعة معالجة طلباتك." : "Please complete key details for faster processing."}
                      </p>
                    )}
                  </div>
                  <div className="text-right rtl:text-left">
                    <span className="text-2xl font-black text-[#0d2351]">{completionPercentage}%</span>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{completedKeyFields}/8 {ar ? "حقول مكتملة" : "completed"}</div>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#0d2351] h-full transition-all duration-700 rounded-full" style={{ width: `${completionPercentage}%` }} />
                </div>
              </CardContent>
            </Card>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Avatar */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-6">
                <div className="relative shrink-0">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-md">
                    <AvatarImage src={getDisplayUrl(profile.profilePhotoUrl)} />
                    <AvatarFallback className="bg-[#0d2351]/10 text-[#0d2351] text-2xl font-bold">
                      {(profile.firstName?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-[#0d2351] text-white p-2 rounded-full cursor-pointer hover:bg-[#0d2351]/90 shadow-lg transition-transform hover:scale-105">
                    {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <input type="file" className="hidden" accept="image/*" onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setIsUploadingAvatar(true);
                      const r = await uploadFileDirect(f);
                      setIsUploadingAvatar(false);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      if (r) setProfile((p: any) => ({ ...p, profilePhotoUrl: r.objectPath }));
                    }} disabled={isUploadingAvatar} />
                  </label>
                </div>
                <div className="text-center md:text-start rtl:md:text-right">
                  <h3 className="font-bold text-lg text-slate-800">{ar ? "صورة الملف الشخصي" : "Profile Photo"}</h3>
                  <p className="text-sm text-slate-500 mt-1">{ar ? "اختر صورة شخصية واضحة (يُفضل بخلفية بيضاء للطلبات الرسمية)" : "Choose a clear personal photo (white background preferred for official requests)"}</p>
                </div>
              </div>

              {/* Basic info */}
              <div className="p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">{ar ? "المعلومات الأساسية" : "Basic Information"}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "الاسم الأول" : "First Name"} *</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "اسم العائلة" : "Last Name"} *</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-500">{ar ? "البريد الإلكتروني" : "Email"}</Label>
                    <Input value={profile.email} disabled className="bg-slate-100 text-slate-500 cursor-not-allowed border-dashed" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "رقم الهاتف" : "Phone"} *</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "رقم الواتساب" : "WhatsApp"}</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.whatsapp} onChange={e => setProfile({...profile, whatsapp: e.target.value})} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "الجنسية" : "Nationality"} *</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.nationality} onChange={e => setProfile({...profile, nationality: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "تاريخ الميلاد" : "Date of Birth"} *</Label>
                    <Input type="date" className="bg-slate-50 focus:bg-white" value={profile.dateOfBirth?.split('T')[0] || ""} onChange={e => setProfile({...profile, dateOfBirth: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "الجنس" : "Gender"}</Label>
                    <Select value={profile.gender} onValueChange={v => setProfile({...profile, gender: v})}>
                      <SelectTrigger className="bg-slate-50 focus:bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{ar ? "ذكر" : "Male"}</SelectItem>
                        <SelectItem value="female">{ar ? "أنثى" : "Female"}</SelectItem>
                        <SelectItem value="other">{ar ? "آخر" : "Other"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-semibold">{ar ? "العنوان" : "Address"}</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Passport */}
              <div className="border-t border-slate-100 p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> {ar ? "بيانات الجواز" : "Passport Details"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-semibold">{ar ? "رقم الجواز" : "Passport Number"} *</Label>
                    <Input className="bg-slate-50 focus:bg-white uppercase" value={profile.passportNumber} onChange={e => setProfile({...profile, passportNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "دولة الإصدار" : "Issue Country"}</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.passportIssueCountry} onChange={e => setProfile({...profile, passportIssueCountry: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "مكان الإصدار" : "Issue Place"}</Label>
                    <Input className="bg-slate-50 focus:bg-white" value={profile.passportIssuePlace} onChange={e => setProfile({...profile, passportIssuePlace: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "تاريخ الإصدار" : "Issue Date"}</Label>
                    <Input type="date" className="bg-slate-50 focus:bg-white" value={profile.passportIssueDate?.split('T')[0] || ""} onChange={e => setProfile({...profile, passportIssueDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">{ar ? "تاريخ الانتهاء" : "Expiry Date"} *</Label>
                    <Input type="date" className="bg-slate-50 focus:bg-white" value={profile.passportExpiryDate?.split('T')[0] || ""} onChange={e => setProfile({...profile, passportExpiryDate: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2 mt-2">
                    <ProfileFileUpload label={ar ? "صورة الجواز (الصفحة الأولى)" : "Passport Image (Bio Page)"} value={profile.passportImageUrl} onChange={v => setProfile({...profile, passportImageUrl: v})} />
                  </div>
                </div>
              </div>

              {/* GCC */}
              <div className="border-t border-slate-100 p-6 bg-slate-50/30">
                <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0d2351]/40 transition-colors mb-6 shadow-sm">
                  <Checkbox checked={profile.isGccResident} onCheckedChange={(c) => setProfile({...profile, isGccResident: !!c})} className="scale-110" />
                  <div className="font-bold text-slate-800">{ar ? "أنا مقيم في دول مجلس التعاون الخليجي" : "I am a GCC Resident"}</div>
                </label>

                {profile.isGccResident && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-2">
                      <Label className="font-semibold">{ar ? "دولة الإقامة" : "Residence Country"}</Label>
                      <Input className="bg-white focus:bg-white" value={profile.gccResidenceCountry} onChange={e => setProfile({...profile, gccResidenceCountry: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">{ar ? "رقم الإقامة" : "Residence Number"}</Label>
                      <Input className="bg-white focus:bg-white" value={profile.gccResidenceNumber} onChange={e => setProfile({...profile, gccResidenceNumber: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="font-semibold">{ar ? "تاريخ الانتهاء" : "Expiry Date"}</Label>
                      <Input type="date" className="bg-white focus:bg-white" value={profile.gccResidenceExpiry?.split('T')[0] || ""} onChange={e => setProfile({...profile, gccResidenceExpiry: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <ProfileFileUpload label={ar ? "الوجه الأمامي للإقامة" : "Residence Front Image"} value={profile.gccResidenceFrontUrl} onChange={v => setProfile({...profile, gccResidenceFrontUrl: v})} />
                    </div>
                    <div className="space-y-2">
                      <ProfileFileUpload label={ar ? "الوجه الخلفي للإقامة" : "Residence Back Image"} value={profile.gccResidenceBackUrl} onChange={v => setProfile({...profile, gccResidenceBackUrl: v})} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-6 flex justify-end z-10">
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="h-14 px-10 rounded-2xl shadow-lg shadow-[#0d2351]/25 hover:shadow-xl hover:shadow-[#0d2351]/30 transition-all font-bold text-lg gap-3 text-white bg-[#0d2351] hover:bg-[#0d2351]/90"
              >
                {updateProfileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {ar ? "حفظ التغييرات" : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* ── Notifications tab ── */}
          <TabsContent value="notifications" className="space-y-4">
            {(notifications?.length ?? 0) > 0 && (
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="gap-2 bg-white rounded-xl shadow-sm" onClick={() => markAllRead.mutate()}>
                  <CheckCheck size={14} /> {ar ? "تحديد الكل كمقروء" : "Mark all as read"}
                </Button>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
              {notifsLoading && (
                <div className="text-slate-400 text-center py-16 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0d2351]/40" />
                  <span className="font-medium">{ar ? "جاري التحميل..." : "Loading..."}</span>
                </div>
              )}
              {!notifsLoading && (notifications?.length ?? 0) === 0 && (
                <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">{ar ? "لا توجد إشعارات" : "No notifications"}</h3>
                  <p className="text-sm">{ar ? "أنت على اطلاع بكل شيء، لا جديد حالياً." : "You're all caught up!"}</p>
                </div>
              )}
              {notifications?.map((n) => (
                <NotificationRow key={n.id} n={n} language={language} onRead={(id) => markRead.mutate({ id })} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
