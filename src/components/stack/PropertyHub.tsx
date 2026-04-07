import React, { useState, useEffect, Fragment } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { rentalTrendService } from "../../services/rental-trend.service";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Property } from "../../types/database";
import { cn } from "../../lib/utils";
import {
  WalletIcon,
  FolderIcon,
  PlusIcon,
  MoreVertical,
  Edit2,
  Trash2,
  CheckIcon,
  Check,
  FilePlus,
  FileText,
  Car,
  ShieldCheck,
  Upload,
  Loader2,
  Calendar,
  ArrowLeft,
  Wind,
  Package,
  FileSignature,
  Users,
  ChevronDown,
  Link as LinkIcon,
} from "lucide-react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
  Portal,
} from "@headlessui/react";
import { format, parseISO } from "date-fns";
import { PropertyDocumentsHub } from "../properties/PropertyDocumentsHub";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ContractsTab } from "./tabs/ContractsTab";
import { WalletTab } from "./tabs/WalletTab";

import { PropertyTypeSelect } from "../common/PropertyTypeSelect";
import { GoogleAutocomplete } from "../common/GoogleAutocomplete";
import { useStack } from "../../contexts/StackContext";
import { supabase } from "../../lib/supabase";
import { Contract } from "../../types/database";
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal";
import { AnimatePresence, motion } from "framer-motion";
import { useDataCache } from "../../contexts/DataCacheContext";
import { AddPaymentModal } from "../modals/AddPaymentModal";
import { DollarSign } from "lucide-react";
import { propertyService } from "../../services/property.service";
import { CompressionService } from "../../services/compression.service";
import { getPropertyPlaceholder } from "../../lib/property-placeholders";
import { useSignedUrl } from "../../hooks/useSignedUrl";
import { ProtocolWizard } from "../properties/ProtocolWizard";
import { useToast } from "../../hooks/useToast";
import { GlobalDocumentUploadModal } from "../modals/GlobalDocumentUploadModal";
import { BalconyIcon, SafeRoomIcon, StorageIcon, CarIcon, BedIcon, RulerIcon } from "../../components/icons/NavIcons";

interface PropertyHubProps {
  propertyId: string;
  property: Property;
  initialTab?: TabType;
  initialAction?: string;
  onDelete?: () => void;
  onSave?: () => void;
}

type TabType = "contracts" | "wallet" | "files" | "candidates";

