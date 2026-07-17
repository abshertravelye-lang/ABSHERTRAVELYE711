import { useState, useMemo } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useListVisas, Visa } from "@workspace/api-client-react";
import { VisaApplicationWizard } from "@/components/visa-application-wizard";
import {
  Clock, CreditCard, Search, Filter, Globe, Calendar,
  ArrowRight, CheckCircle, Shield, Zap, Award, ChevronRight,
  FileCheck, Plane, Building2
} from "lucide-react";

/* ─── Category meta ─── */
const CATEGORY_META: Record<string, { ar: string; en: string; icon: React.ReactNode; color: string }> = {
  tourist:  { ar: "سياحية",  en: "Tourist",  icon: <Plane className="w-3.5 h-3.5" />,    color: "bg-sky-100 text-sky-700 border-sky-200" },
  business: { ar: "تجارية",  en: "Business", icon: <Building2 className="w-3.5 h-3.5" />, color: "bg-violet-100 text-violet-700 border-violet-200" },
  medical:  { ar: "طبية",    en: "Medical",  icon: <Shield className="w-3.5 h-3.5" />,    color: "bg-rose-100 text-rose-700 border-rose-200" },
  visit:    { ar: "زيارة",   en: "Visit",    icon: <Globe className="w-3.5 h-3.5" />,     color: "bg-teal-100 text-teal-700 border-teal-200" },
  study:    { ar: "دراسية",  en: "Study",    icon: <Award className="w-3.5 h-3.5" />,     color: "bg-amber-100 text-amber-700 border-amber-200" },
  umrah:    { ar: "عمرة",    en: "Umrah",    icon: <CheckCircle className="w-3.5 h-3.5" />,color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const ENTRY_LABELS: Record<string, { ar: string; en: string }> = {
  single:   { ar: "دخول واحد",   en: "Single" },
  multiple: { ar: "دخول متعدد",  en: "Multiple" },
  transit:  { ar: "عبور",        en: "Transit" },
};

/* ─── Stats bar ─── */
function StatsBar({ ar }: { ar: boolean }) {
  const stats = [
    { icon: <Zap className="w-5 h-5" />,         num: "+50",  ar: "دولة متاحة",           en: "Countries" },
    { icon: <Clock className="w-5 h-5" />,        num: "48h",  ar: "متوسط وقت المعالجة",   en: "Avg. Processing" },
    { icon: <CheckCircle className="w-5 h-5" />,  num: "99%",  ar: "نسبة القبول",           en: "Approval Rate" },
    { icon: <Shield className="w-5 h-5" />,       num: "100%", ar: "معلوماتك آمنة",         en: "Data Secure" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {stats.map((s, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#0d2351]/8 flex items-center justify-center text-[#0d2351]">{s.icon}</div>
          <div>
            <div className="text-xl font-black text-[#0d2351]">{s.num}</div>
            <div className="text-xs text-slate-500 font-medium">{ar ? s.ar : s.en}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Visa card ─── */
function VisaCard({ visa, ar, onApply }: { visa: Visa; ar: boolean; onApply: () => void }) {
  const cat = CATEGORY_META[visa.category ?? "tourist"] ?? CATEGORY_META.tourist;
  const entry = ENTRY_LABELS[visa.entryType] ?? { ar: visa.entryType, en: visa.entryType };
  const country = ar ? visa.countryAr : visa.countryEn;

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="relative bg-gradient-to-br from-[#0d2351] to-[#1a3875] px-6 pt-6 pb-10">
        <div className="flex items-start justify-between">
          {/* Flag / image */}
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg shrink-0 bg-white/10 flex items-center justify-center">
            {visa.imageUrl ? (
              <img src={visa.imageUrl} alt={country} className="w-full h-full object-cover" />
            ) : visa.countryCode ? (
              <span className={`fi fi-${visa.countryCode.toLowerCase()} text-3xl`} />
            ) : (
              <Globe className="w-7 h-7 text-white/60" />
            )}
          </div>

          {/* Category badge */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cat.color}`}>
            {cat.icon}
            {ar ? cat.ar : cat.en}
          </span>
        </div>

        <div className="mt-4">
          <h3 className="text-white font-black text-xl leading-tight">{country}</h3>
          <p className="text-[#c8a84b] text-sm font-semibold mt-0.5">{visa.visaType}</p>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="mx-4 -mt-6 bg-white rounded-xl border border-slate-100 shadow-md grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 text-center">
        <div className="px-2 py-3">
          <div className="text-[#0d2351] font-black text-base">{visa.processingDays}</div>
          <div className="text-slate-400 text-[10px] font-medium leading-tight">{ar ? "أيام\nمعالجة" : "Processing\nDays"}</div>
        </div>
        <div className="px-2 py-3">
          <div className="text-[#0d2351] font-black text-base">{Number(visa.fee).toLocaleString()}</div>
          <div className="text-slate-400 text-[10px] font-medium">{visa.currency}</div>
        </div>
        <div className="px-2 py-3">
          <div className="text-[#0d2351] font-black text-base">{visa.stayDuration ?? "—"}</div>
          <div className="text-slate-400 text-[10px] font-medium">{ar ? "يوم إقامة" : "Stay Days"}</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-5 pb-4 flex-1 space-y-3">
        {/* Entry type + validity */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-full">
            <FileCheck className="w-3 h-3" />
            {ar ? entry.ar : entry.en}
          </span>
          {visa.validityDays && (
            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-full">
              <Calendar className="w-3 h-3" />
              {ar ? `صلاحية ${visa.validityDays} يوم` : `Valid ${visa.validityDays}d`}
            </span>
          )}
          {visa.acceptsGccResidency && (
            <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" />
              {ar ? "مقيم خليج" : "GCC OK"}
            </span>
          )}
        </div>

        {/* Description / requirements */}
        {(visa.descriptionAr || visa.descriptionEn || visa.requirements) && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {ar
              ? (visa.descriptionAr || visa.descriptionEn || visa.requirements)
              : (visa.descriptionEn || visa.descriptionAr || visa.requirements)}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={onApply}
          className="w-full bg-[#0d2351] hover:bg-[#c8a84b] text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-[#0d2351]/20"
        >
          {ar ? "قدّم الآن" : "Apply Now"}
          {ar ? <ArrowRight className="w-4 h-4 rotate-180" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-32 bg-slate-200" />
      <div className="mx-4 -mt-6 bg-slate-100 rounded-xl h-16" />
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
      </div>
      <div className="px-5 pb-5">
        <div className="h-11 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Visas() {
  const { language } = useTranslation();
  const ar = language === "ar";
  const { data: visas, isLoading } = useListVisas();
  const [selectedVisa, setSelectedVisa] = useState<Visa | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    if (!visas) return [];
    const seen = new Set<string>();
    visas.forEach(v => v.category && seen.add(v.category));
    return Array.from(seen);
  }, [visas]);

  const filtered = useMemo(() => {
    if (!visas) return [];
    return visas.filter(v => {
      const name = ar ? v.countryAr : v.countryEn;
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "all" || v.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [visas, search, activeCategory, ar]);

  return (
    <div className="min-h-screen bg-slate-50" dir={ar ? "rtl" : "ltr"}>
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-[#0d2351] via-[#162d5e] to-[#0d2351] overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-[#c8a84b]/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative container mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-[#c8a84b]/20 text-[#c8a84b] text-sm font-semibold px-4 py-1.5 rounded-full mb-5 border border-[#c8a84b]/30">
            <Globe className="w-4 h-4" />
            {ar ? "خدمات التأشيرات" : "Visa Services"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            {ar ? "تأشيرتك في أيدٍ أمينة" : "Your Visa, Handled Professionally"}
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto text-lg mb-10">
            {ar
              ? "نقدّم خدمات استخراج التأشيرات لأكثر من 50 دولة بكل سرعة واحترافية"
              : "Professional visa processing for 50+ countries with speed and precision"}
          </p>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 ${ar ? "right-4" : "left-4"}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? "ابحث عن دولة..." : "Search country..."}
              className={`w-full ${ar ? "pr-12 pl-5" : "pl-12 pr-5"} py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c8a84b]/50 focus:bg-white/15 transition-all text-base`}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Stats */}
        <StatsBar ar={ar} />

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all border ${activeCategory === "all" ? "bg-[#0d2351] text-white border-[#0d2351] shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-[#0d2351]/30"}`}
            >
              {ar ? "الكل" : "All"}
              {visas && <span className="ms-1.5 text-xs opacity-70">({visas.length})</span>}
            </button>
            {categories.map(cat => {
              const meta = CATEGORY_META[cat];
              const count = visas?.filter(v => v.category === cat).length ?? 0;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${activeCategory === cat ? "bg-[#0d2351] text-white border-[#0d2351] shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-[#0d2351]/30"}`}
                >
                  {meta?.icon}
                  {ar ? meta?.ar : meta?.en}
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Results header */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Filter className="w-4 h-4" />
              <span>
                {filtered.length} {ar ? "تأشيرة" : "visa(s)"}
                {search && <span className="text-[#0d2351] font-semibold ms-1">«{search}»</span>}
              </span>
            </div>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(visa => (
              <VisaCard key={visa.id} visa={visa} ar={ar} onApply={() => setSelectedVisa(visa)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">{ar ? "لا توجد نتائج" : "No results"}</h3>
            <p className="text-slate-400 text-sm">{ar ? "جرّب كلمة بحث مختلفة" : "Try a different search term"}</p>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }} className="mt-4 text-[#0d2351] text-sm font-semibold hover:underline">
              {ar ? "إعادة ضبط الفلاتر" : "Reset filters"}
            </button>
          </div>
        )}

        {/* CTA section */}
        {!isLoading && filtered.length > 0 && (
          <div className="mt-16 bg-gradient-to-br from-[#0d2351] to-[#1a3875] rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
            <div className="relative">
              <ChevronRight className="w-10 h-10 text-[#c8a84b] mx-auto mb-4 rotate-90" />
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
                {ar ? "لا تجد ما تبحث عنه؟" : "Can't find what you need?"}
              </h2>
              <p className="text-slate-300 mb-6 max-w-md mx-auto">
                {ar
                  ? "تواصل مع فريقنا مباشرةً وسنساعدك في استخراج أي تأشيرة لأي دولة"
                  : "Contact our team and we'll help you get a visa for any destination"}
              </p>
              <a
                href="tel:+967779055511"
                className="inline-flex items-center gap-2 bg-[#c8a84b] hover:bg-[#b8973b] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-900/20"
              >
                {ar ? "تواصل معنا الآن" : "Contact Us Now"}
                <ArrowRight className={`w-4 h-4 ${ar ? "rotate-180" : ""}`} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Wizard */}
      {selectedVisa && (
        <VisaApplicationWizard
          visa={selectedVisa}
          open={!!selectedVisa}
          onOpenChange={open => !open && setSelectedVisa(null)}
        />
      )}
    </div>
  );
}
