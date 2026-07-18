import { Switch, Route, Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/use-translation";
import {
  LayoutDashboard, Ticket, Map, MessageSquare, Briefcase, FileText,
  Users, Globe, Wrench, Building2, Languages, Flag,
} from "lucide-react";
import { lazy, Suspense } from "react";
import DashboardOverview from "./dashboard-overview";

const ProgramsAdmin = lazy(() => import("./programs-admin"));
const VisasAdmin = lazy(() => import("./visas-admin"));
const VisaCountriesAdmin = lazy(() => import("./visa-countries-admin"));
const BookingsAdmin = lazy(() => import("./bookings-admin"));
const OffersAdmin = lazy(() => import("./offers-admin"));
const DestinationsAdmin = lazy(() => import("./destinations-admin"));
const CustomersAdmin = lazy(() => import("./customers-admin"));
const MessagesAdmin = lazy(() => import("./messages-admin"));
const VisaApplicationsAdmin = lazy(() => import("./visa-applications-admin"));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function navHref(path: string) {
  return `${BASE}${path}`;
}

export default function AdminLayout() {
  const { language, setLanguage } = useTranslation();
  const [rawLocation] = useLocation();
  const ar = language === "ar";

  /* wouter gives us the path relative to the WouterRouter base, so strip
     the BASE_URL prefix that was already stripped by the router, but the
     route pattern "/admin/..." still needs normalisation. */
  const location = rawLocation;

  const navItems = [
    { href: "/",                         icon: LayoutDashboard, labelAr: "نظرة عامة",        labelEn: "Overview" },
    { href: "/admin/bookings",           icon: Ticket,          labelAr: "الحجوزات",          labelEn: "Bookings" },
    { href: "/admin/visa-applications",  icon: FileText,        labelAr: "طلبات التأشيرة",    labelEn: "Visa Applications" },
    { href: "/admin/visa-countries",     icon: Flag,            labelAr: "دول التأشيرة",      labelEn: "Visa Countries" },
    { href: "/admin/visas",              icon: Globe,           labelAr: "أنواع التأشيرات",   labelEn: "Visa Types" },
    { href: "/admin/programs",           icon: Map,             labelAr: "البرامج السياحية",  labelEn: "Programs" },
    { href: "/admin/offers",             icon: Briefcase,       labelAr: "العروض",            labelEn: "Offers" },
    { href: "/admin/destinations",       icon: Building2,       labelAr: "الوجهات",           labelEn: "Destinations" },
    { href: "/admin/customers",          icon: Users,           labelAr: "المستخدمون",        labelEn: "Users" },
    { href: "/admin/messages",           icon: MessageSquare,   labelAr: "الرسائل",           labelEn: "Messages" },
  ];

  const currentItem = navItems.find(i =>
    i.href === "/" ? location === "/" || location === "" : location.startsWith(i.href)
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans" dir={ar ? "rtl" : "ltr"}>
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0 shadow-xl z-20">
        {/* Logo */}
        <div className="h-20 flex items-center justify-center border-b border-sidebar-border px-6">
          <div className="text-center">
            <div className="font-extrabold text-lg text-white tracking-wide">أبشر للسفريات</div>
            <div className="text-xs text-sidebar-primary mt-1 font-medium">
              {ar ? "لوحة التحكم" : "Admin Panel"}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? location === "/" || location === ""
              : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={`flex items-center px-4 py-3 rounded-xl transition-all cursor-pointer gap-3 font-medium text-sm
                    ${isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
                    }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{ar ? item.labelAr : item.labelEn}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => setLanguage(ar ? "en" : "ar")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-colors text-sm font-medium text-sidebar-foreground"
          >
            <Languages className="w-5 h-5 shrink-0" />
            {ar ? "English" : "عربي"}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-20 bg-card border-b border-card-border flex items-center px-8 justify-between shrink-0 shadow-sm">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">
            {currentItem ? (ar ? currentItem.labelAr : currentItem.labelEn) : (ar ? "لوحة الإدارة" : "Admin Panel")}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground font-medium hidden md:block">
              {ar ? "مرحباً، مدير النظام" : "Welcome, Admin"}
            </div>
            <div className="w-10 h-10 rounded-full bg-primary text-accent flex items-center justify-center font-bold text-lg shadow-sm border border-primary/10">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <Suspense fallback={<LoadingSpinner />}>
            <Switch>
              <Route path="/" component={DashboardOverview} />
              <Route path="/admin/bookings" component={BookingsAdmin} />
              <Route path="/admin/visa-applications" component={VisaApplicationsAdmin} />
              <Route path="/admin/visa-countries" component={VisaCountriesAdmin} />
              <Route path="/admin/visas" component={VisasAdmin} />
              <Route path="/admin/programs" component={ProgramsAdmin} />
              <Route path="/admin/offers" component={OffersAdmin} />
              <Route path="/admin/destinations" component={DestinationsAdmin} />
              <Route path="/admin/customers" component={CustomersAdmin} />
              <Route path="/admin/messages" component={MessagesAdmin} />
              <Route path="/admin/:rest*">
                <div className="bg-card rounded-3xl shadow-sm border border-card-border p-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Wrench className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {ar ? "قيد التطوير" : "Under Development"}
                  </h3>
                  <p className="text-base text-muted-foreground max-w-sm">
                    {ar ? "هذا القسم قيد الإنشاء وسيكون متاحاً قريباً." : "This section is under construction and will be available soon."}
                  </p>
                </div>
              </Route>
            </Switch>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
