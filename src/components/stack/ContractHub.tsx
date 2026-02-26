import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Box,
  CheckCircle,
  Mail,
  Phone,
  CreditCard,
  GitBranch,
  Coins,
  ArrowLeft,
  Trash2,
  Plus,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "../../hooks/useTranslation";
import { DatePicker } from "../ui/DatePicker";
import { format, parseISO, addDays, addYears, isValid } from "date-fns";
import { cn } from "../../lib/utils";
import { useDataCache } from "../../contexts/DataCacheContext";
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
  const { clear } = useDataCache();
  const { canAddActiveContract, refreshSubscription } = useSubscription();
  const [contract, setContract] = useState<any>(null);
  const [readOnly, setReadOnly] = useState(initialReadOnly);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    base_rent: 0,
    currency: "ILS",
    payment_frequency: "monthly",
    payment_day: 1,
    payment_method: "",
    linkage_type: "none",
    linkage_sub_type: "known",
    base_index_date: "",
    base_index_value: 0,
    linkage_ceiling: "",
    linkage_floor: "",
    security_deposit_amount: 0,
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
      setLoading(true);
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
        setContract(data);
        setFormData({
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
        });
      }
      setLoading(false);
    };

    fetchContract();
  }, [contractId]);

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
      className="flex flex-col bg-slate-50 dark:bg-black min-h-full"
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      {/* Header Content */}
      <div className="px-3 md:px-6 py-6 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBack}
              className="bg-transparent border-white/5 hover:bg-slate-50 dark:hover:bg-neutral-800"
            >
              <ArrowLeft
                className={cn("w-4 h-4", lang === "he" ? "rotate-180" : "")}
              />
            </Button>
            <div className="w-12 h-12 rounded-2xl glass-premium dark:bg-neutral-800/40 border border-white/5 flex items-center justify-center text-primary shadow-minimal">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t("contractDetails")}
              </h1>
              <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1 truncate max-w-[280px] sm:max-w-none">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {contract.properties?.address}, {contract.properties?.city}
                </span>
              </p>
            </div>
          </div>
          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "hidden md:flex px-3 py-1.5 glass-premium dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest items-center gap-2 border border-white/5 shadow-minimal",
                contract.status === "active"
                  ? "text-emerald-500"
                  : contract.status === "draft"
                    ? "text-yellow-500"
                    : "text-slate-500",
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(var(--status-color),0.5)]",
                  contract.status === "active"
                    ? "bg-emerald-500"
                    : contract.status === "draft"
                      ? "bg-yellow-500"
                      : "bg-slate-500",
                )}
              />
              {t(contract.status)}
            </div>
            {readOnly && (
              <Button
                onClick={() => setReadOnly(false)}
                className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] shadow-jewel p-0 flex items-center justify-center shrink-0"
              >
                <Pen className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Integrated Property Details (Visible on both modes, editable in edit mode) */}
        <div className="flex flex-col md:flex-row gap-4 lg:gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-neutral-800/50">
          {/* Compact Image/Upload */}
          <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden glass-premium border border-slate-200/50 dark:border-white/10 shadow-sm mx-auto md:mx-0">
            {readOnly ? (
              <img
                loading="lazy"
                src={
                  contract?.properties?.image_url ||
                  getPropertyPlaceholder(contract?.properties?.property_type)
                }
                alt="Property"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const placeholder = getPropertyPlaceholder(
                    contract?.properties?.property_type,
                  );
                  if (target.src !== placeholder) target.src = placeholder;
                }}
              />
            ) : (
              <div className="group relative w-full h-full hover:shadow-md transition-all border-2 border-transparent hover:border-brand-500 cursor-pointer">
                <img
                  loading="lazy"
                  src={
                    contract?.properties?.image_url ||
                    getPropertyPlaceholder(contract?.properties?.property_type)
                  }
                  alt="Property"
                  className={cn(
                    "w-full h-full object-cover transition-opacity",
                    isUploading ? "opacity-50" : "group-hover:opacity-75",
                  )}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const placeholder = getPropertyPlaceholder(
                      contract?.properties?.property_type,
                    );
                    if (target.src !== placeholder) target.src = placeholder;
                  }}
                />
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-opacity bg-black/20",
                    isUploading
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <div className="bg-white/90 p-1.5 rounded-full shadow-lg">
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                    ) : (
                      <Pen className="w-4 h-4 text-brand-600" />
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  onChange={handleFileUpload}
                  title={t("upload") || "Upload Image"}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Amenities section (right side, fully integrated) */}
          <div className="flex-1 flex flex-col justify-center">
            {(!readOnly ||
              contract?.properties?.has_balcony ||
              contract?.properties?.has_safe_room ||
              contract?.properties?.has_parking ||
              contract?.properties?.has_storage) && (
                <div className="w-full">
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {[
                      {
                        id: "has_balcony",
                        label: t("balcony"),
                        icon: <Wind className="w-4 h-4" />,
                      },
                      {
                        id: "has_safe_room",
                        label: t("safeRoom"),
                        icon: <ShieldCheck className="w-4 h-4" />,
                      },
                      {
                        id: "has_parking",
                        label: t("parking"),
                        icon: <Car className="w-4 h-4" />,
                      },
                      {
                        id: "has_storage",
                        label: t("storage"),
                        icon: <Box className="w-4 h-4" />,
                      },
                    ]
                      .filter(
                        (item) =>
                          !readOnly || (contract?.properties as any)?.[item.id],
                      )
                      .map((amenity) => {
                        const isActive = !!(contract?.properties as any)?.[
                          amenity.id
                        ];
                        return (
                          <button
                            key={amenity.id}
                            type="button"
                            disabled={readOnly}
                            onClick={async () => {
                              if (readOnly) return;
                              const newVal = !isActive;

                              setContract((prev: any) => ({
                                ...prev,
                                properties: {
                                  ...prev.properties,
                                  [amenity.id]: newVal,
                                },
                              }));

                              try {
                                const { error } = await supabase
                                  .from("properties")
                                  .update({ [amenity.id]: newVal })
                                  .eq("id", contract.property_id);

                                if (error) throw error;
                              } catch (err) {
                                console.error(
                                  "Error updating property amenity:",
                                  err,
                                );
                                setContract((prev: any) => ({
                                  ...prev,
                                  properties: {
                                    ...prev.properties,
                                    [amenity.id]: isActive,
                                  },
                                }));
                              }
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300",
                              isActive
                                ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 shadow-sm"
                                : "bg-slate-50 dark:bg-neutral-800/50 border-transparent text-muted-foreground hover:bg-slate-100 dark:hover:bg-neutral-800",
                            )}
                          >
                            {React.cloneElement(amenity.icon as any, {
                              className: cn(
                                "w-3.5 h-3.5",
                                isActive
                                  ? "text-indigo-600 dark:text-indigo-400"
                                  : "text-muted-foreground",
                              ),
                            })}
                            <span className="font-semibold text-[11px] whitespace-nowrap">
                              {amenity.label || amenity.id}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Mobile only Status and Tools (stacked below amenities on small screens) */}
            <div className="flex md:hidden flex-wrap items-center justify-center gap-2 mt-4">
              <div
                className={cn(
                  "px-3 py-1.5 glass-premium dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/5 shadow-minimal",
                  contract.status === "active"
                    ? "text-emerald-500"
                    : contract.status === "draft"
                      ? "text-yellow-500"
                      : "text-slate-500",
                )}
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(var(--status-color),0.5)]",
                    contract.status === "active"
                      ? "bg-emerald-500"
                      : contract.status === "draft"
                        ? "bg-yellow-500"
                        : "bg-slate-500",
                  )}
                />
                {t(contract.status)}
              </div>
              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 glass-premium dark:bg-white/5 text-primary rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all border border-white/5 shadow-minimal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {lang === "he" ? "צפייה בחוזה" : "View PDF"}
                </a>
              )}
            </div>
          </div>

          {/* Desktop Tools / PDF Link */}
          {signedUrl && (
            <div className="hidden md:flex items-center shrink-0">
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                {lang === "he" ? "צפייה בחוזה" : "View PDF"}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Form Content */}
      <form
        onSubmit={handleSave}
        className="flex-1 p-3 md:p-6 space-y-8 pb-32 max-w-5xl mx-auto w-full"
      >
        {/* 2. Tenant Details Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">{t("tenantDetails")}</h3>
          </div>

          <div className="space-y-4">
            {formData.tenants.length > 0 ? (
              formData.tenants.map((tenant: any, idx: number) => (
                <Card
                  key={idx}
                  className="rounded-[2rem] border shadow-sm group"
                >
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(!readOnly || tenant.name || tenant.full_name) && (
                        <Input
                          label={t("fullName")}
                          readOnly={readOnly}
                          value={tenant.name || tenant.full_name || ""}
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
                          value={tenant.email || ""}
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
                          value={tenant.phone || ""}
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
                          value={tenant.id_number || ""}
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
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="rounded-[2rem] border shadow-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    {t("noTenantsListed")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 3. Contract Dates Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">{t("contractPeriod")}</h3>
          </div>

          <Card className="rounded-[2rem] border shadow-sm">
            <CardContent className="p-6">
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

              {/* Duration Display */}
              {formData.start_date && formData.end_date && (
                <div className="mt-4 p-3 bg-secondary/20 rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{t("duration")}: </span>
                  <span className="font-bold text-foreground">
                    {(() => {
                      const start = new Date(formData.start_date);
                      const end = new Date(formData.end_date);
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
            </CardContent>
          </Card>
        </div>

        {/* 4. Options & Extensions Section */}
        {(formData.option_periods.length > 0 || !readOnly) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <GitBranch className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">{t("optionPeriods")}</h3>
            </div>

            <Card className="rounded-[2rem] border shadow-sm">
              <CardContent className="p-6 space-y-4">

                {formData.option_periods.length > 0 ? (
                  <div className="space-y-3">
                    {formData.option_periods.map((option: any, idx: number) => (
                      <Card
                        key={idx}
                        className="bg-slate-50 dark:bg-neutral-900 border-none shadow-sm"
                      >
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {!readOnly ? (
                            <div className="flex-1 flex flex-col gap-4">
                              <div className="flex justify-between items-center bg-brand-50/50 dark:bg-brand-900/10 -m-4 mb-0 p-3 px-4 border-b border-border/50">
                                <span className="font-bold text-sm text-brand-700 dark:text-brand-300">
                                  {t("optionPeriod")} {idx + 1}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-full"
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
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                                    {t("endDate")}
                                  </label>
                                  <DatePicker
                                    value={
                                      option.endDate
                                        ? parseISO(option.endDate)
                                        : undefined
                                    }
                                    onChange={(date) => {
                                      const newPeriods = [
                                        ...formData.option_periods,
                                      ];
                                      newPeriods[idx].endDate = date
                                        ? format(date, "yyyy-MM-dd")
                                        : "";
                                      setFormData({
                                        ...formData,
                                        option_periods: newPeriods,
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                                    {t("optionRent")}
                                  </label>
                                  <Input
                                    type="number"
                                    value={option.rentAmount || ""}
                                    onChange={(e) => {
                                      const newPeriods = [
                                        ...formData.option_periods,
                                      ];
                                      newPeriods[idx].rentAmount = e.target.value ? Number(
                                        e.target.value,
                                      ) : undefined;
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
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                                    {t("optionNoticeDays")}
                                  </label>
                                  <Input
                                    type="number"
                                    value={option.noticeDays || ""}
                                    onChange={(e) => {
                                      const newPeriods = [
                                        ...formData.option_periods,
                                      ];
                                      newPeriods[idx].noticeDays = e.target.value ? parseInt(e.target.value) : undefined;
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
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                                    {t("optionReminderDays")}
                                  </label>
                                  <Input
                                    type="number"
                                    value={option.reminderDays || ""}
                                    onChange={(e) => {
                                      const newPeriods = [
                                        ...formData.option_periods,
                                      ];
                                      newPeriods[idx].reminderDays = e.target.value ? parseInt(e.target.value) : undefined;
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
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="font-bold text-sm">
                                    {t("optionPeriod")} {idx + 1}
                                  </p>
                                  {option.length && (
                                    <p className="text-xs text-muted-foreground">
                                      {option.length} {t("months")}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-x-6 gap-y-3">
                                {option.endDate && (
                                  <div className="text-right">
                                    <span className="text-xs text-muted-foreground block">
                                      {t("endDate")}
                                    </span>
                                    <span className="font-medium">
                                      {format(
                                        parseISO(option.endDate),
                                        "dd/MM/yyyy",
                                      )}
                                    </span>
                                  </div>
                                )}
                                {option.rentAmount && (
                                  <div className="text-right">
                                    <span className="text-xs text-muted-foreground block">
                                      {t("monthlyRent")}
                                    </span>
                                    <span className="font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs">
                                      ₪{Number(option.rentAmount).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {option.noticeDays && (
                                  <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                                      {t("optionNoticeDays")}
                                    </span>
                                    <span className="font-bold text-sm">
                                      {option.noticeDays} {t("days")}
                                    </span>
                                  </div>
                                )}
                                {option.reminderDays && (
                                  <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                                      {t("optionReminderDays")}
                                    </span>
                                    <span className="font-bold text-sm text-brand-600 dark:text-brand-400">
                                      {option.reminderDays} {t("days")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
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
                    className="text-brand-500 font-black p-0 h-auto mt-4 inline-flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {t("addPeriod")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 5. Payments & Linkage Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Coins className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">{t("paymentDetails")}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Payment Info */}
            <Card className="rounded-[2rem] border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase">
                  {t("rent")}
                </h4>
                <div className="flex gap-4">
                  <Input
                    label={t("amount")}
                    type="number"
                    readOnly={readOnly}
                    value={formData.base_rent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        base_rent: Number(e.target.value),
                      })
                    }
                    leftIcon={<span className="text-sm font-bold">₪</span>}
                    className="h-10 text-lg font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Select
                    label={t("paymentFrequency")}
                    disabled={readOnly}
                    value={formData.payment_frequency}
                    onChange={(value) =>
                      setFormData({ ...formData, payment_frequency: value })
                    }
                    options={[
                      { value: "monthly", label: t("monthly") },
                      { value: "quarterly", label: t("quarterly") },
                      { value: "annually", label: t("annually") },
                    ]}
                  />
                  <Input
                    label={t("paymentDay")}
                    type="number"
                    min="1"
                    max="31"
                    readOnly={readOnly}
                    value={formData.payment_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_day: Number(e.target.value),
                      })
                    }
                  />
                </div>
                {(!readOnly || formData.payment_method) && (
                  <div className="pt-2">
                    <Select
                      label={t("paymentMethod")}
                      disabled={readOnly}
                      value={formData.payment_method || ""}
                      onChange={(val) =>
                        setFormData({ ...formData, payment_method: val })
                      }
                      placeholder={t("selectOption")}
                      options={[
                        { value: "transfer", label: t("transfer") },
                        { value: "checks", label: t("check") },
                        { value: "cash", label: t("cash") },
                        { value: "bit", label: t("bit") },
                        { value: "paybox", label: t("paybox") },
                        { value: "other", label: t("other") },
                      ]}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Linkage Info */}
            {(!readOnly || formData.linkage_type !== "none") && (
              <Card className="rounded-[2rem] border shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-purple-500" />
                    {t("linkage")}
                  </h4>

                  <div className="space-y-4">
                    <Select
                      label={t("linkageType")}
                      disabled={readOnly}
                      value={formData.linkage_type}
                      onChange={(value) =>
                        setFormData({ ...formData, linkage_type: value })
                      }
                      options={[
                        { value: "none", label: t("notLinked") },
                        { value: "cpi", label: t("linkedToCpi") },
                        { value: "housing", label: t("linkedToHousing") },
                      ]}
                    />

                    {formData.linkage_type !== "none" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                            {t("linkageMethod")}
                          </label>
                          <SegmentedControl
                            size="sm"
                            options={[
                              { label: t("knownIndex"), value: "known" },
                              { label: t("determiningIndex"), value: "base" },
                            ]}
                            value={
                              formData.linkage_sub_type === "known"
                                ? "known"
                                : "base"
                            }
                            onChange={(val) =>
                              setFormData({
                                ...formData,
                                linkage_sub_type: val,
                              })
                            }
                            disabled={readOnly}
                          />
                        </div>

                        <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-xl">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                              {t("baseDate")}
                            </label>
                            <DatePicker
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
                              readonly={readOnly}
                              className="w-full max-w-[200px]"
                            />
                          </div>
                          <div className="flex-shrink-0 text-left min-w-[80px]">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                              {t("baseIndex")}
                            </label>
                            <div className="h-10 flex items-center justify-end text-sm text-muted-foreground">
                              {formData.base_index_value
                                ? Number(formData.base_index_value).toFixed(2)
                                : "0.00"}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                              {t("restrictions")}
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={formData.linkage_ceiling || ""}
                                readOnly={readOnly}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    linkage_ceiling: e.target.value,
                                  })
                                }
                                placeholder={t("ceilingPlaceholder")}
                                className="h-10 text-sm font-bold bg-secondary/10"
                                leftIcon={
                                  <span className="text-muted-foreground">
                                    %
                                  </span>
                                }
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground block text-center mt-1">
                              {t("ceilingLabel")}
                            </span>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block opacity-0">
                              {t("restrictions")}
                            </label>
                            <div className="flex h-10 w-full items-center justify-center">
                              <SegmentedControl
                                size="sm"
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
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground block text-center mt-1">
                              {t("floorLabel")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 5.5 Rent Steps Section (Conditional) */}
        {(formData.rent_periods.length > 0 || !readOnly) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">{t("rentSteps")}</h3>
            </div>

            <Card className="rounded-[2rem] border shadow-sm">
              <CardContent className="p-6">
                {formData.rent_periods.length > 0 ? (
                  <div className="space-y-3">
                    {formData.rent_periods.map((step: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-100 dark:border-neutral-800 gap-4"
                      >
                        {!readOnly ? (
                          <div className="flex-1 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
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
                              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                {t("newAmount")}
                              </label>
                              <Input
                                type="number"
                                value={step.amount || 0}
                                onChange={(e) => {
                                  const newPeriods = [...formData.rent_periods];
                                  newPeriods[idx].amount = Number(
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
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-500 self-end shrink-0"
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
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-bold text-sm">
                                  {t("step")} {idx + 1}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("effectiveDate")}:{" "}
                                  {step.startDate
                                    ? format(
                                      parseISO(step.startDate),
                                      "dd/MM/yyyy",
                                    )
                                    : "-"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block">
                                {t("newRentAmount")}
                              </span>
                              <span className="font-bold text-lg text-primary">
                                ₪{Number(step.amount).toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm italic">
                    {/* No rent step overrides */}
                  </div>
                )}

                {!readOnly && (
                  <Button
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
                    className="text-brand-500 font-black p-0 h-auto mt-4 inline-flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {t("addStep")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 6. Security & Extras Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">{t("securityAndExtras")}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deposit & Guarantees */}
            {(!readOnly ||
              formData.security_deposit_amount ||
              formData.guarantees) && (
                <Card className="rounded-[2rem] border shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    {(!readOnly || formData.security_deposit_amount) && (
                      <Input
                        label={t("securityDeposit")}
                        type="number"
                        readOnly={readOnly}
                        value={formData.security_deposit_amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            security_deposit_amount: Number(e.target.value),
                          })
                        }
                        leftIcon={<span className="text-sm font-bold">₪</span>}
                      />
                    )}

                    {(!readOnly || formData.guarantees) && (
                      <Textarea
                        label={t("guarantees")}
                        readOnly={readOnly}
                        value={formData.guarantees}
                        onChange={(e) =>
                          setFormData({ ...formData, guarantees: e.target.value })
                        }
                        className="h-24"
                        placeholder={t("guaranteesPlaceholder")}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Additional Clauses */}
            {(!readOnly ||
              formData.needs_painting ||
              formData.special_clauses) && (
                <Card className="rounded-[2rem] border shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    {(!readOnly || formData.needs_painting) && (
                      <div className="flex items-start justify-between border-b border-slate-100 dark:border-neutral-700 pb-4">
                        <div className="space-y-0.5">
                          <label className="text-sm font-bold">
                            {t("needsPainting")}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {t("needsPaintingDesc")}
                          </p>
                        </div>
                        <SegmentedControl
                          size="sm"
                          options={[
                            { label: t("yes"), value: "yes" },
                            { label: t("no"), value: "no" },
                          ]}
                          value={formData.needs_painting ? "yes" : "no"}
                          onChange={(val) =>
                            !readOnly &&
                            setFormData({
                              ...formData,
                              needs_painting: val === "yes",
                            })
                          }
                          className="shrink-0"
                        />
                      </div>
                    )}

                    {(!readOnly || formData.special_clauses) && (
                      <Textarea
                        label={t("specialClauses")}
                        readOnly={readOnly}
                        value={formData.special_clauses}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            special_clauses: e.target.value,
                          })
                        }
                        className="h-24"
                        placeholder={t("specialClausesPlaceholder")}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
          </div>
        </div>

        {!readOnly && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-slate-100 dark:border-neutral-800 z-50">
            <div className="max-w-7xl mx-auto flex gap-4">
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
    </div>
  );
}
