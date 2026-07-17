import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import {
  useListVisaApplications, useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  useListMyBookings, useUpdateProfile, useGetCurrentUser, getGetCurrentUserQueryKey,
  VisaApplication, Notification as ApiNotification, Booking
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Bell, User, CheckCheck, Circle, Plane, Building2, MapPin, Shield, Camera, Save, Package, AlertCircle, Loader2 } from "lucide-react";

const STATUS_ORDER = [
  "received", "under_review", "awaiting_documents", "documents_uploaded",
  "sent_to_embassy", "processing", "issued", "completed",
];

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  received: { ar: "تم الاستلام", en: "Received" },
  under_review: { ar: "قيد المراجعة", en: "Under review" },
  awaiting_documents: { ar: "بانتظار مستندات", en: "Awaiting documents" },
  documents_uploaded: { ar: "تم رفع المستندات", en: "Documents uploaded" },
  sent_to_embassy: { ar: "أُرسل للسفارة", en: "Sent to embassy" },
  processing: { ar: "قيد المعالجة", en: "Processing" },
  issued: { ar: "تم الإصدار", en: "Issued" },
  completed: { ar: "مكتمل", en: "Completed" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

function StatusStepper({ status, language }: { status: string; language: string }) {
  const ar = language === "ar";
  if (status === "rejected") {
    return <Badge variant="destructive">{ar ? STATUS_LABELS.rejected.ar : STATUS_LABELS.rejected.en}</Badge>;
  }
  const currentIndex = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-2">
      {STATUS_ORDER.map((s, i) => (
        <div key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i <= currentIndex ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
          {ar ? STATUS_LABELS[s]?.ar || s : STATUS_LABELS[s]?.en || s}
        </div>
      ))}
    </div>
  );
}

