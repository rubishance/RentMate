import React, { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import {
  FileText,
  Calendar,
  User,
  Building2,
  Loader2,
  Save,
  ExternalLink,
  TrendingUp,
  Shield,
  Clock,
  Pen,
  Wind,
  ShieldCheck,
  Car,
  Archive,
  CheckCircle,
  Mail,
  Phone,
  CreditCard,
  GitBranch,
  Coins,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  MapPin,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { BalconyIcon, SafeRoomIcon, StorageIcon, CarIcon } from "../../components/icons/NavIcons";
import { getIndexValue } from "../../services/index-data.service";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "../../hooks/useTranslation";
import { DatePicker } from "../ui/DatePicker";
import { format, parseISO, addDays, addYears, isValid, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "../../lib/utils";
import { useDataCache } from "../../contexts/DataCacheContext";
import { PAYMENT_METHODS, getPaymentMethodConfig } from "../../constants/paymentMethods";
import { LINKAGE_TYPES, LINKAGE_SUB_TYPES } from "../../constants/linkageTypes";
import { propertyService } from "../../services/property.service";
import { getPropertyPlaceholder } from "../../lib/property-placeholders";
import { useSubscription } from "../../hooks/useSubscription";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { SegmentedControl } from "../ui/SegmentedControl";
import { useAuth } from "../../contexts/AuthContext";
import { CompressionService } from "../../services/compression.service";
import { EarlyTerminationModal } from "../modals/EarlyTerminationModal";
import { DataFieldWidget } from "../ui/DataFieldWidget";

interface ContractHubProps {
  contractId: string;
  initialReadOnly?: boolean;
}

export function ContractHub({
  contractId,
  initialReadOnly = true,
}: ContractHubProps) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { get, set, clear } = useDataCache();
  const { canAddActiveContract, refreshSubscription } = useSubscription();
  const [contract, setContract] = useState<any>(null);
  const [readOnly, setReadOnly] = useState(initialReadOnly);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTerminationModalOpen, setIsTerminationModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!contract?.contract_file_url) return;

      if (contract.contract_file_url.startsWith("http")) {
        setSignedUrl(contract.contract_file_url);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from("contracts")
          .createSignedUrl(contract.contract_file_url, 3600);

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error("Error fetching signed URL:", err);
      }
    };

    getSignedUrl();
  }, [contract?.contract_file_url]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      !e.target.files ||
      e.target.files.length === 0 ||
      !contract?.property_id
    )
      return;

    setIsUploading(true);
    let file = e.target.files[0];

    try {
      if (CompressionService.isImage(file)) {
        file = await CompressionService.compressImage(file);
      }
    } catch (error) {
      console.error("Compression failed:", error);
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `prop_${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = user ? `${user.id}/${fileName}` : fileName;

    try {
      // 1. Upload new image
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Update properties table
      const { error: dbError } = await supabase
        .from("properties")
        .update({ image_url: filePath })
        .eq("id", contract.property_id);

      if (dbError) throw dbError;

      // 3. Update local state
      setContract((prev: any) => ({
        ...prev,
        properties: { ...prev.properties, image_url: filePath },
      }));
    } catch (err: any) {
      console.error("Error uploading image:", err);
      alert(t("errorUnspecified") || "Failed to upload image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const [formData, setFormData] = useState({
    signing_date: "",
    start_date: "",
    end_date: "",
    base_rent: 0 as number | string,
    currency: "ILS",
    payment_frequency: "monthly",
    payment_day: 1 as number | string,
    payment_method: "",
    linkage_type: "none",
    linkage_sub_type: "known",
    base_index_date: "",
    base_index_value: 0,
    linkage_ceiling: "",
    linkage_floor: "",
    security_deposit_amount: 0 as number | string,
    status: "active",
    option_periods: [] as any[],
    rent_periods: [] as any[],
    tenants: [] as any[],

    special_clauses: "",
    guarantees: "",
    guarantors_info: "",
    needs_painting: false,
  });

  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) return;

      const cacheKey = `contract_detail_${contractId}`;
      const cached = get<any>(cacheKey);
      if (cached) {
        setContract(cached.contractData);
        setFormData(cached.formData);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("contracts")
          .select(
            `
                      *,
                      properties (
                          address, 
                          city, 
                          property_type, 
                          image_url,
                          has_balcony,
                          has_safe_room,
                          has_parking,
                          has_storage
                      )
                  `,
          )
          .eq("id", contractId)
          .single();

        if (error) {
          console.error("Error fetching contract:", error);
        } else {
          const newFormData = {
            signing_date: data.signing_date || "",
            start_date: data.start_date || "",
            end_date: data.end_date || "",
            base_rent: data.base_rent || 0,
            currency: data.currency || "ILS",
            payment_frequency: data.payment_frequency || "monthly",
            payment_day: data.payment_day || 1,
            payment_method: data.payment_method || "",
            linkage_type: data.linkage_type || "none",
            linkage_sub_type: data.linkage_sub_type || "known",
            base_index_date: data.base_index_date || "",
            base_index_value: data.base_index_value || 0,
            linkage_ceiling: data.linkage_ceiling?.toString() || "",
            linkage_floor: data.linkage_floor?.toString() || "",
            security_deposit_amount: data.security_deposit_amount || 0,
            status: data.status || "active",
            option_periods: data.option_periods || [],
            rent_periods: data.rent_periods || [],
            tenants: data.tenants || [],

            special_clauses: data.special_clauses || "",
            guarantees: data.guarantees || "",
            guarantors_info: data.guarantors_info || "",
            needs_painting: data.needs_painting ?? false,
          };
          setContract(data);
          setFormData(newFormData);
          set(cacheKey, { contractData: data, formData: newFormData }, { persist: true });
        }
      } catch (err) {
        console.error("Exception fetching contract:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  useEffect(() => {
    const fetchBaseIndex = async () => {
      if (!formData.base_index_date || formData.linkage_type === "none") {
        return;
      }
      
      const indexType = formData.linkage_type === 'cpi' ? 'cpi' : (formData.linkage_type === 'housing' ? 'housing' : null);
      if (!indexType) return;

      const value = await getIndexValue(indexType, formData.base_index_date);
      if (value !== null && value !== formData.base_index_value) {
        setFormData(prev => ({ ...prev, base_index_value: value }));
      }
    };

    fetchBaseIndex();
  }, [formData.base_index_date, formData.linkage_type]);

  const hasUnsavedChanges = () => {
    if (!contract || readOnly) return false;
    const originalFormData = {
      signing_date: contract.signing_date || "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      base_rent: contract.base_rent || 0,
      currency: contract.currency || "ILS",
      payment_frequency: contract.payment_frequency || "monthly",
      payment_day: contract.payment_day || 1,
      payment_method: contract.payment_method || "",
      linkage_type: contract.linkage_type || "none",
      linkage_sub_type: contract.linkage_sub_type || "known",
      base_index_date: contract.base_index_date || "",
      base_index_value: contract.base_index_value || 0,
      linkage_ceiling: contract.linkage_ceiling?.toString() || "",
      linkage_floor: contract.linkage_floor?.toString() || "",
      security_deposit_amount: contract.security_deposit_amount || 0,
      status: contract.status || "active",
      option_periods: contract.option_periods || [],
      rent_periods: contract.rent_periods || [],
      tenants: contract.tenants || [],
      special_clauses: contract.special_clauses || "",
      guarantees: contract.guarantees || "",
      guarantors_info: contract.guarantors_info || "",
      needs_painting: contract.needs_painting ?? false,
    };
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  const handleBack = () => {
    if (hasUnsavedChanges()) {
      if (
        window.confirm(
          t("unsavedChangesWarning") ||
          "You have unsaved changes. Are you sure you want to exit without saving?",
        )
      ) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const handleDeleteContract = async () => {
    if (
      !window.confirm(
        t("confirmDeleteContract") ||
        "Are you sure you want to delete this contract? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractId);

      if (error) throw error;
      clear();
      navigate(-1);
    } catch (err: any) {
      console.error("Error deleting contract:", err);
      alert(t("errorUnspecified") || "Failed to delete contract: " + err.message);
      setLoading(false);
    }
  };

  const handleTerminateEarly = async (actualEndDate: string, finalPaymentAmount: number) => {
    setLoading(true);
    setIsTerminationModalOpen(false);
    try {
      // 1. Update contract to archived with early termination date
      const { error: contractError } = await supabase
        .from("contracts")
        .update({
          status: 'archived',
          actual_end_date: actualEndDate,
          updated_at: new Date().toISOString()
        })
        .eq("id", contractId);

      if (contractError) throw contractError;

      // 2. Identify the termination month dates
      const termDate = parseISO(actualEndDate);
      const startOfTermStr = format(startOfMonth(termDate), 'yyyy-MM-dd');
      const endOfTermStr = format(endOfMonth(termDate), 'yyyy-MM-dd');

      // 3. Find pending payment within the termination month
      const { data: pendingPayments, error: fetchPendingError } = await supabase
        .from("payments")
        .select("id, due_date")
        .eq("contract_id", contractId)
        .eq("status", "pending")
        .gte("due_date", startOfTermStr)
        .lte("due_date", endOfTermStr);

      if (fetchPendingError) throw fetchPendingError;

      if (pendingPayments && pendingPayments.length > 0) {
        // If there's a pending payment for the termination month, update it
        if (finalPaymentAmount !== undefined && finalPaymentAmount >= 0) {
           const { error: updateError } = await supabase
              .from("payments")
              .update({
                 amount: finalPaymentAmount,
                 details: { type: "partial_early_termination" }
              })
              .eq("id", pendingPayments[0].id);

           if (updateError) throw updateError;
        }
      } else {
        // Fallback: If no pending payment exists for the month, insert one
        if (finalPaymentAmount !== undefined && finalPaymentAmount >= 0) {
           const { error: insertError } = await supabase
            .from("payments")
            .insert([{
               contract_id: contractId,
               user_id: contract.user_id,
               amount: finalPaymentAmount,
               currency: contract.currency || "ILS",
               due_date: actualEndDate, // Fallback to termination date
               status: "pending",
               details: { type: "partial_early_termination" }
            }]);
           if (insertError) throw insertError;
        }
      }

      // 4. Clear future pending payments (after the termination month)
      const { error: deleteError } = await supabase
        .from("payments")
        .delete()
        .eq("contract_id", contractId)
        .eq("status", "pending")
        .gt("due_date", endOfTermStr);

      if (deleteError) throw deleteError;
      
      // 5. Update property occupancy
      if (contract.property_id) {
        await propertyService.syncOccupancyStatus(contract.property_id, contract.user_id);
      }
      
      clear();
      // Refetch
      const { data, error: fetchError } = await supabase
        .from("contracts")
        .select("*, properties(address, city)")
        .eq("id", contractId)
        .single();
        
      if (fetchError) console.error("Error re-fetching contract:", fetchError);
      if (data) {
          setContract(data);
          setReadOnly(true);
          setFormData(prev => ({...prev, status: 'archived'}));
      }
      
    } catch (err: any) {
      console.error("Error early terminating:", err);
      alert(t("errorUnspecified") || "Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateContract = async () => {
    if (
      !window.confirm(
        lang === "he"
          ? "האם אתה בטוח שברצונך להפעיל מחדש את החוזה? פעולה זו תיצור מחדש את התשלומים שנותרו (יתכן ותצטרך לערוך את החוזה במידה ונוצרו פערים בתשלומים)."
          : "Are you sure you want to reactivate this contract? This will regenerate the remaining payments."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      setLoading(true);
      await refreshSubscription();
      if (!canAddActiveContract) {
        alert(
          t("error_limit_active_contracts") ||
          "Limit Reached: You cannot have more active contracts on your current plan."
        );
        return;
      }

      const { count, error: countError } = await supabase
        .from("contracts")
        .select("id", { count: 'exact' })
        .eq("property_id", contract.property_id)
        .eq("status", "active")
        .neq("id", contractId);
        
      if (countError) throw countError;
      if (count && count > 0) {
        alert(lang === 'he' ? "לא ניתן להחזיר לפעיל: קיים כבר חוזה פעיל עבור נכס זה." : "Cannot unarchive: An active contract already exists for this property.");
        return;
      }

      const { error: contractError } = await supabase
        .from("contracts")
        .update({
          status: 'active',
          actual_end_date: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", contractId);

      if (contractError) throw contractError;

      let gapStart = contract.actual_end_date
          ? format(addDays(parseISO(contract.actual_end_date), 1), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd");

      if (gapStart > contract.end_date) {
        // If the contract has already naturally expired, we still reactivated it above!
        // But we cannot generate NEW regular payments because gapStart is beyond end_date.
        alert(lang === 'he' ? "החוזה הוחזר לפעיל, אך תאריך הסיום כבר עבר ולכן לא נוצרו תשלומים עתידיים. אנא ערוך את תאריך הסיום כדי לייצר תשלומים נוספים." : "Contract reactivated, but its end date is in the past. No future payments were generated. Extend the lease to generate additional payments.");
      } else {
        const { data: genData, error: genError } =
          await supabase.functions.invoke("generate-payments", {
            body: {
              startDate: gapStart,
              endDate: contract.end_date,
              baseRent: Number(formData.base_rent) || 1, // Fallback to 1 to bypass !baseRent error if 0
              currency: formData.currency || "ILS",
              paymentFrequency: formData.payment_frequency || "monthly",
              paymentDay: Number(formData.payment_day) || 1,
              linkageType: formData.linkage_type || "none",
              linkageSubType:
                formData.linkage_type === "none"
                  ? null
                  : formData.linkage_sub_type,
              baseIndexDate: formData.base_index_date || null,
              baseIndexValue: Number(formData.base_index_value) || null,
              linkageCeiling: formData.linkage_ceiling !== "" && formData.linkage_ceiling !== null
                  ? Number(formData.linkage_ceiling)
                  : null,
              linkageFloor: formData.linkage_floor !== "" && formData.linkage_floor !== null
                  ? Number(formData.linkage_floor)
                  : null,
              rent_periods: formData.rent_periods || [],
            },
          });

        if (genError) {
          let msg = genError.message;
          try {
             if (genError.context && typeof genError.context.text === 'function') {
                const rawBody = await genError.context.text();
                msg += ` - raw: ${rawBody}`;
             }
          } catch(e) {}
          throw new Error(`Extension Gen Error: ${msg}`);
        }
        
        const schedule = genData?.payments || [];

        if (schedule.length > 0) {
          const { error: insertError } = await supabase
            .from("payments")
            .insert(
              schedule.map((p: any) => ({
                ...p,
                contract_id: contractId,
                user_id: contract.user_id,
              }))
            );
          if (insertError) throw insertError;
        } else {
            console.warn("Generate-payments returned empty schedule array for gapStart:", gapStart, "and end_date:", contract.end_date);
            alert(lang === 'he' ? "שגיאה זמנית: תשלומים עתידיים לא נוצרו בהצלחה." : "Notice: Contract active but no future payments were computed.");
        }
      }

      if (contract.property_id) {
        await propertyService.syncOccupancyStatus(contract.property_id, contract.user_id);
      }
      
      clear();
      const { data, error: fetchError } = await supabase
        .from("contracts")
        .select("*, properties(address, city)")
        .eq("id", contractId)
        .single();
        
      if (fetchError) console.error("Error re-fetching contract:", fetchError);
      if (data) {
          setContract(data);
          setReadOnly(true);
          setFormData(prev => ({...prev, status: 'active'}));
      }
      
    } catch (err: any) {
      console.error("Error reactivating:", err);
      alert("Error: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges()) {
      if (
        window.confirm(
          t("unsavedChangesWarning") ||
          "You have unsaved changes. Are you sure you want to exit without saving?",
        )
      ) {
        setReadOnly(true);
        setFormData({
          signing_date: contract.signing_date || "",
          start_date: contract.start_date || "",
          end_date: contract.end_date || "",
          base_rent: contract.base_rent || 0,
          currency: contract.currency || "ILS",
          payment_frequency: contract.payment_frequency || "monthly",
          payment_day: contract.payment_day || 1,
          payment_method: contract.payment_method || "",
          linkage_type: contract.linkage_type || "none",
          linkage_sub_type: contract.linkage_sub_type || "known",
          base_index_date: contract.base_index_date || "",
          base_index_value: contract.base_index_value || 0,
          linkage_ceiling: contract.linkage_ceiling?.toString() || "",
          linkage_floor: contract.linkage_floor?.toString() || "",
          security_deposit_amount: contract.security_deposit_amount || 0,
          status: contract.status || "active",
          option_periods: contract.option_periods || [],
          rent_periods: contract.rent_periods || [],
          tenants: contract.tenants || [],
          special_clauses: contract.special_clauses || "",
          guarantees: contract.guarantees || "",
          guarantors_info: contract.guarantors_info || "",
          needs_painting: contract.needs_painting ?? false,
        });
      }
    } else {
      setReadOnly(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contractId) {
      alert(t("error_missing_id") || "System Error: Missing Contract ID");
      return;
    }

    if (contract.status === "archived" && formData.status === "active") {
      await refreshSubscription();
      if (!canAddActiveContract) {
        alert(
          t("error_limit_active_contracts") ||
          "Limit Reached: You cannot have more active contracts on your current plan.",
        );
        return;
      }
      
      // Check if another active contract exists for this property
      const { count, error: countError } = await supabase
        .from("contracts")
        .select("*", { count: 'exact', head: true })
        .eq("property_id", contract.property_id)
        .eq("status", "active")
        .neq("id", contractId);
        
      if (countError) throw countError;
      if (count && count > 0) {
        alert(lang === 'he' ? "לא ניתן להחזיר לפעיל: קיים כבר חוזה פעיל עבור נכס זה." : "Cannot unarchive: An active contract already exists for this property.");
        return;
      }
    }

    setSaving(true);
    try {
      const updates: any = {
        signing_date: formData.signing_date || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        base_rent: Number(formData.base_rent),
        currency: formData.currency,
        payment_frequency: formData.payment_frequency,
        payment_day: Number(formData.payment_day),
        payment_method: formData.payment_method || null,
        linkage_type: formData.linkage_type,
        linkage_sub_type: formData.linkage_sub_type || null,
        base_index_date: formData.base_index_date || null,
        base_index_value:
          formData.linkage_type !== "none"
            ? Number(formData.base_index_value)
            : null,
        linkage_ceiling:
          formData.linkage_ceiling !== "" && formData.linkage_ceiling !== null
            ? Number(formData.linkage_ceiling)
            : null,
        linkage_floor:
          formData.linkage_floor !== "" && formData.linkage_floor !== null
            ? Number(formData.linkage_floor)
            : null,
        security_deposit_amount: Number(formData.security_deposit_amount),
        status: formData.status,
        option_periods: formData.option_periods,
        rent_periods: formData.rent_periods,
        tenants: formData.tenants,

        special_clauses: formData.special_clauses,
        guarantees: formData.guarantees,
        guarantors_info: formData.guarantors_info,
        needs_painting: formData.needs_painting,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("contracts")
        .update(updates)
        .eq("id", contractId);

      if (error) throw error;

      const originalEndDate = contract.end_date;
      const newEndDate = formData.end_date;

      if (newEndDate < originalEndDate) {
        const { error: deleteError } = await supabase
          .from("payments")
          .delete()
          .eq("contract_id", contractId)
          .eq("status", "pending")
          .gt("due_date", newEndDate);
        if (deleteError)
          console.error(
            "[ContractHub] Error cleaning up payments:",
            deleteError,
          );
      } else if (newEndDate > originalEndDate) {
        const gapStart = format(
          addDays(parseISO(originalEndDate), 1),
          "yyyy-MM-dd",
        );
        try {
          const { data: genData, error: genError } =
            await supabase.functions.invoke("generate-payments", {
              body: {
                startDate: gapStart,
                endDate: newEndDate,
                baseRent: Number(formData.base_rent),
                currency: formData.currency,
                paymentFrequency: formData.payment_frequency,
                paymentDay: Number(formData.payment_day),
                linkageType: formData.linkage_type,
                linkageSubType:
                  formData.linkage_type === "none"
                    ? null
                    : formData.linkage_sub_type,
                baseIndexDate: formData.base_index_date || null,
                baseIndexValue: Number(formData.base_index_value),
                linkageCeiling: formData.linkage_ceiling
                  ? Number(formData.linkage_ceiling)
                  : null,
                linkageFloor: formData.linkage_floor
                  ? Number(formData.linkage_floor)
                  : null,
                rent_periods: formData.rent_periods,
              },
            });

          if (genError)
            throw new Error(`Extension Gen Error: ${genError.message}`);
          const schedule = genData?.payments || [];

          if (schedule.length > 0) {
            const { error: insertError } = await supabase
              .from("payments")
              .insert(
                schedule.map((p: any) => ({
                  ...p,
                  contract_id: contractId,
                  user_id: contract.user_id,
                })),
              );

            if (insertError) throw insertError;
          }
        } catch (genError) {
          console.error(
            "[ContractHub] Error generating extension payments:",
            genError,
          );
        }
      }

      if (formData.status !== contract.status) {
        await propertyService.syncOccupancyStatus(
          contract.property_id,
          contract.user_id,
        );
      }

      setReadOnly(true);
      clear();

      const { data, error: fetchError } = await supabase
        .from("contracts")
        .select("*, properties(address, city)")
        .eq("id", contractId)
        .single();

      if (fetchError) console.error("Error re-fetching contract:", fetchError);
      if (data) setContract(data);
    } catch (error: any) {
      console.error("Error updating contract:", error);
      alert(`Failed to update contract: ${error.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-12 text-center">
        <p className="text-destructive font-bold">Contract not found</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background dark:bg-black min-h-screen -mt-4 md:-mt-8",
      )}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      {/* Top App Bar */}
      <div className="px-4 py-4 md:px-6 bg-white dark:bg-neutral-900 flex justify-between items-center sticky top-0 z-10 shadow-[0_4px_12px_rgba(13,71,161,0.03)] border-b border-border/50">
        <div className="flex items-center gap-2">
          <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="w-10 h-10 rounded-full hover:bg-secondary/10 text-primary flex items-center justify-center transition-colors">
              <MoreVertical className="w-5 h-5" />
            </MenuButton>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <MenuItems
                className={cn(
                  "absolute z-[100] mt-2 w-48 rounded-2xl bg-white dark:bg-neutral-900 shadow-lg border border-border/50 focus:outline-none p-2",
                  lang === "he" ? "right-0 origin-top-right" : "left-0 origin-top-left"
                )}
              >
                {readOnly && (
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        onClick={() => setReadOnly(false)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-2 sm:px-4 py-2.5 text-[15px] font-medium transition-colors text-foreground hover:bg-secondary/50",
                          focus ? "bg-secondary/50" : ""
                        )}
                      >
                        <Pen className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                        <span className="flex-1 text-start">
                          {t("editContract") || (lang === "he" ? "עריכת חוזה" : "Edit Contract")}
                        </span>
                      </button>
                    )}
                  </MenuItem>
                )}

                {readOnly && <div className="h-px bg-slate-100 dark:bg-neutral-800 my-1 mx-2" />}

                {readOnly && contract.status === 'active' && (
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        onClick={(e) => { e.preventDefault(); setIsTerminationModalOpen(true); }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-2 sm:px-4 py-2.5 text-[15px] font-medium transition-colors text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20",
                          focus ? "bg-amber-50 dark:bg-amber-900/20" : ""
                        )}
                      >
                        <Archive className="w-4 h-4 shrink-0" /> 
                        <span className="flex-1 text-start">
                          {lang === "he" ? "סיום חוזה מוקדם (ארכיון)" : "End Contract Early"}
                        </span>
                      </button>
                    )}
                  </MenuItem>
                )}

                {readOnly && contract.status === 'archived' && (
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        onClick={(e) => { e.preventDefault(); handleReactivateContract(); }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-2 sm:px-4 py-2.5 text-[15px] font-medium transition-colors text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                          focus ? "bg-emerald-50 dark:bg-emerald-900/20" : ""
                        )}
                      >
                        <RefreshCw className="w-4 h-4 shrink-0" /> 
                        <span className="flex-1 text-start">
                          {lang === "he" ? "הפעל מחדש את החוזה" : "Reactivate Contract"}
                        </span>
                      </button>
                    )}
                  </MenuItem>
                )}

                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={handleDeleteContract}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-2 sm:px-4 py-2.5 text-[15px] font-medium transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
                        focus ? "bg-red-50 dark:bg-red-900/20" : ""
                      )}
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-start">
                        {lang === "he" ? "מחיקת חוזה" : "Delete Contract"}
                      </span>
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Transition>
          </Menu>

          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/10 text-primary transition-colors"
              title={lang === "he" ? "צפייה בחוזה" : "View PDF"}
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>

        <h1 className="text-lg font-bold text-primary dark:text-white absolute left-1/2 -translate-x-1/2 whitespace-nowrap hidden sm:block">
          {t("contractDetails")}
        </h1>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="w-10 h-10 rounded-full hover:bg-secondary/10 text-primary"
        >
          <ArrowRight className={cn("w-5 h-5", lang === "he" ? "" : "rotate-180")} />
        </Button>
      </div>

      {/* Main Form Content Container */}
      <form
        onSubmit={handleSave}
        className="flex-1 p-4 md:p-6 space-y-6 pb-[140px] lg:pb-24 max-w-2xl mx-auto w-full"
      >
        {/* 1. Property Address & Status Card */}
        <div className="bg-primary border border-primary p-4 sm:p-6 rounded-[1.5rem] shadow-[0_4px_24px_rgba(13,71,161,0.06)] flex flex-col items-start text-start relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 w-full flex flex-col items-start text-start">
            <h2 className="text-[22px] sm:text-[26px] leading-[1.2] font-black text-white text-start tracking-tight mb-2 sm:mb-4 mt-0">
              {(contract.properties?.address && contract.properties?.city)
                ? `${contract.properties.address}, ${contract.properties.city}`
                : (contract.properties?.name || t("unnamedProperty"))}
            </h2>
            <div
              className={cn(
                "flex flex-row px-2 sm:px-4 py-1 bg-white/10 rounded-full text-[14px] font-bold items-center gap-2 border border-white/5 shadow-sm w-fit text-white transition-all hover:bg-white/20",
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full shadow-sm",
                  contract.status === "active"
                    ? "bg-[#4ade80]" // Emerald green
                    : contract.status === "draft"
                      ? "bg-warning"
                      : "bg-slate-300",
                )}
              />
              <span>{t(contract.status)}</span>
            </div>
          </div>
        </div>

        {/* 2. Tenant Details Section */}
        <Card className="rounded-[2rem] border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-6 pb-2 flex justify-start items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <User className="w-5 h-5 pointer-events-none" />
              </div>
              <div className="flex flex-col items-start text-start">
                <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">{t("tenantDetails")}</h3>
              </div>
            </div>

            <div className="p-6 pt-0 space-y-6">
              {formData.tenants.length > 0 ? (
                formData.tenants.map((tenant: any, idx: number) => (
                  <div key={idx} className={cn("relative", idx > 0 && "pt-6 border-t border-slate-100 dark:border-neutral-800")}>
                    {!readOnly && formData.tenants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                            const newTenants = [...formData.tenants];
                            newTenants.splice(idx, 1);
                            setFormData({ ...formData, tenants: newTenants });
                        }}
                        className="absolute -top-3 left-0 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all z-10"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {!readOnly ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {(!readOnly || tenant.name || tenant.full_name) && (
                          <Input
                            label={t("fullName")}
                            readOnly={readOnly}
                            value={tenant.name ?? tenant.full_name ?? ""}
                            onChange={(e) => {
                              const newTenants = [...formData.tenants];
                              newTenants[idx] = {
                                ...newTenants[idx],
                                name: e.target.value,
                              };
                              setFormData({ ...formData, tenants: newTenants });
                            }}
                            placeholder={t("name")}
                          />
                        )}
                        {(!readOnly || tenant.email) && (
                          <Input
                            label={t("email")}
                            readOnly={readOnly}
                            value={tenant.email ?? ""}
                            onChange={(e) => {
                              const newTenants = [...formData.tenants];
                              newTenants[idx] = {
                                ...newTenants[idx],
                                email: e.target.value,
                              };
                              setFormData({ ...formData, tenants: newTenants });
                            }}
                            leftIcon={
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            }
                          />
                        )}
                        {(!readOnly || tenant.phone) && (
                          <Input
                            label={t("phone")}
                            readOnly={readOnly}
                            value={tenant.phone ?? ""}
                            onChange={(e) => {
                              const newTenants = [...formData.tenants];
                              newTenants[idx] = {
                                ...newTenants[idx],
                                phone: e.target.value,
                              };
                              setFormData({ ...formData, tenants: newTenants });
                            }}
                            leftIcon={
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            }
                          />
                        )}
                        {(!readOnly || tenant.id_number) && (
                          <Input
                            label={t("idNumber")}
                            readOnly={readOnly}
                            value={tenant.id_number ?? ""}
                            onChange={(e) => {
                              const newTenants = [...formData.tenants];
                              newTenants[idx] = {
                                ...newTenants[idx],
                                id_number: e.target.value,
                              };
                              setFormData({ ...formData, tenants: newTenants });
                            }}
                            leftIcon={
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5 text-start w-full mt-2">
                        {(tenant.name || tenant.full_name) && (
                          <DataFieldWidget
                            label={t("fullName")}
                            icon={<User className="w-full h-full" />}
                            value={tenant.name || tenant.full_name}
                          />
                        )}
                        {tenant.id_number && (
                          <DataFieldWidget
                            label={t("idNumber")}
                            icon={<CreditCard className="w-full h-full" />}
                            value={tenant.id_number}
                          />
                        )}
                        {tenant.phone && (
                          <DataFieldWidget
                            label={t("phone")}
                            icon={<Phone className="w-full h-full" />}
                            value={<span dir="ltr" className="inline-block text-right w-full">{tenant.phone}</span>}
                          />
                        )}
                        {tenant.email && (
                          <DataFieldWidget
                            label={t("email")}
                            icon={<Mail className="w-full h-full" />}
                            value={<span dir="ltr" className="inline-block text-right w-full font-serif font-medium">{tenant.email}</span>}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center pt-4">
                  <p className="text-muted-foreground">{t("noTenantsListed")}</p>
                </div>
              )}
              
              {!readOnly && (
                <div className="pt-4 flex justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        tenants: [
                          ...formData.tenants,
                          { name: "", id_number: "", email: "", phone: "" }
                        ]
                      });
                    }}
                    className="gap-2 text-brand-600 border-brand-200 hover:bg-brand-50"
                  >
                    <Plus className="w-4 h-4" />
                    {t("addTenant")}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Contract Dates Section */}
        <Card className="rounded-[2rem] border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-6 pb-2 flex justify-start items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Calendar className="w-5 h-5 pointer-events-none" />
              </div>
              <div className="flex flex-col items-start text-start">
                <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">{t("contractPeriod")}</h3>
              </div>
            </div>

            <div className="p-6 pt-2">
              {!readOnly ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("startDate")}
                    </label>
                    <DatePicker
                      value={
                        formData.start_date
                          ? parseISO(formData.start_date)
                          : undefined
                      }
                      onChange={(date) =>
                        setFormData({
                          ...formData,
                          start_date: date ? format(date, "yyyy-MM-dd") : "",
                        })
                      }
                      readonly={readOnly}
                      placeholder={t("startDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("endDate")}
                    </label>
                    <DatePicker
                      value={
                        formData.end_date
                          ? parseISO(formData.end_date)
                          : undefined
                      }
                      onChange={(date) =>
                        setFormData({
                          ...formData,
                          end_date: date ? format(date, "yyyy-MM-dd") : "",
                        })
                      }
                      readonly={readOnly}
                      placeholder={t("endDate")}
                    />
                  </div>
                  {(!readOnly || formData.signing_date) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("signingDate")}
                      </label>
                      <DatePicker
                        value={
                          formData.signing_date
                            ? parseISO(formData.signing_date)
                            : undefined
                        }
                        onChange={(date) =>
                          setFormData({
                            ...formData,
                            signing_date: date ? format(date, "yyyy-MM-dd") : "",
                          })
                        }
                        readonly={readOnly}
                        placeholder={t("signingDate")}
                      />
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex flex-col gap-2.5 text-start w-full mt-2">
                  <DataFieldWidget
                    label={t("signingDate")}
                    value={formData.signing_date ? format(parseISO(formData.signing_date), "dd/MM/yyyy") : "-"}
                    icon={<Pen className="w-full h-full" />}
                  />
                  <DataFieldWidget
                    label={t("startDate")}
                    value={formData.start_date ? format(parseISO(formData.start_date), "dd/MM/yyyy") : "-"}
                    icon={<Calendar className="w-full h-full" />}
                  />
                  <DataFieldWidget
                    label={t("endDate")}
                    value={formData.end_date ? format(parseISO(formData.end_date), "dd/MM/yyyy") : "-"}
                    icon={<Calendar className="w-full h-full" />}
                    valueClassName={contract.actual_end_date ? "line-through opacity-50 decoration-slate-400/70" : undefined}
                  />

                  {contract.actual_end_date && (
                    <DataFieldWidget
                      label={lang === 'he' ? "תאריך סיום בפועל (סיום מוקדם)" : "Actual End Date (Early)"}
                      value={format(parseISO(contract.actual_end_date), "dd/MM/yyyy")}
                      icon={<Archive className="w-full h-full" />}
                      className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                      valueClassName="text-amber-900 dark:text-amber-400"
                    />
                  )}
                </div>
              )}

              {/* Duration Display */}
              {formData.start_date && formData.end_date && (
                <div className="mt-8 p-2 sm:p-4 bg-secondary/10 dark:bg-neutral-800/50 rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{t("duration")}: </span>
                  <span className="font-bold text-foreground">
                    {(() => {
                      const start = new Date(formData.start_date);
                      const end = new Date(contract.actual_end_date || formData.end_date);
                      const diffTime = Math.abs(
                        end.getTime() - start.getTime(),
                      );
                      const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                      );
                      const months = Math.floor(diffDays / 30);
                      return diffDays > 360
                        ? `~${(diffDays / 365).toFixed(1)} ${t("years")}`
                        : `${months} ${t("months")}`;
                    })()}
                  </span>
                </div>
              )}


              {/* First Period Payment Details (Moved below Duration) */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-neutral-800">
                {!readOnly ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("amount") || "שכר דירה חודשי"}
                      </label>
                      <Input
                        type="number"
                        readOnly={readOnly}
                        value={formData.base_rent}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            base_rent: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        leftIcon={<span className="text-sm font-bold">₪</span>}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("paymentDay") || "יום בחודש לתשלום"}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        readOnly={readOnly}
                        value={formData.payment_day}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_day: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 text-start w-full">
                    <DataFieldWidget
                      label={t("monthlyRent") || "שכר דירה חודשי"}
                      value={`₪${Number(formData.base_rent).toLocaleString()}`}
                      icon={<Coins className="w-full h-full" />}
                      valueClassName="text-brand-600 dark:text-brand-400"
                    />
                    <DataFieldWidget
                      label={t("paymentDay") || "יום תשלום"}
                      value={formData.payment_day}
                      icon={<Calendar className="w-full h-full" />}
                    />
                  </div>
                )}
              </div>
            </div>


            {/* Contract Dates Option Extensions merged */}
            {(formData.option_periods.length > 0 || !readOnly) && (
              <div className="border-t border-slate-100 dark:border-neutral-800">
                {/* Header */}
              <div className="p-6 pb-2 flex justify-start items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <Shield className="w-5 h-5 pointer-events-none" />
                </div>
                <div className="flex flex-col items-end">
                  <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">{t("optionPeriods")}</h3>
                </div>
              </div>

              <div className="p-6 pt-2 space-y-4">
                {formData.option_periods.length > 0 ? (
                  <div className="space-y-3">
                    {formData.option_periods.map((option: any, idx: number) => (
                      !readOnly ? (
                        <div
                          key={idx}
                          className="bg-secondary/5 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[1.5rem] p-4 flex flex-col gap-4"
                        >
                          <div className="flex-1 flex flex-col gap-4">
                            <div className="flex justify-between items-center border-b border-border/50 pb-3">
                              <span className="font-bold text-sm text-foreground">
                                {t("optionPeriod")} {idx + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-red-500/10 rounded-full"
                                onClick={() => {
                                  const newPeriods =
                                    formData.option_periods.filter(
                                      (_: any, i: number) => i !== idx,
                                    );
                                  setFormData({
                                    ...formData,
                                    option_periods: newPeriods,
                                  });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[13px] font-bold text-muted-foreground uppercase block">
                                  {t("endDate")}
                                </label>
                                <DatePicker
                                  value={
                                    option.endDate
                                      ? parseISO(option.endDate)
                                      : undefined
                                  }
                                  onChange={(date) => {
                                    const newPeriods = formData.option_periods.map((op: any, i: number) =>
                                      i === idx ? { ...op, endDate: date ? format(date, "yyyy-MM-dd") : "" } : op
                                    );
                                    setFormData({
                                      ...formData,
                                      option_periods: newPeriods,
                                    });
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[13px] font-bold text-muted-foreground uppercase block">
                                  {t("optionRent")}
                                </label>
                                  <Input
                                    type="number"
                                    value={option.rentAmount || ""}
                                    onChange={(e) => {
                                      const newPeriods = formData.option_periods.map((op: any, i: number) =>
                                        i === idx ? { ...op, rentAmount: e.target.value ? Number(e.target.value) : undefined } : op
                                      );
                                      setFormData({
                                        ...formData,
                                        option_periods: newPeriods,
                                      });
                                    }}
                                  leftIcon={
                                    <span className="text-sm font-bold">₪</span>
                                  }
                                  className="bg-background"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[13px] font-bold text-muted-foreground uppercase block">
                                  {t("optionNoticeDays")}
                                </label>
                                <Input
                                  type="number"
                                  value={option.noticeDays || ""}
                                  onChange={(e) => {
                                    const newPeriods = formData.option_periods.map((op: any, i: number) =>
                                      i === idx ? { ...op, noticeDays: e.target.value ? parseInt(e.target.value) : undefined } : op
                                    );
                                    setFormData({
                                      ...formData,
                                      option_periods: newPeriods,
                                    });
                                  }}
                                  placeholder="0"
                                  className="bg-background font-mono"
                                  dir="ltr"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[13px] font-bold text-muted-foreground uppercase block">
                                  {t("optionReminderDays")}
                                </label>
                                <Input
                                  type="number"
                                  value={option.reminderDays || ""}
                                  onChange={(e) => {
                                    const newPeriods = formData.option_periods.map((op: any, i: number) =>
                                      i === idx ? { ...op, reminderDays: e.target.value ? parseInt(e.target.value) : undefined } : op
                                    );
                                    setFormData({
                                      ...formData,
                                      option_periods: newPeriods,
                                    });
                                  }}
                                  placeholder="0"
                                  className="bg-background font-mono"
                                  dir="ltr"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div key={idx} className="flex flex-col gap-2.5 w-full pb-4 border-b border-border/50 last:border-0 last:pb-0">
                          <DataFieldWidget
                            label={idx === 0 ? (lang === "he" ? "אופציה ראשונה" : "First Option") : idx === 1 ? (lang === "he" ? "אופציה שנייה" : "Second Option") : `${lang === "he" ? "תקופת אופציה" : "Option Period"} ${idx + 1}`}
                            value={option.endDate ? `${t("until")} ${format(parseISO(option.endDate), "dd/MM/yyyy")}` : "-"}
                            icon={<Calendar className="w-full h-full" />}
                          />
                          <DataFieldWidget
                            label={t("optionRent")}
                            value={
                              <span className="flex items-center gap-2">
                                <span>₪{Number(option.rentAmount || 0).toLocaleString()}</span>
                                {formData.linkage_type && formData.linkage_type !== "none" && (
                                  <span className="text-[10px] text-green-600 font-bold bg-green-50 rounded-md px-2 whitespace-nowrap">צמוד מדד</span>
                                )}
                              </span>
                            }
                            icon={<Coins className="w-full h-full" />}
                            valueClassName="text-brand-600 dark:text-brand-400"
                          />
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground text-sm italic">
                    {t("noOptionsDefined")}
                  </div>
                )}

                {!readOnly && (
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => {
                      const lastEndDateStr =
                        formData.option_periods.length > 0
                          ? formData.option_periods[
                            formData.option_periods.length - 1
                          ].endDate
                          : formData.end_date;

                      let defaultEndDate = "";
                      if (lastEndDateStr) {
                        const last = parseISO(lastEndDateStr);
                        if (isValid(last)) {
                          defaultEndDate = format(
                            addYears(last, 1),
                            "yyyy-MM-dd",
                          );
                        }
                      }

                      setFormData({
                        ...formData,
                        option_periods: [
                          ...formData.option_periods,
                          {
                            endDate: defaultEndDate,
                            rentAmount: formData.base_rent,
                          },
                        ],
                      });
                    }}
                    className="text-brand-500 font-black p-0 h-auto mt-2 inline-flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {t("addPeriod")}
                  </Button>
                )}
              </div>
            </div>
          )}
          </CardContent>
        </Card>

        {/* 5. Payments & Linkage Section Combined */}
        <Card className="rounded-[2rem] border-0 shadow-[0_4px_24px_rgba(13,71,161,0.06)] overflow-hidden mb-6">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-6 pb-4 flex justify-start items-center gap-2 sm:gap-4 border-b border-slate-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Coins className="w-5 h-5 pointer-events-none" />
              </div>
              <div className="flex flex-col items-start text-start">
                <h3 className="font-bold text-[18px] text-brand-600 dark:text-brand-400 mb-0">
                  {lang === 'he' ? "פרטי תשלום והצמדה" : "Payment & Linkage Details"}
                </h3>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:divide-x md:divide-x-reverse divide-slate-100 dark:divide-neutral-800">
              
              {/* Base Payment Info */}
              <div className="space-y-4 w-full">
                  {!readOnly ? (
                    <div className="space-y-0 w-full">
                      {(!readOnly || formData.payment_method) && (
                        <div className="relative z-50">
                          <Select
                            label={t("paymentMethod")}
                            disabled={readOnly}
                            value={formData.payment_method || ""}
                            onChange={(val) =>
                              setFormData({ ...formData, payment_method: val })
                            }
                            placeholder={t("selectOption")}
                            options={PAYMENT_METHODS.map(pm => ({
                                value: pm.id,
                                label: t(pm.labelKey as any)
                            }))}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 w-full">
                      {formData.payment_method && (() => {
                        const pmConfig = getPaymentMethodConfig(formData.payment_method);
                        const PmIcon = pmConfig?.icon || CreditCard;
                        return (
                          <DataFieldWidget
                            label={t("paymentMethod") || "אמצעי תשלום"}
                            value={t((pmConfig?.labelKey || formData.payment_method) as any)}
                            icon={<PmIcon className="w-full h-full" />}
                          />
                        );
                      })()}
                    </div>
                  )}


                  {/* 5.5 Rent Steps Section (Moved inside card) */}
                  {(formData.rent_periods.length > 0 || !readOnly) && (
                    <div className="pt-6 mt-6 border-t border-slate-100 dark:border-neutral-800 space-y-4">
                      <div className="flex items-center gap-2 pb-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-sm tracking-wide uppercase text-muted-foreground">{t("rentSteps")}</h4>
                      </div>

                      {formData.rent_periods.length > 0 ? (
                        <div className="space-y-3">
                          {formData.rent_periods.map((step: any, idx: number) => (
                            !readOnly ? (
                              <div
                                key={idx}
                                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/5 rounded-xl border border-slate-100 dark:border-neutral-800 gap-4"
                              >
                                <div className="flex-1 flex flex-col md:flex-row gap-4 items-end">
                                  <div className="flex-1 w-full">
                                    <label className="text-[13px] font-bold text-muted-foreground uppercase mb-1 block">
                                      {t("stepDate")}
                                    </label>
                                    <DatePicker
                                      value={
                                        step.startDate
                                          ? parseISO(step.startDate)
                                          : undefined
                                      }
                                      onChange={(date) => {
                                        const newPeriods = [...formData.rent_periods];
                                        newPeriods[idx].startDate = date
                                          ? format(date, "yyyy-MM-dd")
                                          : "";
                                        setFormData({
                                          ...formData,
                                          rent_periods: newPeriods,
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 w-full">
                                    <label className="text-[13px] font-bold text-muted-foreground uppercase mb-1 block">
                                      {t("newAmount")}
                                    </label>
                                    <Input
                                      type="number"
                                      value={step.amount || ""}
                                      onChange={(e) => {
                                        const newPeriods = [...formData.rent_periods];
                                        newPeriods[idx].amount = e.target.value === "" ? "" : Number(
                                          e.target.value,
                                        );
                                        setFormData({
                                          ...formData,
                                          rent_periods: newPeriods,
                                        });
                                      }}
                                      leftIcon={
                                        <span className="text-sm font-bold">₪</span>
                                      }
                                      className="h-10"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-destructive self-end shrink-0"
                                    onClick={() => {
                                      const newPeriods = formData.rent_periods.filter(
                                        (_: any, i: number) => i !== idx,
                                      );
                                      setFormData({
                                        ...formData,
                                        rent_periods: newPeriods,
                                      });
                                    }}
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div key={idx} className="flex flex-col gap-2.5 w-full pb-4 border-b border-border/50 last:border-0 last:pb-0">
                                <DataFieldWidget
                                  label={`${t("step")} ${idx + 1}`}
                                  value={step.startDate ? `${t("effectiveDate")}: ${format(parseISO(step.startDate), "dd/MM/yyyy")}` : "-"}
                                  icon={<Calendar className="w-full h-full" />}
                                />
                                <DataFieldWidget
                                  label={t("rent")}
                                  value={`₪${Number(step.amount).toLocaleString()}`}
                                  icon={<Coins className="w-full h-full" />}
                                  valueClassName="text-brand-600 dark:text-brand-400"
                                />
                              </div>
                            )
                          ))}
                        </div>
                      ) : null}

                      {!readOnly && (
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              rent_periods: [
                                ...formData.rent_periods,
                                {
                                  startDate: "",
                                  amount: formData.base_rent,
                                  currency: "ILS",
                                },
                              ],
                            });
                          }}
                          className="text-brand-500 font-black p-0 h-auto mt-2 inline-flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-1" /> {t("addStep")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

            {/* Linkage Info */}
            {(!readOnly || formData.linkage_type !== "none") && (
              <div className="p-6 md:p-0 w-full pt-8 md:pt-0">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[16.5px] font-bold text-brand-600 dark:text-brand-400 uppercase flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        {t("linkage")}
                      </h4>
                      {readOnly && formData.linkage_type && formData.linkage_type !== "none" && (
                        <span className="bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-300 text-xs font-bold px-2 py-0.5 rounded-md">
                          פעילה
                        </span>
                      )}
                    </div>

                    {!readOnly ? (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-muted-foreground uppercase">{t("linkageType")}</label>
                          <SegmentedControl
                            size="md"
                            disabled={readOnly}
                            value={formData.linkage_type || "none"}
                            onChange={(val) =>
                              setFormData({ ...formData, linkage_type: val })
                            }
                            options={LINKAGE_TYPES.map(type => ({
                              value: type.id,
                              label: t(type.labelKey as any)
                            }))}
                          />
                        </div>

                        {formData.linkage_type !== "none" && (
                          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-neutral-800">
                            <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-muted-foreground uppercase">{t("linkageMethod")}</label>
                              <SegmentedControl
                                size="md"
                                disabled={readOnly}
                                value={formData.linkage_sub_type || "known"}
                                onChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    linkage_sub_type: val,
                                  })
                                }
                                options={LINKAGE_SUB_TYPES.map(subType => ({
                                  value: subType.id,
                                  label: t(subType.labelKey as any)
                                }))}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <DatePicker
                                label={t("baseDate")}
                                value={
                                  formData.base_index_date
                                    ? parseISO(formData.base_index_date)
                                    : undefined
                                }
                                onChange={(date) =>
                                  setFormData({
                                    ...formData,
                                    base_index_date: date
                                      ? format(date, "yyyy-MM-dd")
                                      : "",
                                  })
                                }
                              />
                              <div className="relative">
                                <Input
                                  label={t("baseIndex")}
                                  type="number"
                                  readOnly={readOnly}
                                  value={formData.base_index_value || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      base_index_value: Number(e.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-neutral-800 pt-4">
                              <div className="relative">
                                <Input
                                  label={lang === "he" ? "אחוז מדד שנתי מקס'" : "Max Annual Index %"}
                                  type="number"
                                  placeholder="0.0"
                                  readOnly={readOnly}
                                  value={formData.linkage_ceiling || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      linkage_ceiling: e.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div>
                                <label className="text-[13px] font-bold text-muted-foreground uppercase mb-1 block">
                                  {t("floorLabel")}
                                </label>
                                <div className="flex w-full items-center justify-center">
                                  <SegmentedControl
                                    size="md"
                                    options={[
                                      { label: t("yes"), value: "yes" },
                                      { label: t("no"), value: "no" },
                                    ]}
                                    value={
                                      formData.linkage_floor !== null &&
                                        formData.linkage_floor !== ""
                                        ? "yes"
                                        : "no"
                                    }
                                    onChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        linkage_floor: val === "yes" ? "0" : "",
                                      })
                                    }
                                    disabled={readOnly}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {formData.linkage_type === "none" ? (
                          <div className="text-center font-bold text-muted-foreground text-sm py-8 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl flex items-center justify-center">
                            {t("notLinked")}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-start text-start w-full gap-0.5">
                              <span className="text-[14px] text-muted-foreground font-medium leading-none">{t("linkageType")}</span>
                              <span className="font-bold text-[18px] text-brand-600 dark:text-brand-400">
                                {LINKAGE_TYPES.find(type => type.id === formData.linkage_type)?.labelKey 
                                  ? t(LINKAGE_TYPES.find(type => type.id === formData.linkage_type)!.labelKey as any) 
                                  : t("notLinked")}
                              </span>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-start text-start w-full gap-0.5">
                              <span className="text-[14px] text-muted-foreground font-medium leading-none">{t("linkageMethod")}</span>
                              <span className="font-bold text-[18px] text-brand-600 dark:text-brand-400">
                                {LINKAGE_SUB_TYPES.find(type => type.id === formData.linkage_sub_type)?.labelKey
                                  ? t(LINKAGE_SUB_TYPES.find(type => type.id === formData.linkage_sub_type)!.labelKey as any)
                                  : t("knownIndex")}
                              </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-start text-start w-full gap-0.5">
                              <span className="text-[14px] text-muted-foreground font-medium leading-none">{t("floorLabel")}</span>
                              <span className="font-bold text-[18px] text-brand-600 dark:text-brand-400">
                                {formData.linkage_floor !== null && formData.linkage_floor !== "" ? t("yes") : t("no")}
                              </span>
                            </div>

                            {(formData.base_index_date || formData.base_index_value) && (
                              <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-row items-center w-full gap-4 relative">
                                {formData.base_index_date && (
                                  <div className="flex-1 flex flex-col items-end gap-0.5">
                                    <span className="text-[14px] text-muted-foreground font-medium leading-none">{t("baseDate")}</span>
                                    <span className="font-bold text-[18px] text-brand-600 dark:text-brand-400">
                                      {format(parseISO(formData.base_index_date), "dd/MM/yyyy")}
                                    </span>
                                  </div>
                                )}
                                {formData.base_index_value && (
                                  <>
                                    <div className="w-[1px] bg-slate-200 dark:bg-neutral-700 h-10 self-center" />
                                    <div className="flex-1 flex flex-col items-end pl-4 gap-0.5">
                                      <span className="text-[14px] text-muted-foreground font-medium leading-none">{t("baseIndex")}</span>
                                      <span className="font-bold text-[18px] text-brand-600 dark:text-brand-400">{formData.base_index_value}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* 6. Security & Extras Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-start gap-2 sm:gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="text-[18px] font-bold text-brand-600 dark:text-brand-400 tracking-tight">
              {t("securityAndExtras")}
            </h3>
          </div>

          {/* Deposit, Guarantees, Painting & Special Clauses */}
          {(!readOnly ||
            formData.security_deposit_amount ||
            formData.guarantees ||
            formData.needs_painting ||
            formData.special_clauses) && (
            <Card className="rounded-[2rem] border shadow-sm">
              <CardContent className="p-6">
                {!readOnly ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Left Column: Security & Guarantees */}
                    <div className="space-y-6">
                      <Input
                        label={t("securityDeposit")}
                        type="number"
                        value={formData.security_deposit_amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            security_deposit_amount: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        leftIcon={<span className="text-sm font-bold">₪</span>}
                      />
                      <Textarea
                        label={t("guarantors")}
                        value={formData.guarantees || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, guarantees: e.target.value })
                        }
                        className="h-[120px] resize-none"
                        placeholder="הכנס פרטי ערבים, צ'קים או בטחונות אחרים כאן..."
                      />
                    </div>

                    {/* Right Column: Additional Clauses */}
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[13px] font-bold text-muted-foreground uppercase">
                            האם נדרשת צביעה בפינוי הנכס?
                          </label>
                        </div>
                        <div className="flex h-[42px] w-full items-center justify-center">
                          <SegmentedControl
                            size="md"
                            options={[
                              { label: t("yes"), value: "yes" },
                              { label: t("no"), value: "no" },
                            ]}
                            value={formData.needs_painting ? "yes" : "no"}
                            onChange={(val) =>
                              setFormData({
                                ...formData,
                                needs_painting: val === "yes",
                              })
                            }
                          />
                        </div>
                      </div>

                      <Textarea
                        label={t("specialClauses")}
                        value={formData.special_clauses || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            special_clauses: e.target.value,
                          })
                        }
                        className="h-[120px] resize-none"
                        placeholder="הכנס תנאים מיוחדים, הערות נוספות או סעיפים חריגים..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.security_deposit_amount ? (
                      <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-start text-start w-full gap-0.5">
                        <span className="text-[14px] text-muted-foreground font-medium leading-none">{t("securityDeposit")}</span>
                        <span className="text-lg font-black text-brand-600 dark:text-brand-400 tracking-tight">₪{Number(formData.security_deposit_amount).toLocaleString()}</span>
                      </div>
                    ) : null}
                    
                    <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-start text-start w-full gap-0.5">
                      <span className="text-[14px] text-muted-foreground font-medium leading-none">האם נדרשת צביעה בפינוי הנכס?</span>
                      <span className="font-bold text-[18px] text-brand-600 dark:text-brand-400">{formData.needs_painting ? t("yes") : t("no")}</span>
                    </div>

                    {formData.guarantees ? (
                      <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-start text-start w-full gap-0.5">
                        <span className="text-[14px] text-muted-foreground font-medium leading-none">{t("guarantors")}</span>
                        <span className="text-[16.5px] font-medium text-brand-600 dark:text-brand-400 whitespace-pre-wrap leading-tight text-start mt-1">{formData.guarantees}</span>
                      </div>
                    ) : null}

                    {formData.special_clauses ? (
                      <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-end w-full border border-brand-100 dark:border-brand-900/30 gap-0.5">
                        <span className="text-xs text-brand-600 dark:text-brand-400 font-bold">{t("specialClauses")}</span>
                        <span className="text-[16.5px] font-medium text-brand-600 dark:text-brand-400 whitespace-pre-wrap leading-tight text-start mt-1">{formData.special_clauses}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {!readOnly && (
          <div className="fixed bottom-[100px] lg:bottom-8 left-0 right-0 px-4 z-50 pointer-events-none flex justify-center">
            <div className="flex gap-4 w-full max-w-2xl mx-auto pointer-events-auto">
              <Button
                type="button"
                onClick={handleCancelEdit}
                variant="secondary"
                className="flex-1 py-4 uppercase tracking-widest rounded-2xl h-14"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-[2] py-4 uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 h-14"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {t("save")}
              </Button>
            </div>
          </div>
        )}
      </form>
      
      {/* Early Termination Modal */}
      {isTerminationModalOpen && contract && (
        <EarlyTerminationModal
          isOpen={isTerminationModalOpen}
          onClose={() => setIsTerminationModalOpen(false)}
          onConfirm={handleTerminateEarly}
          contract={contract}
          isLoading={saving}
        />
      )}
    </div>
  );
}
