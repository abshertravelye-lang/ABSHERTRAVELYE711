import { useState, useRef } from "react";
import { useListEmployees, useCreateEmployee, useUpdateEmployee, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/use-translation";
import { Search, Plus, Edit2, Shield, Phone, Mail, Building, UserCheck, UserX } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  admin: { ar: "مدير", en: "Admin", color: "bg-purple-100 text-purple-700 border-purple-200" },
  agent: { ar: "وكيل", en: "Agent", color: "bg-blue-100 text-blue-700 border-blue-200" },
  accountant: { ar: "محاسب", en: "Accountant", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  support: { ar: "دعم فني", en: "Support", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function EmployeesAdmin() {
  const { language } = useTranslation();
  const ar = language === "ar";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "agent",
    department: "",
    status: "active",
  });

  const { data: employees, isLoading } = useListEmployees();
  
  const createEmployee = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setIsDialogOpen(false);
        toast.success(ar ? "تم إضافة الموظف بنجاح" : "Employee added successfully");
      }
    }
  });

  const updateEmployee = useUpdateEmployee({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setIsDialogOpen(false);
        toast.success(ar ? "تم تحديث الموظف بنجاح" : "Employee updated successfully");
      }
    }
  });

  const handleOpenDialog = (emp?: any) => {
    if (emp) {
      setEditingId(emp.id);
      setFormData({
        firstName: emp.firstName || "",
        lastName: emp.lastName || "",
        email: emp.email || "",
        phone: emp.phone || "",
        role: emp.role || "agent",
        department: emp.department || "",
        status: emp.status || "active",
      });
    } else {
      setEditingId(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "agent",
        department: "",
        status: "active",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateEmployee.mutate({ id: editingId, data: formData });
    } else {
      createEmployee.mutate({ data: formData as any });
    }
  };

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateEmployee.mutate({ id, data: { status: newStatus } });
  };

  const filtered = employees?.filter((e: any) => {
    const matchRole = roleFilter === "all" || e.role === roleFilter;
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || (e.firstName?.toLowerCase().includes(q) ?? false)
      || (e.lastName?.toLowerCase().includes(q) ?? false)
      || (e.email?.toLowerCase().includes(q) ?? false);
    return matchRole && matchStatus && matchSearch;
  });

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="bg-card rounded-2xl border border-card-border p-6 animate-pulse h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{ar ? "إدارة الموظفين" : "Employees Management"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{ar ? "إضافة وتعديل بيانات الموظفين وصلاحياتهم" : "Manage staff members and their permissions"}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl shrink-0">
          <Plus className="w-4 h-4 me-2" />
          {ar ? "إضافة موظف" : "Add Employee"}
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-card-border p-5 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute top-3 left-3 text-muted-foreground" />
          <Input
            placeholder={ar ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
            className="rounded-xl ps-9 bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="w-full sm:w-auto flex gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px] rounded-xl bg-background">
              <SelectValue placeholder={ar ? "الدور" : "Role"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع الأدوار" : "All Roles"}</SelectItem>
              {Object.keys(ROLE_LABELS).map(k => (
                <SelectItem key={k} value={k}>{ar ? ROLE_LABELS[k].ar : ROLE_LABELS[k].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] rounded-xl bg-background">
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع الحالات" : "All Statuses"}</SelectItem>
              <SelectItem value="active">{ar ? "نشط" : "Active"}</SelectItem>
              <SelectItem value="inactive">{ar ? "غير نشط" : "Inactive"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">{ar ? "الموظف" : "Employee"}</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">{ar ? "التواصل" : "Contact"}</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">{ar ? "الدور والقسم" : "Role & Dept"}</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">{ar ? "الحالة" : "Status"}</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {!filtered?.length ? (
                <tr><td colSpan={5} className="text-center py-16 text-muted-foreground">{ar ? "لا يوجد موظفين" : "No employees found"}</td></tr>
              ) : (
                filtered.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                          {(emp.firstName?.[0] ?? emp.email?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">ID: #{emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-muted-foreground text-xs">
                        {emp.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{emp.phone}</span>}
                        {emp.email && <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{emp.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${ROLE_LABELS[emp.role]?.color || "bg-muted text-muted-foreground border-border"}`}>
                          {ar ? ROLE_LABELS[emp.role]?.ar || emp.role : ROLE_LABELS[emp.role]?.en || emp.role}
                        </span>
                        {emp.department && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" /> {emp.department}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={emp.status === "active"} 
                          onCheckedChange={() => handleToggleStatus(emp.id, emp.status)}
                        />
                        <span className={`text-xs font-medium ${emp.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>
                          {emp.status === "active" ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(emp)} className="rounded-xl hover:bg-muted">
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingId ? (ar ? "تعديل بيانات الموظف" : "Edit Employee") : (ar ? "إضافة موظف جديد" : "Add New Employee")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-5 py-4">
            <div className="space-y-2">
              <Label>{ar ? "الاسم الأول" : "First Name"}</Label>
              <Input 
                value={formData.firstName} 
                onChange={e => setFormData({...formData, firstName: e.target.value})} 
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "الاسم الأخير" : "Last Name"}</Label>
              <Input 
                value={formData.lastName} 
                onChange={e => setFormData({...formData, lastName: e.target.value})} 
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>{ar ? "البريد الإلكتروني" : "Email"}</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "رقم الهاتف" : "Phone"}</Label>
              <Input 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "القسم" : "Department"}</Label>
              <Input 
                value={formData.department} 
                onChange={e => setFormData({...formData, department: e.target.value})} 
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "الدور (الصلاحية)" : "Role"}</Label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_LABELS).map(k => (
                    <SelectItem key={k} value={k}>{ar ? ROLE_LABELS[k].ar : ROLE_LABELS[k].en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{ar ? "الحالة" : "Status"}</Label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{ar ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="inactive">{ar ? "غير نشط" : "Inactive"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} className="rounded-xl" disabled={createEmployee.isPending || updateEmployee.isPending}>
              {ar ? "حفظ البيانات" : "Save Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
