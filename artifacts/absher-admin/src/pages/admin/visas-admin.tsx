import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListVisas, useCreateVisa, useUpdateVisa, useDeleteVisa, getListVisasQueryKey,
  useListVisaCountries, useListVisaCustomFields, useCreateVisaCustomField, useUpdateVisaCustomField, useDeleteVisaCustomField,
  getListVisaCustomFieldsQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "@/hooks/use-translation";
import { Plus, Edit2, Trash2, X, Globe, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { value: "tourist",  ar: "سياحية",  en: "Tourist" },
  { value: "business", ar: "تجارية",  en: "Business" },
  { value: "medical",  ar: "طبية",    en: "Medical" },
  { value: "visit",    ar: "زيارة",   en: "Visit" },
  { value: "study",    ar: "دراسية",  en: "Study" },
  { value: "umrah",    ar: "عمرة",    en: "Umrah" },
];
const ENTRY_TYPES = [
  { value: "single",   ar: "دخول واحد",   en: "Single" },
  { value: "multiple", ar: "دخول متعدد",  en: "Multiple" },
  { value: "transit",  ar: "عبور",        en: "Transit" },
];
const FIELD_TYPES = [
  { value: "text",     ar: "نص",         en: "Text" },
  { value: "textarea", ar: "نص طويل",    en: "Long text" },
  { value: "number",   ar: "رقم",        en: "Number" },
  { value: "select",   ar: "قائمة",      en: "Select" },
  { value: "boolean",  ar: "نعم/لا",     en: "Yes/No" },
  { value: "date",     ar: "تاريخ",      en: "Date" },
];