function ApplicationCard({ app, language }: { app: VisaApplication; language: string }) {
  const ar = language === "ar";
  return (
    <Card className="border border-slate-200 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{ar ? "طلب تأشيرة" : "Visa Application"} #{app.id}</div>
            <div className="text-sm text-slate-500 mt-0.5">{app.fullName} · {app.nationality}</div>
            <StatusStepper status={app.status} language={language} />
          </div>
        </div>
        <div className="text-xs text-slate-400 text-end whitespace-nowrap self-start">
          {new Date(app.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

function BookingCard({ booking, language }: { booking: Booking; language: string }) {
  const ar = language === "ar";
  const typeLabels = {
    flight: { ar: "رحلة طيران", en: "Flight", icon: Plane },
    hotel: { ar: "فندق", en: "Hotel", icon: Building2 },
    program: { ar: "برنامج سياحي", en: "Program", icon: MapPin },
    visa: { ar: "تأشيرة", en: "Visa", icon: Shield },
  };
  const statusLabels = {
    pending: { ar: "قيد الانتظار", en: "Pending", color: "bg-amber-100 text-amber-700" },
    confirmed: { ar: "مؤكد", en: "Confirmed", color: "bg-green-100 text-green-700" },
    cancelled: { ar: "ملغى", en: "Cancelled", color: "bg-red-100 text-red-700" },
  };

  const typeInfo = typeLabels[booking.type as keyof typeof typeLabels] || { ar: booking.type, en: booking.type, icon: Package };
  const statusInfo = statusLabels[booking.status as keyof typeof statusLabels] || statusLabels.pending;
  const TypeIcon = typeInfo.icon;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details: Record<string, any> = {};

  return (
    <Card className="border border-slate-200 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 border rounded-xl flex items-center justify-center shrink-0">
            <TypeIcon className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {ar ? typeInfo.ar : typeInfo.en} #{booking.id}
              </span>
              <Badge variant="outline" className={`border-0 ${statusInfo.color}`}>
                {ar ? statusInfo.ar : statusInfo.en}
              </Badge>
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {details.destination || details.hotelName || details.flightNumber || (ar ? "حجز" : "Booking")}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 text-end whitespace-nowrap">
          {new Date(booking.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationRow({ n, language, onRead }: { n: ApiNotification; language: string; onRead: (id: string) => void }) {
  const ar = language === "ar";
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${n.isRead ? "border-slate-100 bg-white" : "border-primary/20 bg-primary/5 hover:border-primary/30"}`}>
      {!n.isRead ? <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary shrink-0" /> : <div className="w-2 shrink-0" />}
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

function ProfileFileUpload({ label, value, onChange }: { label: string; value?: string | null; onChange: (url: string) => void }) {
  const { uploadFile, isUploading } = useUpload({ basePath: "/api/storage" });
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
        <label className="mt-2 flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-primary/5 hover:border-primary/40 transition-colors text-sm text-slate-500">
          <input type="file" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = await uploadFile(f); if (r) onChange(r.objectPath);
          }} disabled={isUploading} />
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Camera className="h-5 w-5 text-slate-400" />}
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
      onError: (err: any) => {
        toast({ variant: "destructive", title: ar ? "خطأ" : "Error", description: err.message || (ar ? "فشل تحديث الملف الشخصي" : "Failed to update profile.") });
      }
    }
  });

  const { uploadFile: uploadAvatar, isUploading: isUploadingAvatar } = useUpload({ basePath: "/api/storage" });

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

  const REQUEST_TABS: { id: RequestTab; ar: string; en: string; icon: any }[] = [
    { id: "all", ar: "جميع الطلبات", en: "All Requests", icon: Package },
    { id: "visas", ar: "تأشيرات", en: "Visas", icon: Shield },
    { id: "flights", ar: "رحلات طيران", en: "Flights", icon: Plane },
    { id: "hotels", ar: "فنادق", en: "Hotels", icon: Building2 },
    { id: "programs", ar: "برامج سياحية", en: "Programs", icon: MapPin },
  ];

  const isLoadingRequests = appsLoading || bookingsLoading;

  return (
    <div className="bg-slate-50 min-h-screen py-10" dir={ar ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-5 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-white shadow-md">
              <AvatarImage src={getDisplayUrl(profile.profilePhotoUrl)} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {(authUser?.firstName?.[0] || authUser?.email?.[0] || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{authUser?.firstName ? `${authUser.firstName} ${authUser.lastName ?? ""}` : (ar ? "حسابي" : "My Account")}</h1>
            <p className="text-slate-500 font-medium">{authUser?.email ?? authUser?.phone}</p>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="bg-white border mb-6 flex-wrap h-auto p-1.5 shadow-sm rounded-xl">
            <TabsTrigger value="requests" className="gap-2 rounded-lg py-2.5"><FileText size={16} />{ar ? "طلباتي" : "My Requests"}</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 rounded-lg py-2.5"><User size={16} />{ar ? "ملفي الشخصي" : "Profile"}</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 rounded-lg py-2.5">
              <Bell size={16} />{ar ? "الإشعارات" : "Notifications"}
              {unreadCount > 0 && <Badge className="ml-1 rtl:mr-1 rtl:ml-0 bg-accent text-primary px-1.5 min-w-[20px] h-5 flex items-center justify-center border-0">{unreadCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {REQUEST_TABS.map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveSubTab(tab.id as RequestTab)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold transition-all shadow-sm ${activeSubTab === tab.id ? "bg-primary text-white scale-[1.02]" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
                    <TabIcon className="w-4 h-4" />
                    {ar ? tab.ar : tab.en}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              {isLoadingRequests && <div className="text-slate-400 text-center py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border"><Loader2 className="w-8 h-8 animate-spin text-primary/40" /> <span className="font-medium">{ar ? "جاري التحميل..." : "Loading..."}</span></div>}
              {!isLoadingRequests && filteredItems.length === 0 && (
                <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Package className="h-8 w-8 text-slate-300" /></div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">{ar ? "لا توجد طلبات هنا" : "No requests found"}</h3>
                  <p className="text-sm">{ar ? "لم تقم بأي حجوزات أو طلبات في هذا القسم بعد." : "You haven't made any bookings in this category yet."}</p>
                </div>
              )}
              {filteredItems.map(item => (
                item._itemType === "app" ? (
                  <ApplicationCard key={`app-${item.id}`} app={item as VisaApplication} language={language} />
                ) : (
                  <BookingCard key={`booking-${item.id}`} booking={item as Booking} language={language} />
                )
              ))}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
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
                     <span className="text-2xl font-black text-primary">{completionPercentage}%</span>
                     <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{completedKeyFields}/8 {ar ? "حقول مكتملة" : "completed"}</div>
                   </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                   <div className="bg-primary h-full transition-all duration-700 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-6">
                <div className="relative shrink-0">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-md">
                    <AvatarImage src={getDisplayUrl(profile.profilePhotoUrl)} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {(profile.firstName?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 shadow-lg transition-transform hover:scale-105">
                    {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <input type="file" className="hidden" accept="image/*" onChange={async e => {
                       const f = e.target.files?.[0]; if (!f) return;
                       const r = await uploadAvatar(f); if (r) setProfile((p: typeof profile) => ({ ...p, profilePhotoUrl: r.objectPath }));
                    }} disabled={isUploadingAvatar} />
                  </label>
                </div>
                <div className="text-center md:text-start rtl:md:text-right">
                  <h3 className="font-bold text-lg text-slate-800">{ar ? "صورة الملف الشخصي" : "Profile Photo"}</h3>
                  <p className="text-sm text-slate-500 mt-1">{ar ? "اختر صورة شخصية واضحة (يُفضل بخلفية بيضاء للطلبات الرسمية)" : "Choose a clear personal photo (white background preferred for official requests)"}</p>
                </div>
              </div>

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

              <div className="border-t border-slate-100 p-6 bg-slate-50/30">
                <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 bg-white hover:border-primary/40 transition-colors mb-6 shadow-sm">
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
              <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="h-14 px-10 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all font-bold text-lg gap-3 text-white">
                {updateProfileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {ar ? "حفظ التغييرات" : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            {(notifications?.length ?? 0) > 0 && (
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="gap-2 bg-white rounded-xl shadow-sm" onClick={() => markAllRead.mutate()}>
                  <CheckCheck size={14} /> {ar ? "تحديد الكل كمقروء" : "Mark all as read"}
                </Button>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
              {notifsLoading && <div className="text-slate-400 text-center py-16 flex flex-col items-center justify-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-primary/40" /> <span className="font-medium">{ar ? "جاري التحميل..." : "Loading..."}</span></div>}
              {!notifsLoading && (notifications?.length ?? 0) === 0 && (
                <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Bell className="h-8 w-8 text-slate-300" /></div>
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