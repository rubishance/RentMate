import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "../../hooks/useTranslation";
import {
  CalendarIcon as Calendar,
  ClockIcon as Clock,
  TrashIcon as Trash,
  EditIcon as Edit,
  CheckCircle2,
  XCircle,
  Loader2,
  ReceiptIcon,
  ArrowRight,
  User,
  Download,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Zap,
  CreditCard,
  FileText,
  Building,
  MapPin,
  Hash,
  Phone
} from "lucide-react";
import { CloseIcon as X } from "../icons/MessageIcons";
import { formatDate } from "../../lib/utils";
import type { Payment } from "../../types/database";
import { DatePicker } from "../ui/DatePicker";
import { DataFieldWidget } from "../ui/DataFieldWidget";
import { Button } from "../ui/Button";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { format, parseISO } from "date-fns";
import { PAYMENT_METHODS, getPaymentMethodConfig } from "../../constants/paymentMethods";

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onSuccess: () => Promise<void> | void;
  initialEditMode?: boolean;
  initialStatus?: Payment["status"];
  indexedAmount?: number | null;
}

export function PaymentDetailsModal({
  isOpen,
  onClose,
  payment,
  onSuccess,
  initialEditMode = false,
  initialStatus,
  indexedAmount,
}: PaymentDetailsModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    status: "pending" as Payment["status"],
    paid_amount: 0,
    payment_method: "",
    paid_date: "",
    reference: "",
    receipt_url: "",
    details: {} as Record<string, any>,
  });

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'primary' | 'danger' | 'warning' | 'info';
    icon: 'logout' | 'delete' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: 'primary',
    icon: 'warning',
    confirmText: '',
  });

  const [signedReceiptUrl, setSignedReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSignedUrl = async () => {
      if (!formData.receipt_url) {
        if (isMounted) setSignedReceiptUrl(null);
        return;
      }
      if (formData.receipt_url.startsWith('http')) {
        if (isMounted) setSignedReceiptUrl(formData.receipt_url);
        return;
      }
      try {
        const { data, error } = await supabase.storage
          .from('property-images')
          .createSignedUrl(formData.receipt_url, 3600);
        if (error) throw error;
        if (isMounted && data) {
          setSignedReceiptUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error fetching signed receipt url:', err);
      }
    };
    fetchSignedUrl();
    return () => { isMounted = false; };
  }, [formData.receipt_url]);

  useEffect(() => {
    if (payment) {
      setFormData({
        status: initialStatus && isOpen ? initialStatus : payment.status,
        paid_amount: payment.paid_amount || payment.amount,
        payment_method: payment.payment_method || "transfer",
        paid_date: payment.paid_date || new Date().toISOString().split("T")[0],
        reference: payment.reference || "",
        receipt_url: payment.receipt_url || "",
        details: payment.details || {},
      });
      setEditMode(initialEditMode && isOpen);
    }
  }, [payment, isOpen, initialEditMode, initialStatus]);

  const createReceiptDocument = async (method: string, amount: number, date: string, url: string) => {
    if (!url) return;
    try {
        const propertyId = (payment as any).contracts?.properties?.id || (payment as any).contracts?.property_id;
        if (!propertyId) {
            console.error("Missing propertyId. Cannot create receipt document.");
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let tenantName = t("unknown");
        if (Array.isArray((payment as any).contracts?.tenants)) {
            tenantName = (payment as any).contracts.tenants[0]?.name || t("unknown");
        } else if ((payment as any).contracts?.tenants?.name) {
            tenantName = (payment as any).contracts.tenants.name;
        }

        const fileName = url.split('/').pop() || 'receipt.jpg';

        const { data: existing } = await supabase
            .from('property_documents')
            .select('id')
            .eq('storage_path', url)
            .maybeSingle();

        if (existing) return;

        const { error: insertError } = await supabase.from('property_documents').insert({
            user_id: user.id,
            property_id: propertyId,
            category: 'receipt',
            storage_bucket: 'property-images',
            storage_path: url,
            file_name: fileName,
            title: `קבלה - ${(payment as any).contracts?.properties?.address || ''}`,
            amount: amount,
            document_date: date,
            vendor_name: tenantName,
            issue_type: method,
        });

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            throw insertError;
        }
    } catch (e) {
        console.error("Failed to create receipt document", e);
    }
  };

  const handleUpdate = async () => {
    if (!payment) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: formData.status,
          paid_amount: formData.paid_amount,
          payment_method: formData.payment_method,
          paid_date: formData.paid_date,
          reference: formData.reference,
          receipt_url: formData.receipt_url,
          details: formData.details,
        })
        .eq("id", payment.id);

      if (error) throw error;
      if (formData.status === 'paid' && formData.receipt_url) {
        await createReceiptDocument(formData.payment_method || (payment as any).contracts?.payment_method || 'transfer', formData.paid_amount || payment.amount, formData.paid_date || payment.due_date, formData.receipt_url);
      }
      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating payment:", error);
      alert(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async () => {
    if (!payment) return;
    setLoading(true);
    try {
      const expectedAmount = indexedAmount ?? payment.amount;
      const defaultMethod = payment.payment_method || (payment as any).contracts?.payment_method || null;

      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_amount: expectedAmount,
          payment_method: defaultMethod,
          paid_date: payment.due_date,
        })
        .eq("id", payment.id);

      if (error) throw error;
      if (formData.status === 'paid' && formData.receipt_url) {
        await createReceiptDocument(formData.payment_method || (payment as any).contracts?.payment_method || 'transfer', formData.paid_amount || payment.amount, formData.paid_date || payment.due_date, formData.receipt_url);
      }
      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Error quick approving payment:", error);
      alert(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!payment) return;
    
    if (payment.status === 'paid') {
      setConfirmModalConfig({
        isOpen: true,
        title: t("undo") || "ביטול פעולה",
        message: "האם ברצונך לבטל פרטי תשלום זה ולהחזירו לסטטוס ממתין לתשלום?",
        variant: 'primary',
        icon: 'warning',
        confirmText: "אישור",
      });
    } else {
      setConfirmModalConfig({
        isOpen: true,
        title: t("delete") || "מחיקה",
        message: "האם למחוק תשלום מצופה זה?",
        variant: 'primary',
        icon: 'delete',
        confirmText: "אישור",
      });
    }
  };

  const executeDelete = async () => {
    if (!payment) return;
    
    setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
    setIsDeleting(true);
    try {
      if (payment.status === 'paid') {
        // ... Revert to expected/pending payment and clear details
        const { error } = await supabase
          .from("payments")
          .update({
            status: "pending",
            paid_amount: null,
            paid_date: null,
            payment_method: null,
            reference: null,
            receipt_url: null,
            details: null
          })
          .eq("id", payment.id);
        if (error) throw error;
      } else {
        // Totally delete it
        const { error } = await supabase
          .from("payments")
          .delete()
          .eq("id", payment.id);
        if (error) throw error;
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Error deleting/reverting payment:", error);
      alert(t("error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setFormData(prev => ({ ...prev, receipt_url: filePath }));
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(t('error') || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  if (!payment) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6 mt-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-background rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto overflow-hidden flex flex-col max-h-[90vh] mt-auto sm:mt-0"
            >
              {/* Header */}
              <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-background/50 backdrop-blur-xl shrink-0">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t("paymentDetails")}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all text-rose-500"
                    title={t("delete")}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash className="w-5 h-5" />
                    )}
                  </button>
                  {!editMode && (
                    <button
                      onClick={() => {
                        setEditMode(true);
                        if (formData.status === 'pending' || formData.status === 'overdue') {
                          setFormData(prev => ({ 
                            ...prev, 
                            status: 'paid',
                            paid_amount: prev.paid_amount || indexedAmount || payment.amount,
                            paid_date: prev.paid_date || payment.due_date || new Date().toISOString().split("T")[0]
                          }));
                        }
                      }}
                      className="p-2 hover:bg-primary/10 rounded-xl transition-all text-primary"
                      title={t("edit")}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar pb-10 sm:pb-6">
                
                {/* ---------- DEEP BLUE BANNER ---------- */}
                <div className="bg-primary rounded-[1.5rem] md:rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-primary/20 shrink-0 mx-1 md:mx-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                    
                    {/* Status Badge */}
                    <div className={`absolute top-4 left-4 flex items-center gap-2 px-2 sm:px-6 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                      payment.status === 'paid' ? 'bg-emerald-400 text-emerald-950 border-emerald-300/50' : 
                      payment.status === 'overdue' ? 'bg-rose-400 text-rose-950 border-rose-300/50' : 
                      'bg-[#FFC107] text-amber-950'
                    }`}>
                       <span>{t(payment.status)}</span>
                       {payment.status === 'pending' && <Clock className="w-3.5 h-3.5 ml-0.5" />}
                       {payment.status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" />}
                       {payment.status === 'overdue' && <AlertCircle className="w-3.5 h-3.5 ml-0.5" />}
                    </div>

                    <div className="text-right pt-2 pl-24 mb-2 sm:mb-4 relative z-10">
                       <div className="text-primary-foreground/70 text-xs tracking-wider font-medium mb-0.5">
                          כתובת הנכס
                       </div>
                       <div className="text-primary-foreground text-xl md:text-2xl font-black tracking-tight leading-tight">
                         {(payment as any).contracts?.properties?.address || "-"}
                       </div>
                    </div>

                    {/* Tenant Box */}
                    <div className="bg-white/10 dark:bg-black/20 rounded-xl p-2 sm:p-6 flex items-center justify-between backdrop-blur-sm border border-white/10 relative z-10">
                       <div className="text-right flex-1 mr-2">
                          <div className="text-primary-foreground/70 text-xs font-medium mb-0.5">שם הדייר</div>
                          <div className="text-primary-foreground font-bold text-base leading-tight truncate px-1">
                            {Array.isArray((payment as any).contracts?.tenants)
                              ? (payment as any).contracts.tenants[0]?.name || t("unknown")
                              : (payment as any).contracts?.tenants?.name || t("unknown")}
                          </div>
                       </div>
                       <div className="text-left ml-2 flex flex-col items-end shrink-0">
                          <div className="text-primary-foreground/70 text-xs font-medium mb-0.5">סכום צפוי</div>
                          <div className="text-primary-foreground font-black text-lg leading-tight" dir="ltr">
                            {indexedAmount && indexedAmount !== payment.amount ? (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-bold text-primary-foreground/50 line-through">₪{payment.amount.toLocaleString()}</span>
                                    <span>₪{indexedAmount.toLocaleString()}</span>
                                </div>
                            ) : (
                                <span>₪{(indexedAmount ?? payment.amount).toLocaleString()}</span>
                            )}
                          </div>
                       </div>
                    </div>
                </div>

                {editMode ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 px-1">
                    
                    <div className="space-y-4">                      <div className="space-y-4">
                        <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                          {t("paymentPaidAmount")}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">
                            ש"ח
                          </span>
                          <input
                            type="number"
                            value={formData.paid_amount || ""}
                            onChange={(e) =>
                              setFormData((f) => ({
                                ...f,
                                paid_amount: e.target.value ? Number(e.target.value) : 0,
                              }))
                            }
                            className="w-full pl-14 pr-4 py-6 bg-background border border-border rounded-2xl text-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                      </div>

                      {formData.status === "paid" && (
                        <div className="space-y-4">
                          <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                            {t("paymentPaidDate")}
                          </label>
                          <DatePicker
                            value={
                              formData.paid_date
                                ? parseISO(formData.paid_date)
                                : undefined
                            }
                            onChange={(date) =>
                              setFormData((f) => ({
                                ...f,
                                paid_date: date
                                  ? format(date, "yyyy-MM-dd")
                                  : "",
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("paymentMethod")}
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            payment_method: e.target.value,
                          }))
                        }
                        className="w-full px-6 py-6 bg-background border border-border rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                      >
                        {PAYMENT_METHODS.map(pm => (
                          <option key={pm.id} value={pm.id}>{t(pm.labelKey as any)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Payment Details */}
                    {formData.payment_method && formData.payment_method !== "other" && formData.payment_method !== "cash" && formData.payment_method !== "paybox" && (
                      <div className="space-y-4 pt-6 border-t border-border/50">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                          {t("paymentDetailsTitle") || "פרטי אמצעי תשלום"}
                        </h3>
                        
                        {(formData.payment_method === 'transfer' || formData.payment_method === 'checks') && (
                          <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="space-y-4">
                              <label className="text-xs font-bold text-muted-foreground ml-1">{t("paymentBank") || "בנק"}</label>
                              <input
                                type="text"
                                value={formData.details?.bank || ""}
                                onChange={(e) => setFormData(f => ({ ...f, details: { ...f.details, bank: e.target.value } }))}
                                className="w-full px-6 py-2 sm:py-6 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                              />
                            </div>
                            <div className="space-y-4">
                              <label className="text-xs font-bold text-muted-foreground ml-1">{t("paymentBranch") || "סניף"}</label>
                              <input
                                type="text"
                                value={formData.details?.branch || ""}
                                onChange={(e) => setFormData(f => ({ ...f, details: { ...f.details, branch: e.target.value } }))}
                                className="w-full px-6 py-2 sm:py-6 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                              />
                            </div>
                            <div className="space-y-4">
                              <label className="text-xs font-bold text-muted-foreground ml-1">{t("paymentAccount") || "חשבון"}</label>
                              <input
                                type="text"
                                value={formData.details?.account || ""}
                                onChange={(e) => setFormData(f => ({ ...f, details: { ...f.details, account: e.target.value } }))}
                                className="w-full px-6 py-2 sm:py-6 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                              />
                            </div>
                          </div>
                        )}

                        {formData.payment_method === 'checks' && (
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground ml-1">{t("paymentCheckNum") || "מספר צ'ק"}</label>
                            <input
                              type="text"
                              value={formData.details?.checkNumber || ""}
                              onChange={(e) => setFormData(f => ({ ...f, details: { ...f.details, checkNumber: e.target.value } }))}
                              className="w-full px-6 py-2 sm:py-6 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                          </div>
                        )}

                        {(formData.payment_method === 'bit') && (
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground ml-1">{t("paymentPhoneNumber") || "מספר טלפון"}</label>
                            <input
                              type="tel"
                              value={formData.details?.phoneNumber || ""}
                              onChange={(e) => setFormData(f => ({ ...f, details: { ...f.details, phoneNumber: e.target.value } }))}
                              className="w-full px-6 py-2 sm:py-6 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                              dir="ltr"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-4 pt-6 border-t border-border/50">
                      <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                        פרטים נוספים
                      </label>
                      <input
                        type="text"
                        value={formData.reference}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            reference: e.target.value,
                          }))
                        }
                        className="w-full px-6 py-6 bg-background border border-border rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                    </div>

                    {/* Receipt Upload */}
                    <div className="space-y-4 pt-6 border-t border-border/50">
                        <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                          קובץ אסמכתא
                        </label>
                        
                        {formData.receipt_url ? (
                          <div className="relative rounded-2xl border border-border overflow-hidden group">
                            <div className="aspect-video w-full bg-muted/30 flex items-center justify-center">
                              {signedReceiptUrl && formData.receipt_url && formData.receipt_url.split('?')[0].match(/\.(jpeg|jpg|gif|png|webp|avif)$/i) ? (
                                <img src={signedReceiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                  <ReceiptIcon className="w-10 h-10 mb-2" />
                                  <span className="text-sm font-bold">מסמך מצורף</span>
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              {signedReceiptUrl && (
                                <a href={signedReceiptUrl} target="_blank" rel="noopener noreferrer" className="p-2 sm:p-6 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-colors">
                                  <Download className="w-5 h-5" />
                                </a>
                              )}
                              <button 
                                type="button"
                                onClick={() => setFormData(f => ({ ...f, receipt_url: "" }))} 
                                className="p-2 sm:p-6 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white backdrop-blur-md transition-colors"
                              >
                                <Trash className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileUpload}
                              disabled={uploading}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full p-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/20 hover:border-primary/50 transition-colors">
                              {uploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                              ) : (
                                <>
                                  <Upload className="w-8 h-8 mb-2 sm:mb-4 opacity-50" />
                                  <span className="text-sm font-bold">{t("paymentUploadReceipt")}</span>
                                  <span className="text-xs opacity-70 mt-1">לחץ לבחירת קובץ</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                ) : (
                  <>
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2.5 w-full mx-1 md:mx-0 pt-2">
                      <DataFieldWidget
                        label="תאריך תשלום"
                        value={payment.paid_date ? formatDate(payment.paid_date) : formatDate(payment.due_date)}
                        icon={<Calendar className="w-full h-full" />}
                      />
                      {(payment.payment_method || (payment as any).contracts?.payment_method) && (() => {
                        const m = payment.payment_method || (payment as any).contracts?.payment_method;
                        const pmConfig = getPaymentMethodConfig(m);
                        const PmIcon = pmConfig?.icon || CreditCard;
                        return (
                          <DataFieldWidget
                            label={t("method")}
                            value={t((pmConfig?.labelKey || m) as any)}
                            icon={<PmIcon className="w-full h-full" />}
                          />
                        );
                      })()}

                      {payment.status === "paid" && payment.reference && payment.reference.trim() !== "" && (
                        <DataFieldWidget
                          label="פרטים נוספים"
                          value={payment.reference}
                          icon={<FileText className="w-full h-full" />}
                        />
                      )}

                      {payment.status === "paid" && payment.details && Object.keys(payment.details).length > 0 && (
                        <>
                          {payment.payment_method === 'transfer' || payment.payment_method === 'checks' ? (
                            <>
                              {payment.details.bank && payment.details.bank.trim() !== "" && (
                                <DataFieldWidget
                                  label="בנק"
                                  value={payment.details.bank}
                                  icon={<Building className="w-full h-full" />}
                                />
                              )}
                              {payment.details.branch && payment.details.branch.trim() !== "" && (
                                <DataFieldWidget
                                  label="סניף"
                                  value={payment.details.branch}
                                  icon={<MapPin className="w-full h-full" />}
                                />
                              )}
                              {payment.details.account && payment.details.account.trim() !== "" && (
                                <DataFieldWidget
                                  label="חשבון"
                                  value={payment.details.account}
                                  icon={<Hash className="w-full h-full" />}
                                />
                              )}
                              {payment.details.checkNumber && payment.details.checkNumber.trim() !== "" && (
                                <DataFieldWidget
                                  label="מספר צ'ק"
                                  value={payment.details.checkNumber}
                                  icon={<FileText className="w-full h-full" />}
                                />
                              )}
                            </>
                          ) : (payment.payment_method === 'bit') ? (
                            payment.details.phoneNumber && payment.details.phoneNumber.trim() !== "" && (
                              <DataFieldWidget
                                label="מספר טלפון"
                                value={payment.details.phoneNumber}
                                icon={<Phone className="w-full h-full" />}
                              />
                            )
                          ) : null}
                        </>
                      )}
                    </div>

                    {/* Receipt Line */}
                    {payment.status === "paid" && payment.receipt_url && signedReceiptUrl && (
                      <div className="py-2 space-y-4.5 px-2 sm:px-6 mx-1 md:mx-0">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium text-sm md:text-base">אסמכתא שצורפה</span>
                          <a 
                            href={signedReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 px-6 py-2 rounded-xl transition-colors"
                          >
                            <ReceiptIcon className="w-4 h-4" /> צפייה באסמכתא
                          </a>
                        </div>
                      </div>
                    )}


                    {/* Difference Section */}
                    {!editMode && payment.status === "paid" && (
                       <div className="px-1 md:px-0">
                        {(() => {
                          const expectedAmount = indexedAmount ?? payment.amount;
                          const currentPaidAmount = payment.paid_amount || payment.amount;
                          const diff = currentPaidAmount - expectedAmount;

                          if (Math.abs(diff) > 1) {
                            const isOverpaid = diff > 0;
                            return (
                              <div className={`p-6 rounded-2xl flex flex-col items-center justify-center text-center ${isOverpaid ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
                                <span className={`text-xs md:text-sm font-black uppercase tracking-widest mb-1 ${isOverpaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                  {t('diff')} {isOverpaid ? '(עודף)' : '(חסר)'}
                                </span>
                                <span className={`text-xl font-black tracking-tight ${isOverpaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                  {isOverpaid ? '+' : ''}{diff.toLocaleString()} ש"ח
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                       </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-6 bg-slate-50 dark:bg-neutral-900/50 border-t border-slate-100 dark:border-white/5 shrink-0">
              {(editMode || payment.status !== "paid") && (
                <div className="flex flex-col gap-2 sm:gap-4">
                  {editMode ? (
                    <div className="flex gap-4">
                      <Button
                        variant="secondary"
                        onClick={() => setEditMode(false)}
                        className="flex-1 h-12 rounded-xl bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                      >
                        {t("cancel")}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleUpdate}
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl shadow-sm"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                        )}
                        {t("saveChanges")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        className="w-full h-12 bg-primary hover:bg-primary/95 text-white rounded-xl shadow-sm text-base font-bold"
                        onClick={handleQuickApprove}
                        disabled={loading || isDeleting}
                      >
                        <span className="flex flex-row items-center justify-center gap-2">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current shrink-0" />}
                          <span>אישור תשלום מהיר</span>
                        </span>
                      </Button>
                      
                      <Button 
                        variant="secondary"
                        className="w-full h-12 rounded-xl text-base font-bold bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 shadow-sm"
                        onClick={() => {
                          setEditMode(true);
                          if (formData.status === 'pending' || formData.status === 'overdue') {
                            setFormData(prev => ({ 
                              ...prev, 
                              status: 'paid',
                              paid_amount: prev.paid_amount || indexedAmount || payment.amount,
                              paid_date: prev.paid_date || payment.due_date || new Date().toISOString().split("T")[0]
                            }));
                          }
                        }}
                        disabled={loading || isDeleting}
                      >
                        עדכון פרטים ידני
                      </Button>
                    </>
                  )}
                </div>
              )}
              </div>
            </motion.div>
          </div>
        )}
    </AnimatePresence>
    
    <ConfirmActionModal
      isOpen={confirmModalConfig.isOpen}
      onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
      onConfirm={executeDelete}
      title={confirmModalConfig.title}
      message={confirmModalConfig.message}
      variant={confirmModalConfig.variant}
      icon={confirmModalConfig.icon}
      confirmText={confirmModalConfig.confirmText}
      isLoading={isDeleting}
    />
    </>
  );
}
