import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "@/hooks/use-translation";
import { useListVisaCountries } from "@workspace/api-client-react";
import { Search, Globe, ChevronRight, Compass } from "lucide-react";

const REGIONS = [
  { id: "all", ar: "الكل", en: "All Regions" },
  { id: "gulf", ar: "الخليج", en: "Gulf" },
  { id: "arab", ar: "الدول العربية", en: "Arab Countries" },
  { id: "asian", ar: "آسيا", en: "Asia" },
  { id: "european", ar: "أوروبا", en: "Europe" },
  { id: "african", ar: "أفريقيا", en: "Africa" },
  { id: "american", ar: "الأمريكيتين", en: "Americas" },
];

export default function Visas() {
  const { language } = useTranslation();
  const ar = language === "ar";
  const { data: countries, isLoading } = useListVisaCountries({ activeOnly: true });
  const [search, setSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState("all");

  const filteredCountries = useMemo(() => {
    if (!countries) return [];
    return countries.filter(c => {
      const name = ar ? c.nameAr : c.nameEn;
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
      const matchRegion = activeRegion === "all" || c.region === activeRegion;
      return matchSearch && matchRegion;
    });
  }, [countries, search, activeRegion, ar]);

  return (
    <div className="min-h-screen bg-slate-50" dir={ar ? "rtl" : "ltr"}>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-[#0A2342] to-[#11315c] pt-24 pb-32 overflow-hidden">
        {/* Abstract Gold Accents */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-4 py-1.5 rounded-full mb-6 text-sm font-semibold tracking-wide uppercase">
            <Globe className="w-4 h-4" />
            {ar ? "بوابة التأشيرات" : "Visa Portal"}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight max-w-4xl mx-auto font-display">
            {ar ? "رحلتك تبدأ بتأشيرة، ونحن نتكفل بالباقي" : "Your Journey Starts with a Visa. We Handle the Rest."}
          </h1>
          
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
            {ar 
              ? "خدمات تأشيرات رسمية وموثوقة لأكثر من 50 وجهة حول العالم. دقة، سرعة، واحترافية تليق بك." 
              : "Official, trusted visa services for over 50 destinations worldwide. Precision, speed, and professionalism."}
          </p>

          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-0 bg-[#D4AF37]/20 blur-xl rounded-full transition-all group-hover:bg-[#D4AF37]/30" />
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl flex items-center shadow-2xl transition-all focus-within:bg-white/15 focus-within:border-white/30">
              <Search className={`w-6 h-6 text-white/50 mx-4 shrink-0`} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ar ? "ابحث عن دولة الوجهة..." : "Search for your destination country..."}
                className="w-full bg-transparent border-none text-white placeholder:text-white/50 focus:outline-none focus:ring-0 text-lg py-3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 -mt-8 relative z-20 pb-24">
        {/* Regions Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex gap-2 overflow-x-auto scrollbar-hide mb-12 max-w-fit mx-auto">
          {REGIONS.map(region => (
            <button
              key={region.id}
              onClick={() => setActiveRegion(region.id)}
              className={`whitespace-nowrap px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                activeRegion === region.id
                  ? "bg-[#0A2342] text-white shadow-md"
                  : "text-slate-500 hover:text-[#0A2342] hover:bg-slate-50"
              }`}
            >
              {ar ? region.ar : region.en}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 h-32 animate-pulse" />
            ))}
          </div>
        ) : filteredCountries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCountries.map(country => (
              <Link key={country.id} href={`/visas/${country.id}`} className="group block">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:border-[#D4AF37]/30 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl shadow-inner overflow-hidden">
                      {country.flagEmoji ? (
                        <span>{country.flagEmoji}</span>
                      ) : country.imageUrl ? (
                        <img src={country.imageUrl} alt={ar ? country.nameAr : country.nameEn} className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg truncate group-hover:text-[#0A2342] transition-colors">
                        {ar ? country.nameAr : country.nameEn}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        {country.visaCount || 0} {ar ? "أنواع تأشيرات" : "visa types"}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] text-slate-300 transition-colors shrink-0">
                      <ChevronRight className={`w-5 h-5 ${ar ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
            <Globe className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              {ar ? "لم نجد أي دول تطابق بحثك" : "No countries found matching your search"}
            </h3>
            <p className="text-slate-500">
              {ar ? "جرب البحث باسم مختلف أو تصفح جميع المناطق" : "Try searching with a different name or browse all regions"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
