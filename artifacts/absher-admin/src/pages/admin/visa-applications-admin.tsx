import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListVisaApplications, useUpdateVisaApplication, getListVisaApplicationsQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "@/hooks/use-translation";
import { Search, Filter, Eye, CheckCircle, X, Clock, FileText, Send, Award, Stamp, AlertTriangle, Ban, UploadCloud, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Storage upload helper (matches visas-admin conventions) ────────────────
async function uploadFile(file: File): Promise<string | null> {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch(`${base}/api/storage/uploads`, { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return json.objectPath ?? json.url ?? null;
  } catch {
    return null;
  }
}

const STATUS_META: Record<string, { arLabel: string; enLabel: string; color: string; icon: React.ReactNode }> = {
  received:           { arLabel: "مستلم",             enLabel: "Received",            color: "bg-blue-50 text-blue-700 border-blue-200",     icon: <FileText className="w-3.5 h-3.5" /> },
  under_review:       { arLabel: "قيد المراجعة",      enLabel: "Under Review",        color: "bg-yellow-50 text-yellow-700 border-yellow-200",icon: <Clock className="w-3.5 h-3.5" /> },
  awaiting_documents: { arLabel: "بانتظار وثائق",     enLabel: "Awaiting Docs",       color: "bg-orange-50 text-orange-700 border-orange-200",icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  documents_uploaded: { arLabel: "تم رفع الوثائق",   enLabel: "Docs Uploaded",       color: "bg-purple-50 text-purple-700 border-purple-200",icon: <CheckCircle className="w-3.5 h-3.5" /> },
  sent_to_embassy:    { arLabel: "أُرسل للسفارة",     enLabel: "Sent to Embassy",     color: "bg-indigo-50 text-indigo-700 border-indigo-200",icon: <Send className="w-3.5 h-3.5" /> },
  processing:         { arLabel: "قيد المعالجة",      enLabel: "Processing",          color: "bg-teal-50 text-teal-700 border-teal-200",     icon: <Clock className="w-3.5 h-3.5" /> },
  issued:             { arLabel: "صدرت التأشيرة",     enLabel: "Issued",              color: "bg-green-50 text-green-700 border-green-200",  icon: <Stamp className="w-3.5 h-3.5" /> },
  completed:          { arLabel: "مكتمل",              enLabel: "Completed",           color: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: <Award className="w-3.5 h-3.5" /> },
  rejected:           { arLabel: "مرفوض",              enLabel: "Rejected",            color: "bg-red-50 text-red-700 border-red-200",        icon: <X className="w-3.5 h-3.5" /> },
  cancelled:          { arLabel: "ملغى",               enLabel: "Cancelled",           color: "bg-slate-50 text-slate-600 border-slate-200",  icon: <Ban className="w-3.5 h-3.5" /> },
};

const STATUS_ORDER = ["received","under_review","awaiting_documents","documents_uploaded","sent_to_embassy","processing","issued","completed","rejected","cancelled"];

/** Storage object paths are served by the API at /api/storage/objects/* */
function toDocUrl(url: string): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  if (url.startsWith("/objects/")) return `${base}/api/storage${url}`;
  if (url.startsWith("/api")) return `${base}${url}`;
  return url;
}

function StatusBadge({ status, ar }: { status: string; ar: boolean }) {
  const meta = STATUS_META[status] ?? { arLabel: status, enLabel: status, color: "bg-slate-50 text-slate-700 border-slate-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${meta.color}`}>
      {meta.icon}
      {ar ? meta.arLabel : meta.enLabel}
    </span>
  );
}

function DetailModal({ app, onClose, onUpdate, updating, ar }: {
  app: Record<string, unknown>; onClose: () => void;
  onUpdate: (status: string, notes: string, issuedVisaUrl: string) => void; updating: boolean; ar: boolean;
}) {
  const [status, setStatus] = useState(app.status as string);
  const [notes, setNotes] = useState((app.adminNotes as string) ?? "");
  const [issuedVisaUrl, setIssuedVisaUrl] = useState((app.issuedVisaUrl as string) ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVisaFile = async (file: File) => {
    setUploading(true);
    const path = await uploadFile(file);
    setUploading(false);
    if (path) setIssuedVisaUrl(path);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">{ar ? "تفاصيل الطلب" : "Application Details"}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">{app.trackingNumber as string}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Personal Info */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{ar ? "البيانات الشخصية" : "Personal Information"}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{ar ? "الاسم" : "Full Name"}</span><div className="font-medium">{String(app.fullName ?? "")}</div></div>
              <div><span className="text-muted-foreground">{ar ? "الجنسية" : "Nationality"}</span><div className="font-medium">{String(app.nationality ?? "")}</div></div>
              <div><span className="text-muted-foreground">{ar ? "الجنس" : "Gender"}</span><div className="font-medium">{app.gender === "male" ? (ar ? "ذكر" : "Male") : (ar ? "أنثى" : "Female")}</div></div>
              <div><span className="text-muted-foreground">{ar ? "تاريخ الميلاد" : "Date of Birth"}</span><div className="font-medium">{String(app.dateOfBirth ?? "")}</div></div>
              <div><span className="text-muted-foreground">{ar ? "البريد الإلكتروني" : "Email"}</span><div className="font-medium">{String(app.email ?? "")}</div></div>
              <div><span className="text-muted-foreground">{ar ? "الهاتف" : "Phone"}</span><div className="font-medium">{String(app.phone ?? "")}</div></div>
            </div>
          </div>

          {/* Passport */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{ar ? "بيانات جواز السفر" : "Passport Data"}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{ar ? "رقم الجواز" : "Passport No."}</span><div className="font-mono font-medium">{String(app.passportNumber ?? "")}</div></div>
              <div><span className="text-muted-foreground">{ar ? "تاريخ الإصدار" : "Issue Date"}</span><div className="font-medium">{String(app.passportIssueDate ?? "")}</div></div>
              <div><span className="text-muted-foreground">{ar ? "تاريخ الانتهاء" : "Expiry Date"}</span><div className="font-medium">{String(app.passportExpiryDate ?? "")}</div></div>
              {!!app.passportIssuingCountry && <div><span className="text-muted-foreground">{ar ? "دولة الإصدار" : "Issuing Country"}</span><div className="font-medium">{String(app.passportIssuingCountry)}</div></div>}
            </div>
          </div>

          {/* Documents */}
          {!!(app.passportImageUrl || app.personalPhotoUrl || app.residencyImageUrl) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{ar ? "المستندات" : "Documents"}</h3>
              <div className="flex gap-3 flex-wrap">
                {!!app.passportImageUrl && <a href={toDocUrl(String(app.passportImageUrl))} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><FileText className="w-4 h-4" />{ar ? "صورة الجواز" : "Passport"}</a>}
                {!!app.personalPhotoUrl && <a href={toDocUrl(String(app.personalPhotoUrl))} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><FileText className="w-4 h-4" />{ar ? "الصورة الشخصية" : "Personal Photo"}</a>}
                {!!app.residencyImageUrl && <a href={toDocUrl(String(app.residencyImageUrl))} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><FileText className="w-4 h-4" />{ar ? "الإقامة" : "Residency"}</a>}
              </div>
            </div>
          )}

          {/* Status update */}
          <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">{ar ? "تحديث الحالة" : "Update Status"}</h3>
            <div>
              <label className="block text-sm font-medium mb-2">{ar ? "الحالة" : "Status"}</label>
              <select className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_ORDER.map(s => {
                  const m = STATUS_META[s];
                  return <option key={s} value={s}>{ar ? m.arLabel : m.enLabel}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{ar ? "ملاحظات إدارية" : "Admin Notes"}</label>
              <textarea rows={3} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{ar ? "ستظهر هذه الملاحظة للعميل في التطبيق." : "This note is shown to the client in the app."}</p>
            </div>

            {/* Issued visa file */}
            <div>
              <label className="block text-sm font-medium mb-2">{ar ? "إرفاق ملف التأشيرة" : "Attach Visa File"}</label>
              {issuedVisaUrl ? (
                <div className="flex items-center justify-between gap-3 border rounded-xl px-4 py-2.5 bg-white">
                  <a
                    href={toDocUrl(issuedVisaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#0d2351] font-medium truncate hover:underline"
                  >
                    <Paperclip className="w-4 h-4 shrink-0" />
                    <span className="truncate" dir="ltr">{issuedVisaUrl.split("/").pop()}</span>
                  </a>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-[#0d2351] hover:underline font-medium">
                      {ar ? "استبدال" : "Replace"}
                    </button>
                    <button type="button" onClick={() => setIssuedVisaUrl("")} className="text-xs text-red-500 hover:underline">
                      {ar ? "حذف" : "Remove"}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleVisaFile(f); }} disabled={uploading} />
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-4 text-sm text-muted-foreground cursor-pointer hover:border-[#0d2351]/50 hover:bg-[#0d2351]/5 transition-colors">
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleVisaFile(f); }} disabled={uploading} />
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-[#0d2351]/20 border-t-[#0d2351] rounded-full animate-spin" />{ar ? "جاري الرفع..." : "Uploading..."}</>
                  ) : (
                    <><UploadCloud className="w-4 h-4" />{ar ? "رفع ملف التأشيرة (PDF أو صورة)" : "Upload visa file (PDF or image)"}</>
                  )}
                </label>
              )}
            </div>

            <Button onClick={() => onUpdate(status, notes, issuedVisaUrl)} disabled={updating || uploading} className="w-full">
              {updating ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ وإرسال للعميل" : "Save & Send to Client")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VisaApplicationsAdmin() {
  const { language } = useTranslation();
  const ar = language === "ar";
  const qc = useQueryClient();
  const { data: applications = [], isLoading } = useListVisaApplications();
  const updateMut = useUpdateVisaApplication();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedApp, setSelectedApp] = useState<Record<string, unknown> | null>(null);

  const filtered = applications.filter(a => {
    const matchesSearch = !search ||
      (a.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.trackingNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  async function handleUpdate(status: string, notes: string, issuedVisaUrl: string) {
    if (!selectedApp) return;
    await updateMut.mutateAsync({
      id: selectedApp.id as number,
      data: { status: status as never, adminNotes: notes, issuedVisaUrl: issuedVisaUrl || undefined },
    });
    await qc.invalidateQueries({ queryKey: getListVisaApplicationsQueryKey() });
    setSelectedApp(null);
  }

  const stats = {
    total: applications.length,
    received: applications.filter(a => a.status === "received").length,
    processing: applications.filter(a => ["under_review","sent_to_embassy","processing"].includes(a.status)).length,
    completed: applications.filter(a => a.status === "completed" || a.status === "issued").length,
  };

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold">{ar ? "طلبات التأشيرة" : "Visa Applications"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{ar ? "متابعة وتحديث حالة طلبات التأشيرة" : "Track and update visa application statuses"}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: ar ? "الإجمالي" : "Total", value: stats.total, color: "bg-blue-50 text-blue-700" },
          { label: ar ? "جديدة" : "New", value: stats.received, color: "bg-yellow-50 text-yellow-700" },
          { label: ar ? "قيد المعالجة" : "Processing", value: stats.processing, color: "bg-purple-50 text-purple-700" },
          { label: ar ? "مكتملة" : "Completed", value: stats.completed, color: "bg-green-50 text-green-700" },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-2xl p-4`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border rounded-xl ps-10 pe-4 py-2.5 text-sm bg-white"
            placeholder={ar ? "بحث بالاسم أو رقم التتبع..." : "Search by name or tracking number..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-xl px-4 py-2.5 text-sm bg-white min-w-44"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">{ar ? "كل الحالات" : "All Statuses"}</option>
          {STATUS_ORDER.map(s => {
            const m = STATUS_META[s];
            return <option key={s} value={s}>{ar ? m.arLabel : m.enLabel}</option>;
          })}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">{ar ? "جارٍ التحميل..." : "Loading..."}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-start px-6 py-3 font-medium text-muted-foreground">{ar ? "رقم التتبع" : "Tracking #"}</th>
                <th className="text-start px-6 py-3 font-medium text-muted-foreground">{ar ? "مقدم الطلب" : "Applicant"}</th>
                <th className="text-start px-6 py-3 font-medium text-muted-foreground">{ar ? "الجنسية" : "Nationality"}</th>
                <th className="text-start px-6 py-3 font-medium text-muted-foreground">{ar ? "الحالة" : "Status"}</th>
                <th className="text-start px-6 py-3 font-medium text-muted-foreground">{ar ? "التاريخ" : "Date"}</th>
                <th className="text-start px-6 py-3 font-medium text-muted-foreground">{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <div>{ar ? "لا توجد طلبات" : "No applications found"}</div>
                </td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg">{a.trackingNumber || `#${a.id}`}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{a.fullName}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{a.nationality}</td>
                  <td className="px-6 py-4"><StatusBadge status={a.status} ar={ar} /></td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleDateString(ar ? "ar-SA" : "en-US")}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedApp(a as unknown as Record<string, unknown>)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {ar ? "عرض" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedApp && (
        <DetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={handleUpdate}
          updating={updateMut.isPending}
          ar={ar}
        />
      )}
    </div>
  );
}