export function PropertyHub({
  property: initialProperty,
  propertyId,
  initialTab,
  initialAction,
  onDelete,
  onSave,
}: PropertyHubProps) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { push, pop } = useStack();
  const { success, error: toastError } = useToast();
  const { set, clear } = useDataCache();
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab || "contracts",
  );
  const [property, setProperty] = useState(initialProperty);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProperty, setEditedProperty] =
    useState<Property>(initialProperty);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingMap, setIsFetchingMap] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleCopyTenantLink = async () => {
    setIsMoreMenuOpen(false);
    const link = `${window.location.origin}/apply/${propertyId}`;
    try {
      await navigator.clipboard.writeText(link);
      success(t("tenantLinkCopied"));
    } catch (err) {
      toastError(t("copyLinkError"));
    }
  };

  const handleGoogleMapsFetch = async () => {
    if (!editedProperty.address || !editedProperty.city) {
      alert("Please enter city and address first");
      setUploadMode("upload");
      return;
    }

    setIsFetchingMap(true);
    setImageError(null);

    try {
      const location = `${editedProperty.address}, ${editedProperty.city}`;
      const { data, error } = await supabase.functions.invoke(
        "google-maps-proxy",
        {
          body: { action: "streetview", location },
        },
      );

      if (error) throw error;
      if (data?.publicUrl) {
        setEditedProperty((prev) => ({ ...prev, image_url: data.publicUrl }));
      }
    } catch (err: any) {
      console.error("Street View Error:", err);
      setImageError("Failed to generate image");
      alert("Failed to generate image");
    } finally {
      setIsFetchingMap(false);
    }
  };

  // Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isProtocolWizardOpen, setIsProtocolWizardOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeContract, setActiveContract] = useState<Contract | null>(null);
  const [marketTrend, setMarketTrend] = useState<any>(null);

  // Resolve Signed URL for Property Image
  const { url: signedImageUrl } = useSignedUrl(
    "property-images",
    property.image_url,
  );

  // Auto-Navigation State
  const location = useLocation();
  const [requestedDocTab, setRequestedDocTab] = useState<
    "media" | "utilities" | "maintenance" | "documents" | "checks" | undefined
  >(undefined);
  const [shouldAutoUpload, setShouldAutoUpload] = useState(false);

  useEffect(() => {
    if (location.state?.action === "upload") {
      setActiveTab("files");
      setRequestedDocTab("documents");
      setShouldAutoUpload(true);

      // Clear location state
      window.history.replaceState({}, "");
    }
  }, [location]);

  // Self-healing synchronization: Ensure property status matches active contracts
  useEffect(() => {
    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Sync status
      const newStatus = await propertyService.syncOccupancyStatus(
        propertyId,
        user.id,
      );
      if (newStatus && newStatus !== property.status) {
        console.log(
          `[PropertyHub] Status out of sync for ${propertyId}. Updating: ${property.status} -> ${newStatus}`,
        );
        setProperty((prev) => ({ ...prev, status: newStatus }));
        clear(); // Invalidate dashboard/list cache
      }

      // 2. Fetch active contract for extension details
      const { data: contracts } = await supabase
        .from("contracts")
        .select("*")
        .eq("property_id", propertyId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1);

      if (contracts && contracts.length > 0) {
        setActiveContract(contracts[0]);
      }
    };
    sync();

    // 3. Fetch market trend
    const trend = rentalTrendService.getRegionalTrend(property.city);
    setMarketTrend(trend);
  }, [propertyId, property.city]);

  const tabs = [
    { id: "contracts", label: t("contracts"), icon: FileText },
    { id: "wallet", label: t("financials"), icon: WalletIcon },
    { id: "files", label: t("documents"), icon: FolderIcon },
  ] as const;

  const handleAddContract = () => {
    setIsMoreMenuOpen(false);
    push(
      "contract_wizard",
      {
        propertyId: propertyId,
        prefill: {
          property_id: propertyId,
          property_address: property.address,
          city: property.city,
        },
        onSuccess: () => {
          setRefreshKey((prev) => prev + 1);
          clear();
        },
      },
      { isExpanded: true, title: t("addContract") },
    );
  };

  const handleEdit = () => {
    setIsMoreMenuOpen(false);
    setEditedProperty(property);
    setIsEditing(true);
    // Default to upload mode if is a local image, or url if is a google maps link
    if (property.image_url?.includes("google")) {
      setUploadMode("url");
    } else {
      setUploadMode("upload");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    setImageError(null);
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
    const filePath = `${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setEditedProperty((prev) => ({ ...prev, image_url: filePath }));
    } catch (err: any) {
      console.error("Error uploading image:", err);
      setImageError("Failed to upload image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const hasUnsavedChanges = () => {
    if (!isEditing) return false;
    return JSON.stringify(editedProperty) !== JSON.stringify(property);
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

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      if (
        window.confirm(
          t("unsavedChangesWarning") ||
            "You have unsaved changes. Are you sure you want to exit without saving?",
        )
      ) {
        setIsEditing(false);
        setEditedProperty(property);
      }
    } else {
      setIsEditing(false);
      setEditedProperty(property);
    }
  };

  const handleSave = async () => {
    if (!propertyId) {
      console.error(
        "[PropertyHub] Critical: Attempted to save property without a propertyId. This would cause a Supabase error.",
      );
      alert(t("error_missing_id") || "System Error: Missing Property ID");
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        address: (editedProperty.address || "").trim(),
        city: (editedProperty.city || "").trim(),
        rooms: Number(editedProperty.rooms) || 0,
        size_sqm: Number(editedProperty.size_sqm) || 0,
        property_type: editedProperty.property_type || "apartment",
        has_parking: !!editedProperty.has_parking,
        has_storage: !!editedProperty.has_storage,
        has_balcony: !!editedProperty.has_balcony,
        has_safe_room: !!editedProperty.has_safe_room,
        image_url: editedProperty.image_url || null,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("properties")
        .update(updates)
        .eq("id", propertyId);

      // Schema Cache Error Handling (PostgREST)
      if (
        error &&
        (error.message?.includes("schema cache") ||
          error.message?.includes("column"))
      ) {
        console.warn(
          "[PropertyHub] Modern schema columns missing from API cache. Retrying with legacy fields...",
        );

        // Remove columns that were added in today's migrations
        const legacyUpdates = { ...updates };
        delete legacyUpdates.has_balcony;
        delete legacyUpdates.has_safe_room;
        delete legacyUpdates.updated_at; // Might be missing if migration 20260130172500 didn't run

        const { error: retryError } = await supabase
          .from("properties")
          .update(legacyUpdates)
          .eq("id", propertyId);

        error = retryError;
      }

      if (error) {
        console.error("[PropertyHub] Supabase update error:", error);
        throw error;
      }

      setProperty((prev) => ({ ...prev, ...editedProperty }));
      setIsEditing(false);
      clear(); // Sync cache
      if (onSave) onSave();
    } catch (error: any) {
      console.error("Error saving property:", error);
      alert(
        `${t("failed_to_save_changes")}\n\nError: ${error.message || error.details || "Unknown error"}`,
      );
    } finally {
      setSaving(false);
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = () => {
    setIsMoreMenuOpen(false);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Delete payments and contracts related to this property
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id")
        .eq("property_id", propertyId);
      if (contracts && contracts.length > 0) {
        const contractIds = contracts.map((c) => c.id);
        await supabase.from("payments").delete().in("contract_id", contractIds);
        await supabase.from("contracts").delete().eq("property_id", propertyId);
      }

      // 2. Delete property
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);
      if (error) throw error;

      // 3. Invalidate all cache
      clear();

      onDelete?.(); // Trigger refresh in parent
      pop(); // Close the hub
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property");
    } finally {
      setIsDeleting(false);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveTab(id as TabType); // Use activeTab state to track current section for visual feedback
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black">
      {/* 1. Header Details */}
      <div className="relative shrink-0 px-4 sm:px-6 md:px-6 z-10 pt-6 pb-6 bg-primary text-primary-foreground shadow-2xl rounded-b-[2rem] border-b border-white/10">
        <div className="flex justify-between items-start gap-2 sm:gap-4 md:gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button
              onClick={handleBack}
              variant="outline"
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12 bg-white/5 border-white/10 hover:bg-white/20 text-white shrink-0"
            >
              <ArrowLeft
                className={cn(
                  "w-4 h-4",
                  lang === "he" ? "rotate-180" : "",
                )}
              />
            </Button>
            <div className="flex-1 min-w-0">
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-2 sm:px-4 py-1 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20 text-sm font-black uppercase tracking-widest mb-2 shadow-lg">
              {(() => {
                const today = new Date().toISOString().split("T")[0];
                const hasActiveContract = (property as any).contracts?.some(
                  (c: any) =>
                    c.status === "active" &&
                    c.start_date <= today &&
                    (!c.end_date || c.end_date >= today),
                );
                const currentStatus = hasActiveContract
                  ? "Occupied"
                  : property.status;
                const isOccupied = currentStatus === "Occupied";

                return (
                  <>
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(var(--status-color),0.5)]",
                        isOccupied ? "bg-emerald-400" : "bg-amber-400",
                      )}
                    />
                    <span className="text-white">
                      {t((currentStatus?.toLowerCase() || "vacant") as any)}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Market Trend Badge */}
            {marketTrend && (
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-2 sm:px-4 py-1 ml-2 backdrop-blur-md rounded-full border text-sm font-black uppercase tracking-widest mb-2 transition-all shadow-lg",
                  marketTrend.annualGrowth > 0
                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                    : "bg-red-500/20 border-red-400/30 text-red-300",
                )}
              >
                {marketTrend.annualGrowth > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {marketTrend.annualGrowth > 0 ? "+" : ""}
                {marketTrend.annualGrowth}%
                {lang === "he" ? 'שכירות בעיר (למ"ס)' : "Market Rent (CBS)"}
              </div>
            )}

            {isEditing ? (
              <div className="space-y-6 bg-black/20 p-4 md:p-6 rounded-2xl border border-white/10 backdrop-blur-3xl shadow-xl mt-4">
                <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10">
                  <label className="text-sm font-black uppercase tracking-[0.2em] text-white/70 block mb-2 sm:mb-4 text-center">
                    {t("selectCategory") || t("propertyType")}
                  </label>
                  <PropertyTypeSelect
                    value={editedProperty.property_type || "apartment"}
                    onChange={(val) =>
                      setEditedProperty((prev) => ({
                        ...prev,
                        property_type: val,
                      }))
                    }
                  />
                </div>

                <div className="p-4 rounded-2xl bg-background dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700 focus-within:ring-2 ring-primary/20 transition-all">
                  <GoogleAutocomplete
                    label={t("city")}
                    value={editedProperty.city || ""}
                    onChange={(val) =>
                      setEditedProperty((prev) => ({ ...prev, city: val }))
                    }
                    type="cities"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-background dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700 focus-within:ring-2 ring-primary/20 transition-all">
                  <GoogleAutocomplete
                    label={t("address")}
                    value={editedProperty.address || ""}
                    onChange={(val) =>
                      setEditedProperty((prev) => ({ ...prev, address: val }))
                    }
                    type="address"
                    biasCity={editedProperty.city}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-[1.5rem] bg-background dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700">
                    <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
                      <BedIcon className="w-4 h-4 shrink-0" />
                      {t("rooms")}
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      className="bg-transparent font-black text-2xl text-foreground w-full border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground/50"
                      value={editedProperty.rooms ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        setEditedProperty((prev) => ({
                          ...prev,
                          rooms: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="p-4 rounded-[1.5rem] bg-background dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700">
                    <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
                      <RulerIcon className="w-4 h-4 shrink-0" />
                      {t("sqm")}
                    </label>
                    <Input
                      type="number"
                      className="bg-transparent font-black text-2xl text-foreground w-full border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground/50"
                      value={editedProperty.size_sqm ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        setEditedProperty((prev) => ({
                          ...prev,
                          size_sqm: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="h-px flex-1 bg-muted/50 dark:bg-neutral-800" />
                    <span className="mx-4 text-sm font-black uppercase tracking-[0.3em] text-muted-foreground opacity-80">
                      {t("amenities")}
                    </span>
                    <div className="h-px flex-1 bg-muted/50 dark:bg-neutral-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    {[
                      {
                        key: "has_balcony",
                        label: t("balcony"),
                        icon: <BalconyIcon className="w-5 h-5" />,
                      },
                      {
                        key: "has_safe_room",
                        label: t("safeRoom"),
                        icon: <SafeRoomIcon className="w-5 h-5" />,
                      },
                      {
                        key: "has_parking",
                        label: t("parking"),
                        icon: <CarIcon className="w-5 h-5" />,
                      },
                      {
                        key: "has_storage",
                        label: t("storage"),
                        icon: <StorageIcon className="w-5 h-5" />,
                      },
                    ].map((feat) => {
                      const isActive =
                        !!editedProperty[feat.key as keyof Property];
                      return (
                        <button
                          key={feat.key}
                          type="button"
                          onClick={() =>
                            setEditedProperty((prev) => ({
                              ...prev,
                              [feat.key]: !isActive,
                            }))
                          }
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 p-2 sm:p-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                            isActive
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02] z-10"
                              : "bg-background dark:bg-neutral-800/50 border-transparent text-muted-foreground hover:bg-muted/50 hover:scale-[1.01]",
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-white dark:bg-neutral-800 text-indigo-600 shadow-sm",
                            )}
                          >
                            {React.cloneElement(feat.icon as any, {
                              className: "w-4 h-4",
                            })}
                          </div>
                          <span
                            className={cn(
                              "font-bold text-sm transition-colors py-0.5",
                              isActive ? "text-white" : "text-muted-foreground",
                            )}
                          >
                            {feat.label}
                          </span>
                          {isActive && (
                            <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center animate-in zoom-in duration-300">
                              <Check className="w-2 h-2 text-indigo-600 stroke-[4px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                      {t("propertyImage")}
                    </label>
                    <div className="flex p-1 bg-muted/50 dark:bg-neutral-800 rounded-xl">
                      <Button
                        onClick={() => setUploadMode("upload")}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "px-2 sm:px-4 py-1 text-sm font-black uppercase h-7",
                          uploadMode === "upload"
                            ? "bg-white dark:bg-neutral-700 text-primary shadow-sm hover:bg-white dark:hover:bg-neutral-700"
                            : "text-muted-foreground hover:bg-transparent hover:text-foreground",
                        )}
                      >
                        {t("upload") || "Upload"}
                      </Button>
                      <Button
                        onClick={() => {
                          setUploadMode("url");
                          handleGoogleMapsFetch();
                        }}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "px-2 sm:px-4 py-1 text-sm font-black uppercase h-7",
                          uploadMode === "url"
                            ? "bg-white dark:bg-neutral-700 text-primary shadow-sm hover:bg-white dark:hover:bg-neutral-700"
                            : "text-muted-foreground hover:bg-transparent hover:text-foreground",
                        )}
                      >
                        Google Maps
                      </Button>
                    </div>
                  </div>

                  {uploadMode === "url" && isFetchingMap && (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl bg-background/50 dark:bg-neutral-800/20 h-24">
                      <Loader2 className="w-5 h-5 text-primary animate-spin mb-1" />
                      <span className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                        {t("fetchingStreetView") || "Fetching..."}
                      </span>
                    </div>
                  )}

                  {uploadMode === "upload" && (
                    <div className="relative border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl p-6 hover:bg-background dark:hover:bg-neutral-800/50 transition-all text-center group cursor-pointer h-24 flex items-center justify-center">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-1">
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5 text-slate-300 group-hover:text-primary transition-all" />
                        )}
                        <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                          {isUploading
                            ? t("uploading_ellipsis") || "Uploading..."
                            : t("clickToUploadPicture") || "Click to upload"}
                        </span>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {editedProperty.image_url && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100 dark:border-neutral-800 shadow-md group"
                      >
                        <img
                          src={
                            signedImageUrl ||
                            getPropertyPlaceholder(editedProperty.property_type)
                          }
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const placeholder = getPropertyPlaceholder(
                              editedProperty.property_type,
                            );
                            if (target.src !== placeholder) {
                              target.src = placeholder;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <Button
                            onClick={() =>
                              setEditedProperty((p) => ({
                                ...p,
                                image_url: "",
                              }))
                            }
                            variant="destructive"
                            size="icon"
                            className="p-2 rounded-full hover:bg-destructive shadow-xl w-10 h-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {imageError && (
                    <p className="text-sm text-destructive font-bold">
                      {imageError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:gap-4 max-w-full">
                <div className="flex flex-col gap-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white leading-tight md:leading-none break-words line-clamp-2">
                    {property.address}
                  </h1>
                  <div className="flex flex-col items-start gap-1 mt-1 text-sm bg-transparent">
                    <p className="text-white/80 font-medium truncate">
                      {property.city}
                    </p>
                    
                    {activeContract && activeContract.start_date && (
                      <div className="flex items-center gap-2 text-white/80 font-medium pt-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(activeContract.start_date), "dd/MM/yyyy")}
                          {activeContract.end_date ? ` - ${format(parseISO(activeContract.end_date), "dd/MM/yyyy")}` : ""}
                        </span>
                      </div>
                    )}

                    {activeContract?.option_periods &&
                      activeContract.option_periods.length > 0 && (
                        <div className="flex flex-col items-start gap-1 mt-0.5">
                          {activeContract.option_periods.map((opt: any, index: number) => {
                            if (!opt.endDate) return null;
                            return (
                              <div key={index} className="flex items-center gap-2 text-white/70 text-xs font-medium">
                                <span className="w-4 text-center">•</span>
                                <span>
                                  {lang === "he" ? `אופציה ${index + 1}` : `Option ${index + 1}`}:{" "}
                                  {format(parseISO(opt.endDate), "dd/MM/yyyy")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
          <div className="relative">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isDeleting}
                  className="w-12 h-12 button-jewel text-white rounded-[1.2rem] shadow-jewel hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center shrink-0 p-0"
                >
                  <CheckIcon className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-[1.2rem] border border-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center shrink-0 p-0"
                >
                  <PlusIcon className="w-5 h-5 rotate-45" />
                </Button>
              </div>
            ) : (
              <Menu as="div" className="relative inline-block text-left">
                <MenuButton className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-[1.2rem] border border-white/10 text-white hover:bg-white/20 transition-all focus:outline-none flex items-center justify-center">
                  <MoreVertical className="w-5 h-5" />
                </MenuButton>
                <Portal>
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
                      anchor={{
                        to: lang === "he" ? "bottom start" : "bottom end",
                        gap: 8,
                      }}
                      className={cn(
                        "z-[100] min-w-[200px] bg-window rounded-2xl shadow-2xl border border-slate-100 dark:border-neutral-800 p-2 focus:outline-none font-sans",
                        "animate-in fade-in zoom-in-95 duration-100",
                      )}
                    >
                      <div className="py-1">
                        <MenuItem>
                          {({ focus }) => (
                            <Button
                              onClick={() => {
                                setIsMoreMenuOpen(false);
                                setIsProtocolWizardOpen(true);
                              }}
                              variant="ghost"
                              leftIcon={
                                <FileSignature className="w-4 h-4 text-brand-500" />
                              }
                              className={cn(
                                "justify-start w-full px-4 py-2.5 text-base font-semibold rounded-2xl transition-all h-auto",
                                focus
                                  ? "bg-brand-50/10 text-brand-600 dark:text-brand-400"
                                  : "text-foreground",
                              )}
                            >
                              {lang === "he"
                                ? "הפקת פרוטוקול מסירה"
                                : "Generate Protocol"}
                            </Button>
                          )}
                        </MenuItem>
                        <div className="h-[1px] bg-background dark:bg-neutral-800 my-2 mx-4" />
                        <MenuItem>
                          {({ focus }) => (
                            <Button
                              onClick={handleCopyTenantLink}
                              variant="ghost"
                              leftIcon={
                                <LinkIcon className="w-4 h-4 text-brand-500" />
                              }
                              className={cn(
                                "w-full justify-start gap-2 sm:gap-4 px-4 py-2 sm:py-4 rounded-2xl text-base font-bold transition-all h-auto",
                                focus
                                  ? "bg-background dark:bg-neutral-800 text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {t('createTenantSignLink')}
                            </Button>
                          )}
                        </MenuItem>
                        <MenuItem>
                          {({ focus }) => (
                            <Button
                              onClick={() => setIsAddPaymentModalOpen(true)}
                              variant="ghost"
                              leftIcon={
                                <span className="font-sans font-bold flex items-center justify-center text-brand-500 text-base leading-none w-4 h-4">
                                  ₪
                                </span>
                              }
                              className={cn(
                                "w-full justify-start gap-2 sm:gap-4 px-4 py-2 sm:py-4 rounded-2xl text-base font-bold transition-all h-auto",
                                focus
                                  ? "bg-background dark:bg-neutral-800 text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {lang === "he" ? "הוספת תשלום" : "Add Payment"}
                            </Button>
                          )}
                        </MenuItem>

                        <div className="h-[1px] bg-background dark:bg-neutral-800 my-2 mx-4" />

                        <MenuItem>
                          {({ focus }) => (
                            <Button
                              onClick={handleAddContract}
                              variant="ghost"
                              leftIcon={
                                <FilePlus className="w-4 h-4 text-emerald-500" />
                              }
                              className={cn(
                                "w-full justify-start gap-2 sm:gap-4 px-4 py-2 sm:py-4 rounded-2xl text-base font-bold transition-all h-auto",
                                focus
                                  ? "bg-background dark:bg-neutral-800 text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {lang === "he" ? "הוספת חוזה" : "Add Contract"}
                            </Button>
                          )}
                        </MenuItem>

                        <MenuItem>
                          {({ focus }) => (
                            <Button
                              onClick={handleEdit}
                              variant="ghost"
                              leftIcon={
                                <Edit2 className="w-4 h-4 text-brand-500" />
                              }
                              className={cn(
                                "w-full justify-start gap-2 sm:gap-4 px-4 py-2 sm:py-4 rounded-2xl text-base font-bold transition-all h-auto",
                                focus
                                  ? "bg-background dark:bg-neutral-800 text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {t("edit")}
                            </Button>
                          )}
                        </MenuItem>

                        <MenuItem>
                          {({ focus }) => (
                            <Button
                              onClick={handleDeleteClick}
                              variant="ghost"
                              leftIcon={<Trash2 className="w-4 h-4" />}
                              className={cn(
                                "w-full justify-start gap-2 sm:gap-4 px-4 py-2 sm:py-4 rounded-2xl text-base font-bold transition-all h-auto",
                                focus
                                  ? "bg-red-50 dark:bg-red-900/20 text-red-600"
                                  : "text-destructive",
                              )}
                            >
                              {t("delete")}
                            </Button>
                          )}
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Transition>
                </Portal>
              </Menu>
            )}
          </div>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <div className="px-4 sm:px-6 md:px-6 relative z-20 w-full mb-2">
        {/* Unified Sliding Tabs (Toggle) */}
        <div className="flex gap-1 bg-white/5 backdrop-blur-3xl p-1.5 rounded-[1.8rem] border border-white/10 shadow-xl w-full items-center justify-between">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex justify-center items-center gap-2 px-2 md:px-6 py-2.5 md:py-2 sm:py-4 rounded-[1.3rem] transition-all duration-700 whitespace-nowrap group relative min-w-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02] z-10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5",
                )}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-700 shrink-0",
                    isActive ? "scale-110" : "group-hover:scale-110",
                  )}
                />
                <span className="text-xs md:text-sm font-black uppercase tracking-[0.05em] md:tracking-[0.2em] truncate">
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabPropertyHub"
                    className="absolute inset-0 bg-white/10 dark:bg-black/5 rounded-[1.3rem] -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pt-6">
        <div className="px-4 sm:px-6 md:px-6 h-full">
          {activeTab === "contracts" && (
            <ContractsTab
              key={refreshKey}
              propertyId={propertyId}
              onAddContract={handleAddContract}
            />
          )}
          {activeTab === "wallet" && (
            <WalletTab
              key={refreshKey}
              propertyId={propertyId}
              property={property}
            />
          )}
          {activeTab === "files" && (
            <PropertyDocumentsHub
              key={refreshKey}
              property={property}
              requestedTab={requestedDocTab}
              autoOpenUpload={shouldAutoUpload}
            />
          )}
        </div>
      </div>

      {/* 6. Modals */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={lang === "he" ? "מחיקת נכס" : "Delete Asset"}
        message={
          lang === "he"
            ? `האם את/ה בטוח/ה לגמרי שברצונך למחוק את הנכס "${property.address}"? כל המידע כולל חוזים ותשלומים ימחק לצמיתות.`
            : `Are you sure you want to delete "${property.address}"? All data including contracts and payments will be permanently deleted.`
        }
        isDeleting={isDeleting}
        requireDoubleConfirm={true}
      />

      <AddPaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onSuccess={() => {
          // Update cache/lists
          clear();
          setRefreshKey((prev) => prev + 1);
        }}
        initialData={{
          contract_id: (property as any).contracts?.find(
            (c: any) => c.status === "active",
          )?.id,
        }}
      />

      <GlobalDocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          // Invalidate cache and trigger re-fetch to show new document
          clear();
          setRefreshKey((prev) => prev + 1);
        }}
        properties={[property]}
        initialPropertyId={property.id}
      />

      <ProtocolWizard
        isOpen={isProtocolWizardOpen}
        onClose={() => setIsProtocolWizardOpen(false)}
        propertyId={propertyId}
      />
    </div>
  );
}
