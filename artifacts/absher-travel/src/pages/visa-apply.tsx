import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { Link, useLocation, useParams } from "wouter";
import { 
  useGetVisa, 
  useListVisaCustomFields, 
  useCreateVisaApplication, 
  useOcrPassport,
  useRequestUploadUrl 
} from "@workspace/api-client-react";
import { 
  User, Flag, UploadCloud, CheckCircle2, ChevronRight, 
  ArrowRight, ArrowLeft, Shield, FileText, AlertCircle 
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelect } from "@/components/country-select";
import { Checkbox } from "@/components/ui/checkbox";

const WIZARD_STEPS = [
  { id: "personal", ar: "البيانات الشخصية", en: "Personal Info", icon: User },
  { id: "passport", ar: "جواز السفر", en: "Passport", icon: Flag },
  { id: "documents", ar: "المرفقات", en: "Documents", icon: UploadCloud },
  { id: "review", ar: "المراجعة", en: "Review", icon: CheckCircle2 }
];

export default function VisaApply() {
  const { language } = useTranslation();
  const ar = language === "ar";
  const params = useParams();
  const visaId = Number(params.visaId);
  const [, setLocation] = useLocation();

  const [currentStep, setCurrentStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // APIs
  const { data: visa, isLoading: isLoadingVisa } = useGetVisa(visaId, { 
    query: { enabled: !!visaId, queryKey: ["visa", visaId] } 
  });
  const { data: customFields } = useListVisaCustomFields(visaId, { 
    query: { enabled: !!visaId, queryKey: ["visa-custom-fields", visaId] } 
  });

  const uploadMutation = useRequestUploadUrl();
  const ocrMutation = useOcrPassport();
  const submitMutation = useCreateVisaApplication();

  // Form
  const formSchema = z.object({
    fullName: z.string().min(3),
    fullNameEn: z.string().optional(),
    nationality: z.string().min(2),
    gender: z.enum(["male", "female"]),
    dateOfBirth: z.string().min(4),
    countryOfResidence: z.string().optional(),
    email: z.string().email(),
    phone: z.string().min(5),
    
    passportNumber: z.string().min(3),
    passportIssueDate: z.string().min(4),
    passportExpiryDate: z.string().min(4),
    passportIssuingCountry: z.string().optional(),
    
    passportImageUrl: z.string().optional(),
    personalPhotoUrl: z.string().optional(),
    residencyImageUrl: z.string().optional(),
    visaImageUrl: z.string().optional(),
    
    customFieldResponses: z.record(z.any()).optional(),
    agreedToTerms: z.literal(true, { errorMap: () => ({ message: ar ? "يجب الموافقة على الشروط" : "Must agree to terms" }) }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: "male",
      customFieldResponses: {}
    }
  });

  // Handle file upload
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const handleUpload = async (file: File, fieldName: string) => {
    setUploadingField(fieldName);
    try {
      const { uploadURL, objectPath } = await uploadMutation.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type
        }
      });

      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      form.setValue(fieldName as any, objectPath, { shouldValidate: true });

      // If it's the passport image, trigger OCR
      if (fieldName === "passportImageUrl") {
        try {
          const ocr = await ocrMutation.mutateAsync({ data: { imageUrl: objectPath } });
          if (ocr.success) {
            if (ocr.fullName) form.setValue("fullName", ocr.fullName);
            if (ocr.fullNameEn) form.setValue("fullNameEn", ocr.fullNameEn);
            if (ocr.passportNumber) form.setValue("passportNumber", ocr.passportNumber);
            if (ocr.nationality) form.setValue("nationality", ocr.nationality.toLowerCase());
            if (ocr.dateOfBirth) form.setValue("dateOfBirth", ocr.dateOfBirth);
            if (ocr.issueDate) form.setValue("passportIssueDate", ocr.issueDate);
            if (ocr.expiryDate) form.setValue("passportExpiryDate", ocr.expiryDate);
            if (ocr.issuingCountry) form.setValue("passportIssuingCountry", ocr.issuingCountry.toLowerCase());
            if (ocr.gender) form.setValue("gender", ocr.gender === "M" || ocr.gender === "MALE" ? "male" : "female");
          }
        } catch (e) {
          console.error("OCR failed", e);
        }
      }
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploadingField(null);
    }
  };

  const nextStep = async () => {
    let isValid = false;
    if (currentStep === 0) {
      isValid = await form.trigger(["fullName", "nationality", "gender", "dateOfBirth", "email", "phone"]);
    } else if (currentStep === 1) {
      isValid = await form.trigger(["passportNumber", "passportIssueDate", "passportExpiryDate"]);
    } else if (currentStep === 2) {
      // Manual check for required documents
      isValid = true;
      if (visa?.requiresPassportImage && !form.getValues("passportImageUrl")) isValid = false;
      if (visa?.requiresPersonalPhoto && !form.getValues("personalPhotoUrl")) isValid = false;
      if (visa?.requiresResidencyImage && !form.getValues("residencyImageUrl")) isValid = false;
      if (!isValid) {
        form.trigger(["passportImageUrl", "personalPhotoUrl", "residencyImageUrl"]);
      }
    }

    if (isValid) {
      setCurrentStep(s => Math.min(WIZARD_STEPS.length - 1, s + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(s => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setServerError(null);
      const res = await submitMutation.mutateAsync({
        data: {
          visaId,
          eligibilityPath: "direct",
          ...data
        }
      });
      setLocation(`/visas/success?tracking=${res.trackingNumber}`);
    } catch (e: any) {
      setServerError(e?.data?.error || e?.message || "An error occurred");
    }
  };

  if (isLoadingVisa) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#0A2342] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!visa) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir={ar ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-[#0A2342] pt-20 pb-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.1)_0%,transparent_50%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-400 mb-6">
            <Link href="/visas" className="hover:text-white transition-colors">{ar ? "التأشيرات" : "Visas"}</Link>
            <ChevronRight className={`w-4 h-4 ${ar ? "rotate-180" : ""}`} />
            <Link href={`/visas/${visa.countryId}`} className="hover:text-white transition-colors">{ar ? visa.countryAr : visa.countryEn}</Link>
            <ChevronRight className={`w-4 h-4 ${ar ? "rotate-180" : ""}`} />
            <span className="text-white">{ar ? "تقديم طلب" : "Apply"}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            {ar ? "طلب تأشيرة" : "Visa Application"}
          </h1>
          <p className="text-[#D4AF37] text-lg font-bold">
            {ar ? visa.countryAr : visa.countryEn} — {visa.visaType}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-4xl mx-auto overflow-hidden">
          
          {/* Progress Steps */}
          <div className="bg-slate-50 border-b border-slate-100 flex items-center overflow-x-auto scrollbar-hide">
            {WIZARD_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isPast = idx < currentStep;
              
              return (
                <div 
                  key={step.id} 
                  className={`flex-1 min-w-[120px] p-4 border-b-2 transition-colors flex flex-col items-center justify-center gap-2 ${
                    isActive ? "border-[#0A2342] text-[#0A2342] bg-white" : 
                    isPast ? "border-[#D4AF37] text-[#D4AF37]" : 
                    "border-transparent text-slate-400"
                  }`}
                >
                  <StepIcon className={`w-5 h-5 ${isPast ? "text-[#D4AF37]" : isActive ? "text-[#0A2342]" : ""}`} />
                  <span className="text-xs font-bold whitespace-nowrap">{ar ? step.ar : step.en}</span>
                </div>
              );
            })}
          </div>

          <div className="p-8 md:p-12">
            {serverError && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <p className="text-sm font-medium">{serverError}</p>
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Step 1: Personal */}
              {currentStep === 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-black text-slate-800 mb-6">{ar ? "البيانات الشخصية" : "Personal Information"}</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "الاسم الكامل (كما في الجواز)" : "Full Name (as in passport)"} *</Label>
                      <Input {...form.register("fullName")} className="h-12 bg-slate-50 border-slate-200 focus:bg-white" />
                      {form.formState.errors.fullName && <p className="text-xs text-red-500">{form.formState.errors.fullName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "الجنسية" : "Nationality"} *</Label>
                      <Controller
                        control={form.control}
                        name="nationality"
                        render={({ field }) => (
                          <CountrySelect language={language as "ar"|"en"} value={field.value} onChange={field.onChange} />
                        )}
                      />
                      {form.formState.errors.nationality && <p className="text-xs text-red-500">{form.formState.errors.nationality.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "تاريخ الميلاد" : "Date of Birth"} *</Label>
                      <Input type="date" {...form.register("dateOfBirth")} className="h-12 bg-slate-50 border-slate-200 focus:bg-white" />
                      {form.formState.errors.dateOfBirth && <p className="text-xs text-red-500">{form.formState.errors.dateOfBirth.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "الجنس" : "Gender"} *</Label>
                      <Controller
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">{ar ? "ذكر" : "Male"}</SelectItem>
                              <SelectItem value="female">{ar ? "أنثى" : "Female"}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "دولة الإقامة" : "Country of Residence"}</Label>
                      <Controller
                        control={form.control}
                        name="countryOfResidence"
                        render={({ field }) => (
                          <CountrySelect language={language as "ar"|"en"} value={field.value || ""} onChange={field.onChange} />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "البريد الإلكتروني" : "Email Address"} *</Label>
                      <Input type="email" {...form.register("email")} className="h-12 bg-slate-50 border-slate-200 focus:bg-white" dir="ltr" />
                      {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "رقم الهاتف" : "Phone Number"} *</Label>
                      <Input type="tel" {...form.register("phone")} className="h-12 bg-slate-50 border-slate-200 focus:bg-white tabular-nums" dir="ltr" />
                      {form.formState.errors.phone && <p className="text-xs text-red-500">{form.formState.errors.phone.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Passport */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-black text-slate-800 mb-2">{ar ? "معلومات جواز السفر" : "Passport Information"}</h2>
                  <p className="text-slate-500 mb-8">
                    {ar 
                      ? "يمكنك رفع صورة جواز السفر وسنقوم بتعبئة البيانات تلقائياً." 
                      : "Upload your passport image and we'll auto-fill the details."}
                  </p>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
                    <Label className="text-sm font-bold text-blue-900 mb-3 block">
                      {ar ? "صورة جواز السفر (للتعبئة التلقائية)" : "Passport Image (for auto-fill)"}
                    </Label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUpload(e.target.files[0], "passportImageUrl");
                        }}
                        disabled={!!uploadingField}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                      />
                      <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${
                        uploadingField === "passportImageUrl" ? "bg-white/50 border-blue-200" : 
                        form.watch("passportImageUrl") ? "bg-emerald-50 border-emerald-200 text-emerald-600" : 
                        "bg-white border-blue-200 hover:border-blue-400 text-blue-500"
                      }`}>
                        {uploadingField === "passportImageUrl" ? (
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : form.watch("passportImageUrl") ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-8 h-8 mb-2" />
                            <span className="font-bold">{ar ? "تم الرفع وقراءة البيانات" : "Uploaded & Scanned"}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <UploadCloud className="w-10 h-10 mb-2" />
                            <span className="font-bold">{ar ? "اضغط أو اسحب صورة الجواز هنا" : "Click or drag passport image here"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "رقم الجواز" : "Passport Number"} *</Label>
                      <Input {...form.register("passportNumber")} className="h-12 bg-slate-50 border-slate-200 focus:bg-white uppercase" dir="ltr" />
                      {form.formState.errors.passportNumber && <p className="text-xs text-red-500">{form.formState.errors.passportNumber.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "دولة الإصدار" : "Issuing Country"}</Label>
                      <Controller
                        control={form.control}
                        name="passportIssuingCountry"
                        render={({ field }) => (
                          <CountrySelect language={language as "ar"|"en"} value={field.value || ""} onChange={field.onChange} />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "تاريخ الإصدار" : "Issue Date"} *</Label>
                      <Input type="date" {...form.register("passportIssueDate")} className="h-12 bg-slate-50 border-slate-200 focus:bg-white" />
                      {form.formState.errors.passportIssueDate && <p className="text-xs text-red-500">{form.formState.errors.passportIssueDate.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">{ar ? "تاريخ الانتهاء" : "Expiry Date"} *</Label>
                      <Input type="date" {...form.register("passportExpiryDate")} className="h-12 bg-slate-50 border-slate-200 focus:bg-white" />
                      {form.formState.errors.passportExpiryDate && <p className="text-xs text-red-500">{form.formState.errors.passportExpiryDate.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Documents */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-black text-slate-800 mb-6">{ar ? "المرفقات والمعلومات الإضافية" : "Documents & Additional Info"}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visa.requiresPersonalPhoto && (
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">{ar ? "صورة شخصية بخلفية بيضاء" : "Personal Photo (White Background)"} *</Label>
                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <input 
                            type="file" accept="image/*"
                            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "personalPhotoUrl")}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex items-center gap-3">
                            {uploadingField === "personalPhotoUrl" ? (
                              <div className="w-6 h-6 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin" />
                            ) : form.watch("personalPhotoUrl") ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <UploadCloud className="w-6 h-6 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-600">
                              {form.watch("personalPhotoUrl") ? (ar ? "تم الرفع" : "Uploaded") : (ar ? "اختر صورة للرفع" : "Choose image to upload")}
                            </span>
                          </div>
                        </div>
                        {form.formState.errors.personalPhotoUrl && <p className="text-xs text-red-500">{ar ? "هذا المرفق مطلوب" : "This document is required"}</p>}
                      </div>
                    )}

                    {visa.requiresResidencyImage && (
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">{ar ? "صورة الإقامة" : "Residency Image"} *</Label>
                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <input 
                            type="file" accept="image/*,application/pdf"
                            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "residencyImageUrl")}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex items-center gap-3">
                            {uploadingField === "residencyImageUrl" ? (
                              <div className="w-6 h-6 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin" />
                            ) : form.watch("residencyImageUrl") ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <UploadCloud className="w-6 h-6 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-600">
                              {form.watch("residencyImageUrl") ? (ar ? "تم الرفع" : "Uploaded") : (ar ? "اختر ملفاً للرفع" : "Choose file to upload")}
                            </span>
                          </div>
                        </div>
                        {form.formState.errors.residencyImageUrl && <p className="text-xs text-red-500">{ar ? "هذا المرفق مطلوب" : "This document is required"}</p>}
                      </div>
                    )}
                    
                    {visa.requiresVisaImage && (
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">{ar ? "صورة التأشيرة السابقة (إن وجدت)" : "Previous Visa Image (if any)"}</Label>
                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <input 
                            type="file" accept="image/*,application/pdf"
                            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "visaImageUrl")}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex items-center gap-3">
                            {uploadingField === "visaImageUrl" ? (
                              <div className="w-6 h-6 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin" />
                            ) : form.watch("visaImageUrl") ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <UploadCloud className="w-6 h-6 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-600">
                              {form.watch("visaImageUrl") ? (ar ? "تم الرفع" : "Uploaded") : (ar ? "اختر ملفاً للرفع" : "Choose file to upload")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {customFields && customFields.length > 0 && (
                    <div className="mt-10">
                      <h3 className="text-lg font-bold text-[#0A2342] mb-6 pt-6 border-t border-slate-100">
                        {ar ? "معلومات إضافية مطلوبة للسفارة" : "Additional Information for Embassy"}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {customFields.map(cf => (
                          <div key={cf.id} className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700">
                              {ar ? cf.labelAr : cf.labelEn} {cf.isRequired && "*"}
                            </Label>
                            
                            {cf.fieldType === 'text' || cf.fieldType === 'number' || cf.fieldType === 'date' ? (
                              <Input 
                                type={cf.fieldType}
                                placeholder={ar ? (cf.placeholderAr || "") : (cf.placeholderEn || "")}
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                                {...form.register(`customFieldResponses.${cf.id}`)}
                                required={cf.isRequired}
                              />
                            ) : cf.fieldType === 'textarea' ? (
                              <textarea
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 focus:bg-white min-h-[100px]"
                                placeholder={ar ? (cf.placeholderAr || "") : (cf.placeholderEn || "")}
                                {...form.register(`customFieldResponses.${cf.id}`)}
                                required={cf.isRequired}
                              />
                            ) : cf.fieldType === 'select' && cf.options ? (
                              <Controller
                                control={form.control}
                                name={`customFieldResponses.${cf.id}`}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange} required={cf.isRequired}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:bg-white">
                                      <SelectValue placeholder={ar ? (cf.placeholderAr || "اختر") : (cf.placeholderEn || "Select")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cf.options?.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            ) : cf.fieldType === 'boolean' ? (
                              <RadioGroup 
                                className="flex gap-6"
                                onValueChange={(v) => form.setValue(`customFieldResponses.${cf.id}`, v === 'true')}
                              >
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <RadioGroupItem value="true" />
                                  <span>{ar ? "نعم" : "Yes"}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <RadioGroupItem value="false" />
                                  <span>{ar ? "لا" : "No"}</span>
                                </label>
                              </RadioGroup>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-black text-slate-800 mb-6">{ar ? "مراجعة الطلب" : "Review Application"}</h2>
                  
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{ar ? "الاسم الكامل" : "Full Name"}</div>
                        <div className="font-bold text-slate-800">{form.getValues("fullName")}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{ar ? "رقم الجواز" : "Passport Number"}</div>
                        <div className="font-bold text-slate-800 uppercase" dir="ltr">{form.getValues("passportNumber")}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{ar ? "رقم الهاتف" : "Phone"}</div>
                        <div className="font-bold text-slate-800" dir="ltr">{form.getValues("phone")}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{ar ? "البريد الإلكتروني" : "Email"}</div>
                        <div className="font-bold text-slate-800">{form.getValues("email")}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{ar ? "رسوم التأشيرة" : "Visa Fee"}</div>
                        <div className="font-black text-[#0A2342] text-xl">{Number(visa.fee).toLocaleString()} {visa.currency}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                    <Shield className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-blue-900 mb-2">
                        {ar ? "إقرار بصحة البيانات" : "Declaration"}
                      </h4>
                      <p className="text-sm text-blue-800/80 mb-4 leading-relaxed">
                        {ar 
                          ? "أقر بأن جميع البيانات والمرفقات التي قدمتها صحيحة ومطابقة للواقع، وأتحمل المسؤولية الكاملة في حال تبين خلاف ذلك مما قد يؤدي لرفض التأشيرة." 
                          : "I declare that all information and documents provided are true and correct. I take full responsibility for any false information which may lead to visa rejection."}
                      </p>
                      
                      <Controller
                        control={form.control}
                        name="agreedToTerms"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                              id="terms" 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                              className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <label htmlFor="terms" className="text-sm font-bold text-blue-900 cursor-pointer">
                              {ar ? "أوافق على الشروط والأحكام وأقر بصحة البيانات" : "I agree to the terms and confirm data accuracy"}
                            </label>
                          </div>
                        )}
                      />
                      {form.formState.errors.agreedToTerms && (
                        <p className="text-xs text-red-500 mt-2">{form.formState.errors.agreedToTerms.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    {ar ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    {ar ? "السابق" : "Back"}
                  </button>
                ) : <div />}

                {currentStep < WIZARD_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 rounded-xl font-bold text-white bg-[#0A2342] hover:bg-[#11315c] transition-colors flex items-center gap-2"
                  >
                    {ar ? "التالي" : "Next"}
                    {ar ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="px-8 py-3 rounded-xl font-bold text-white bg-[#D4AF37] hover:bg-[#b8973b] transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {ar ? "تقديم الطلب" : "Submit Application"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}