// ── Custom Fields Panel ────────────────────────────────────────────────────
function CustomFieldsPanel({ visaId, ar }: { visaId: number; ar: boolean }) {
  const qc = useQueryClient();
  const { data: fields = [] } = useListVisaCustomFields(visaId);
  const createMut = useCreateVisaCustomField();
  const updateMut = useUpdateVisaCustomField();
  const deleteMut = useDeleteVisaCustomField();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ labelAr: "", labelEn: "", fieldType: "text", isRequired: false, options: "", placeholderAr: "", placeholderEn: "", sortOrder: 0 });
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const invalidate = () => qc.invalidateQueries({ queryKey: getListVisaCustomFieldsQueryKey(visaId) });

  async function save() {
    const payload = {
      ...form,
      visaId,
      options: form.options ? form.options.split(",").map(s => s.trim()) : [],
    };
    if (editId !== null) {
      await updateMut.mutateAsync({ id: editId, data: payload as never });
    } else {
      await createMut.mutateAsync({ id: visaId, data: payload as never });
    }
    await invalidate();
    setAdding(false);
    setEditId(null);
    setForm({ labelAr: "", labelEn: "", fieldType: "text", isRequired: false, options: "", placeholderAr: "", placeholderEn: "", sortOrder: 0 });
  }

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{ar ? "الحقول المخصصة" : "Custom Fields"}</span>
        <button onClick={() => { setAdding(true); setEditId(null); }} className="text-xs text-primary hover:underline flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />{ar ? "إضافة حقل" : "Add Field"}
        </button>
      </div>
      {fields.map(f => (
        <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 text-sm">
          <div>
            <span className="font-medium">{ar ? f.labelAr : f.labelEn}</span>
            <span className="mx-2 text-muted-foreground text-xs">({f.fieldType})</span>
            {f.isRequired && <span className="text-xs text-red-500">*</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setEditId(f.id); setAdding(true); setForm({ labelAr: f.labelAr, labelEn: f.labelEn, fieldType: f.fieldType, isRequired: f.isRequired, options: (f.options ?? []).join(", "), placeholderAr: f.placeholderAr ?? "", placeholderEn: f.placeholderEn ?? "", sortOrder: f.sortOrder }); }} className="p-1 hover:bg-white rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={async () => { await deleteMut.mutateAsync({ id: f.id }); invalidate(); }} className="p-1 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}
      {fields.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic">{ar ? "لا توجد حقول مخصصة" : "No custom fields yet"}</p>
      )}
      {adding && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">{ar ? "التسمية عربي" : "Label (Arabic)"}</label>
              <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.labelAr} onChange={e => set("labelAr", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{ar ? "التسمية إنجليزي" : "Label (English)"}</label>
              <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.labelEn} onChange={e => set("labelEn", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{ar ? "نوع الحقل" : "Field Type"}</label>
              <select className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white" value={form.fieldType} onChange={e => set("fieldType", e.target.value)}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{ar ? t.ar : t.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{ar ? "الترتيب" : "Order"}</label>
              <input type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.sortOrder} onChange={e => set("sortOrder", Number(e.target.value))} />
            </div>
            {form.fieldType === "select" && (
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">{ar ? "الخيارات (مفصولة بفاصلة)" : "Options (comma separated)"}</label>
                <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.options} onChange={e => set("options", e.target.value)} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isReq" checked={form.isRequired} onChange={e => set("isRequired", e.target.checked)} className="w-4 h-4" />
              <label htmlFor="isReq" className="text-xs font-medium">{ar ? "مطلوب" : "Required"}</label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setEditId(null); }} className="text-xs text-muted-foreground hover:underline">{ar ? "إلغاء" : "Cancel"}</button>
            <Button size="sm" onClick={save} disabled={!form.labelAr || !form.labelEn}>{ar ? "حفظ" : "Save"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Visa Admin ────────────────────────────────────────────────────────
interface VisaForm {
  countryId: string; countryAr: string; countryEn: string; countryCode: string;
  visaType: string; category: string; fee: number; currency: string;
  processingDays: number; stayDuration: number; validityDays: number;
  entryType: string; isActive: boolean;
  requiresPassportImage: boolean; requiresPersonalPhoto: boolean;
  requiresResidencyImage: boolean; requiresVisaImage: boolean;
  acceptsGccResidency: boolean; acceptsSchengenResidency: boolean;
  acceptsUkResidency: boolean; acceptsUsVisa: boolean;
  descriptionAr: string; descriptionEn: string;
  ineligibleMessageAr: string; ineligibleMessageEn: string;
}
const emptyVisa = (): VisaForm => ({
  countryId: "", countryAr: "", countryEn: "", countryCode: "",
  visaType: "", category: "tourist", fee: 0, currency: "SAR",
  processingDays: 5, stayDuration: 30, validityDays: 90,
  entryType: "single", isActive: true,
  requiresPassportImage: true, requiresPersonalPhoto: true,
  requiresResidencyImage: false, requiresVisaImage: false,
  acceptsGccResidency: true, acceptsSchengenResidency: false,
  acceptsUkResidency: false, acceptsUsVisa: false,
  descriptionAr: "", descriptionEn: "",
  ineligibleMessageAr: "", ineligibleMessageEn: "",
});

function VisaModal({ initial, onSave, onCancel, loading, ar, countries }: {
  initial: VisaForm; onSave: (d: VisaForm) => void; onCancel: () => void; loading: boolean; ar: boolean;
  countries: Array<{ id: number; nameAr: string; nameEn: string; countryCode: string }>;
}) {
  const [form, setForm] = useState(initial);
  const set = <K extends keyof VisaForm>(k: K, v: VisaForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const chk = (k: keyof VisaForm) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.checked as never);

  function handleCountryChange(id: string) {
    const c = countries.find(c => String(c.id) === id);
    set("countryId", id);
    if (c) {
      set("countryAr", c.nameAr);
      set("countryEn", c.nameEn);
      set("countryCode", c.countryCode);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{ar ? "بيانات التأشيرة" : "Visa Details"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">{ar ? "الدولة" : "Country"}</label>
              <select className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white" value={form.countryId} onChange={e => handleCountryChange(e.target.value)}>
                <option value="">{ar ? "-- اختر دولة --" : "-- Select country --"}</option>
                {countries.map(c => <option key={c.id} value={c.id}>{ar ? c.nameAr : c.nameEn}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{ar ? "الاسم عربي" : "Name (AR)"}</label>
                  <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.countryAr} onChange={e => set("countryAr", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{ar ? "الاسم إنجليزي" : "Name (EN)"}</label>
                  <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.countryEn} onChange={e => set("countryEn", e.target.value)} dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{ar ? "الرمز" : "Code"}</label>
                  <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={form.countryCode} onChange={e => set("countryCode", e.target.value)} dir="ltr" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "نوع التأشيرة" : "Visa Type"} *</label>
              <input className="w-full border rounded-xl px-4 py-2.5 text-sm" placeholder={ar ? "مثال: تأشيرة سياحية" : "e.g. Tourist Visa"} value={form.visaType} onChange={e => set("visaType", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "الفئة" : "Category"}</label>
              <select className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white" value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{ar ? c.ar : c.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "الرسوم" : "Fee"} *</label>
              <input type="number" className="w-full border rounded-xl px-4 py-2.5 text-sm" value={form.fee} onChange={e => set("fee", Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "العملة" : "Currency"}</label>
              <select className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white" value={form.currency} onChange={e => set("currency", e.target.value)}>
                {["SAR", "USD", "EUR", "AED"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "أيام المعالجة" : "Processing Days"}</label>
              <input type="number" className="w-full border rounded-xl px-4 py-2.5 text-sm" value={form.processingDays} onChange={e => set("processingDays", Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "مدة الإقامة (يوم)" : "Stay Duration (days)"}</label>
              <input type="number" className="w-full border rounded-xl px-4 py-2.5 text-sm" value={form.stayDuration} onChange={e => set("stayDuration", Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "صلاحية التأشيرة (يوم)" : "Validity (days)"}</label>
              <input type="number" className="w-full border rounded-xl px-4 py-2.5 text-sm" value={form.validityDays} onChange={e => set("validityDays", Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{ar ? "نوع الدخول" : "Entry Type"}</label>
              <select className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white" value={form.entryType} onChange={e => set("entryType", e.target.value)}>
                {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{ar ? t.ar : t.en}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">{ar ? "الوصف بالعربية" : "Description (Arabic)"}</label>
              <textarea rows={2} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none" value={form.descriptionAr} onChange={e => set("descriptionAr", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">{ar ? "الوصف بالإنجليزية" : "Description (English)"}</label>
              <textarea rows={2} className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none" value={form.descriptionEn} onChange={e => set("descriptionEn", e.target.value)} dir="ltr" />
            </div>

            {/* Document requirements */}
            <div className="md:col-span-2">
              <p className="text-sm font-semibold mb-3">{ar ? "المستندات المطلوبة" : "Required Documents"}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "requiresPassportImage", arLabel: "صورة جواز السفر", enLabel: "Passport Image" },
                  { key: "requiresPersonalPhoto", arLabel: "صورة شخصية", enLabel: "Personal Photo" },
                  { key: "requiresResidencyImage", arLabel: "الإقامة", enLabel: "Residency Image" },
                  { key: "requiresVisaImage", arLabel: "تأشيرة بديلة", enLabel: "Alternative Visa" },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <input type="checkbox" checked={form[item.key as keyof VisaForm] as boolean} onChange={chk(item.key as keyof VisaForm)} className="w-4 h-4" />
                    <label className="text-sm">{ar ? item.arLabel : item.enLabel}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Residency acceptance */}
            <div className="md:col-span-2">
              <p className="text-sm font-semibold mb-3">{ar ? "الإقامات المقبولة" : "Accepted Residencies"}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "acceptsGccResidency", arLabel: "الإقامة الخليجية", enLabel: "GCC Residency" },
                  { key: "acceptsSchengenResidency", arLabel: "إقامة شنغن", enLabel: "Schengen Residency" },
                  { key: "acceptsUkResidency", arLabel: "إقامة بريطانيا", enLabel: "UK Residency" },
                  { key: "acceptsUsVisa", arLabel: "تأشيرة أمريكية", enLabel: "US Visa" },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <input type="checkbox" checked={form[item.key as keyof VisaForm] as boolean} onChange={chk(item.key as keyof VisaForm)} className="w-4 h-4" />
                    <label className="text-sm">{ar ? item.arLabel : item.enLabel}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActiveV" checked={form.isActive} onChange={chk("isActive")} className="w-4 h-4" />
              <label htmlFor="isActiveV" className="text-sm font-medium">{ar ? "نشط" : "Active"}</label>
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={() => onSave(form)} disabled={loading || !form.visaType || !form.countryAr}>
            {loading ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VisasAdmin() {
  const { language } = useTranslation();
  const ar = language === "ar";
  const qc = useQueryClient();
  const { data: visas = [], isLoading } = useListVisas();
  const { data: countries = [] } = useListVisaCountries();
  const createMut = useCreateVisa();
  const updateMut = useUpdateVisa();
  const deleteMut = useDeleteVisa();

  const [modal, setModal] = useState<{ mode: "create" | "edit"; id?: number; initial: VisaForm } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function handleSave(form: VisaForm) {
    if (!modal) return;
    const payload = { ...form, countryId: form.countryId ? Number(form.countryId) : null };
    const invalidate = () => qc.invalidateQueries({ queryKey: getListVisasQueryKey() });
    if (modal.mode === "create") {
      await createMut.mutateAsync(payload as never);
    } else {
      await updateMut.mutateAsync({ id: modal.id!, data: payload as never });
    }
    await invalidate();
    setModal(null);
  }

  async function handleDelete(id: number) {
    await deleteMut.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListVisasQueryKey() });
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "إدارة التأشيرات" : "Visa Management"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{ar ? "أنواع التأشيرات والحقول المخصصة" : "Visa types and custom form fields"}</p>
        </div>
        <Button onClick={() => setModal({ mode: "create", initial: emptyVisa() })} className="gap-2">
          <Plus className="w-4 h-4" />
          {ar ? "إضافة تأشيرة" : "Add Visa"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">{ar ? "جارٍ التحميل..." : "Loading..."}</div>
      ) : (
        <div className="space-y-3">
          {visas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-20 text-center">
              <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">{ar ? "لا توجد تأشيرات بعد" : "No visas yet"}</p>
            </div>
          ) : visas.map(v => {
            const isExpanded = expandedId === v.id;
            const cat = CATEGORIES.find(c => c.value === v.category);
            return (
              <div key={v.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                  <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <div className="font-semibold">{v.countryAr} — {v.visaType}</div>
                      <div className="text-xs text-muted-foreground">{v.countryEn} · {ar ? cat?.ar : cat?.en} · {Number(v.fee).toLocaleString()} {v.currency}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${v.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {v.isActive ? (ar ? "نشط" : "Active") : (ar ? "معطل" : "Inactive")}
                    </span>
                    <button onClick={() => setModal({ mode: "edit", id: v.id, initial: { countryId: v.countryId ? String(v.countryId) : "", countryAr: v.countryAr, countryEn: v.countryEn, countryCode: v.countryCode ?? "", visaType: v.visaType, category: v.category ?? "tourist", fee: Number(v.fee), currency: v.currency ?? "SAR", processingDays: v.processingDays, stayDuration: v.stayDuration ?? 30, validityDays: v.validityDays ?? 90, entryType: v.entryType, isActive: v.isActive, requiresPassportImage: v.requiresPassportImage ?? false, requiresPersonalPhoto: v.requiresPersonalPhoto ?? false, requiresResidencyImage: v.requiresResidencyImage ?? false, requiresVisaImage: v.requiresVisaImage ?? false, acceptsGccResidency: v.acceptsGccResidency ?? false, acceptsSchengenResidency: v.acceptsSchengenResidency ?? false, acceptsUkResidency: v.acceptsUkResidency ?? false, acceptsUsVisa: v.acceptsUsVisa ?? false, descriptionAr: v.descriptionAr ?? "", descriptionEn: v.descriptionEn ?? "", ineligibleMessageAr: v.ineligibleMessageAr ?? "", ineligibleMessageEn: v.ineligibleMessageEn ?? "" } })} className="p-2 hover:bg-slate-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirm(v.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border/50">
                    <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-muted-foreground">{ar ? "المعالجة" : "Processing"}</span><div className="font-medium">{v.processingDays} {ar ? "يوم" : "days"}</div></div>
                      <div><span className="text-muted-foreground">{ar ? "مدة الإقامة" : "Stay"}</span><div className="font-medium">{v.stayDuration ?? "—"} {ar ? "يوم" : "days"}</div></div>
                      <div><span className="text-muted-foreground">{ar ? "نوع الدخول" : "Entry"}</span><div className="font-medium">{v.entryType}</div></div>
                      <div><span className="text-muted-foreground">{ar ? "GCC" : "GCC"}</span><div className="font-medium">{v.acceptsGccResidency ? (ar ? "مقبول" : "Accepted") : (ar ? "غير مقبول" : "Not accepted")}</div></div>
                    </div>
                    <CustomFieldsPanel visaId={v.id} ar={ar} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <VisaModal
          initial={modal.initial}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          loading={createMut.isPending || updateMut.isPending}
          ar={ar}
          countries={countries}
        />
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold mb-2">{ar ? "تأكيد الحذف" : "Confirm Delete"}</h3>
            <p className="text-muted-foreground text-sm mb-6">{ar ? "سيتم حذف التأشيرة وجميع حقولها المخصصة." : "This visa and all its custom fields will be deleted."}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{ar ? "إلغاء" : "Cancel"}</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? (ar ? "جارٍ الحذف..." : "Deleting...") : (ar ? "حذف" : "Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
