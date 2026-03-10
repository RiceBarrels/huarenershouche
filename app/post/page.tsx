"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Plus, Loader2, Store, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthDialog } from "@/components/auth-dialog";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { geocodeZipToCoords } from "@/lib/geocode";
import type { DbDealerStore } from "@/lib/types";

const FUEL_TYPES = ["汽油", "柴油", "纯电", "混动", "插电混动"];
const TRANSMISSIONS = ["AT", "手动", "CVT", "双离合", "E-CVT"];
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => 2026 - i);

const EXTERIOR_COLORS = [
  { value: "珍珠白", hex: "#F5F5F0" },
  { value: "水晶白", hex: "#FFFFFF" },
  { value: "雪花白", hex: "#FFFAFA" },
  { value: "曜石黑", hex: "#1A1A1A" },
  { value: "水晶黑", hex: "#2C2C2C" },
  { value: "钢琴黑", hex: "#0D0D0D" },
  { value: "铂金灰", hex: "#8C8C8C" },
  { value: "暗影灰", hex: "#5A5A5A" },
  { value: "火山灰", hex: "#6B6B6B" },
  { value: "现代钢", hex: "#71797E" },
  { value: "水泥灰", hex: "#95918C" },
  { value: "午夜银", hex: "#A9A9A9" },
  { value: "亮银色", hex: "#C0C0C0" },
  { value: "矿石白", hex: "#E8E4DF" },
  { value: "深海蓝", hex: "#1B3A5C" },
  { value: "纳瓦拉蓝", hex: "#2E5090" },
  { value: "天际蓝", hex: "#4A90D9" },
  { value: "宝石蓝", hex: "#1E3A8A" },
  { value: "冰川蓝", hex: "#A0C4E8" },
  { value: "超音速红", hex: "#C41E3A" },
  { value: "烈焰红", hex: "#E02020" },
  { value: "勃艮第红", hex: "#6C1D45" },
  { value: "酒红色", hex: "#722F37" },
  { value: "香槟金", hex: "#C9B37C" },
  { value: "棕褐色", hex: "#7B5B3A" },
  { value: "摩卡棕", hex: "#6B4226" },
  { value: "古铜色", hex: "#8B6E4E" },
  { value: "墨绿色", hex: "#2D5A3D" },
  { value: "橄榄绿", hex: "#556B2F" },
  { value: "英国赛车绿", hex: "#004225" },
  { value: "橙色", hex: "#E87830" },
  { value: "日落橙", hex: "#FF6B35" },
  { value: "紫色", hex: "#6A0DAD" },
  { value: "珊瑚色", hex: "#FF7F7F" },
  { value: "黄色", hex: "#FFD700" },
  { value: "青色", hex: "#00CED1" },
];

const INTERIOR_COLORS = [
  { value: "黑色真皮", hex: "#1A1A1A" },
  { value: "黑色织物", hex: "#2C2C2C" },
  { value: "黑色翻毛皮", hex: "#333333" },
  { value: "米色真皮", hex: "#D4C5A9" },
  { value: "米色织物", hex: "#C2B280" },
  { value: "棕色真皮", hex: "#8B6914" },
  { value: "红色真皮", hex: "#8B2500" },
  { value: "红棕色真皮", hex: "#A0522D" },
  { value: "灰色织物", hex: "#808080" },
  { value: "灰色真皮", hex: "#696969" },
  { value: "白色真皮", hex: "#F0EDE8" },
  { value: "奶油色真皮", hex: "#FFFDD0" },
  { value: "蓝色真皮", hex: "#1B3A5C" },
  { value: "双色内饰", hex: "#D2B48C" },
];

function colorDot(hex: string) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-border"
      style={{ backgroundColor: hex }}
    />
  );
}

// Pre-build combobox options
const makeOptions: ComboboxOption[] = MAKES.map((m) => ({
  value: m,
  label: `${MAKES_ZH[m]} ${m}`,
}));

const yearOptions: ComboboxOption[] = YEAR_OPTIONS.map((y) => ({
  value: String(y),
  label: String(y),
}));


const fuelOptions: ComboboxOption[] = FUEL_TYPES.map((f) => ({
  value: f,
  label: f,
}));

const transmissionOptions: ComboboxOption[] = TRANSMISSIONS.map((t) => ({
  value: t,
  label: t,
}));

const exteriorColorOptions: ComboboxOption[] = EXTERIOR_COLORS.map((c) => ({
  value: c.value,
  label: c.value,
  icon: colorDot(c.hex),
}));

const interiorColorOptions: ComboboxOption[] = INTERIOR_COLORS.map((c) => ({
  value: c.value,
  label: c.value,
  icon: colorDot(c.hex),
}));

const drivetrainOptions: ComboboxOption[] = [
  { value: "FWD", label: "前驱 FWD" },
  { value: "AWD", label: "全驱 AWD" },
  { value: "4WD", label: "四驱 4WD" },
  { value: "RWD", label: "后驱 RWD" },
];

const bodyTypeOptions: ComboboxOption[] = [
  { value: "sedan", label: "轿车 Sedan" },
  { value: "suv", label: "越野车 SUV" },
  { value: "van", label: "面包车 Van" },
  { value: "sports", label: "跑车 Sports Car" },
  { value: "wagon", label: "旅行车 Wagon" },
  { value: "pickup", label: "皮卡 Pickup" },
];

const cylinderOptions: ComboboxOption[] = [
  { value: "3", label: "3缸" },
  { value: "4", label: "4缸" },
  { value: "5", label: "5缸" },
  { value: "6", label: "6缸" },
  { value: "8", label: "8缸" },
  { value: "10", label: "10缸" },
  { value: "12", label: "12缸" },
];

const seatOptions: ComboboxOption[] = [
  { value: "2", label: "2座" },
  { value: "3", label: "3座" },
  { value: "4", label: "4座" },
  { value: "5", label: "5座" },
  { value: "6", label: "6座" },
  { value: "7", label: "7座" },
  { value: "8", label: "8座" },
  { value: "9", label: "9座" },
  { value: "other", label: "其他" },
];

const conditionOptions: ComboboxOption[] = [
  { value: "new", label: "新车 New" },
  { value: "used", label: "二手 Used" },
];

const DRAFT_KEY = "huaren_post_draft";

function loadDraft(): { form: Record<string, string>; imageUrls: string[]; features: string[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(form: Record<string, string>, imageUrls: string[], features: string[]) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, imageUrls, features }));
  } catch { /* ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export default function PostCarPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const [priceCallOnly, setPriceCallOnly] = useState(false);
  const [showCallWarning, setShowCallWarning] = useState(false);
  const [isDealer, setIsDealer] = useState(false);
  const [dealerStores, setDealerStores] = useState<DbDealerStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const defaultForm = {
    make: "",
    model: "",
    year: "",
    trim: "",
    price: "",
    mileage: "",
    zipcode: "",
    address: "",
    fuel_type: "汽油",
    transmission: "AT",
    exterior_color: "",
    interior_color: "",
    drivetrain: "",
    body_type: "",
    cylinders: "",
    seats: "",
    condition: "used",
    vin: "",
    seller_name: "",
    phone: "",
    description_zh: "",
  };

  const [form, setForm] = useState(defaultForm);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
      setForm((f) => ({ ...f, ...draft.form }));
      setImageUrls(draft.imageUrls || []);
      setFeatures(draft.features || []);
    }
  }, []);

  // Auto-save draft on changes (debounced)
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  const imageUrlsRef = useRef(imageUrls);
  const featuresRef = useRef(features);
  formRef.current = form;
  imageUrlsRef.current = imageUrls;
  featuresRef.current = features;

  const scheduleDraftSave = useCallback(() => {
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    draftTimeoutRef.current = setTimeout(() => {
      saveDraft(formRef.current, imageUrlsRef.current, featuresRef.current);
    }, 500);
  }, []);

  useEffect(() => {
    scheduleDraftSave();
  }, [form, imageUrls, features, scheduleDraftSave]);

  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user.id);
        // Ensure profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, phone, account_type")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!profile) {
          // Auto-create profile if trigger didn't fire
          await supabase.from("profiles").insert({
            id: data.user.id,
            username:
              data.user.user_metadata?.username || data.user.email || "",
          });
          setForm((f) => ({
            ...f,
            seller_name:
              data.user!.user_metadata?.username || data.user!.email || "",
          }));
        } else {
          const dealer = profile.account_type === "dealer";
          setIsDealer(dealer);
          setForm((f) => ({
            ...f,
            seller_name: profile.username || "",
            phone: profile.phone || "",
          }));

          // Fetch dealer stores if dealer
          if (dealer) {
            const { data: stores } = await supabase
              .from("dealer_stores")
              .select("*")
              .eq("owner_id", data.user!.id)
              .order("created_at", { ascending: false });
            setDealerStores((stores as DbDealerStore[]) || []);
          }
        }
      }
    });
  }, []);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    await uploadFiles(Array.from(files));
  }

  async function uploadFiles(files: File[]) {
    if (!user || files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop();
      const path = `${user}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("car-images")
        .upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("car-images").getPublicUrl(path);
        setImageUrls((prev) => [...prev, publicUrl]);
      }
    }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function addFeature() {
    const trimmed = featureInput.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures((prev) => [...prev, trimmed]);
      setFeatureInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);

    const titleEn = `${form.year} ${form.make} ${form.model}${form.trim ? " " + form.trim : ""}`;
    const titleZh = `${form.year} ${MAKES_ZH[form.make] || form.make} ${form.model}${form.trim ? " " + form.trim : ""}`;

    // Geocode zipcode to get lat/lng
    const coords = form.zipcode ? await geocodeZipToCoords(form.zipcode) : null;

    // Also save phone to profile
    if (form.phone) {
      await supabase
        .from("profiles")
        .update({ phone: form.phone })
        .eq("id", user);
    }

    const { data, error: insertError } = await supabase
      .from("cars")
      .insert({
        seller_id: user,
        title: titleEn,
        title_zh: titleZh,
        year: Number(form.year),
        make: form.make,
        model: form.model,
        trim: form.trim || null,
        price: Number(form.price),
        mileage: Number(form.mileage),
        location: form.address || form.zipcode,
        location_zh: form.address || form.zipcode,
        image_url: imageUrls[0] || null,
        images: imageUrls.slice(1),
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        exterior_color: form.exterior_color || null,
        interior_color: form.interior_color || null,
        vin: form.vin || null,
        seller_name: form.seller_name,
        phone: form.phone || null,
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        description_zh: form.description_zh || null,
        features,
        status: "active",
      })
      .select("id")
      .single();

    setLoading(false);
    if (insertError) {
      setError(`发布失败: ${insertError.message}`);
    } else if (data) {
      clearDraft();
      router.push(`/car/${data.id}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-mono text-lg font-semibold tracking-tight">
          发布车辆
        </h1>
        <div className="mt-1 flex items-center gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            填写车辆信息，发布后即可被其他用户看到
          </p>
          {hasDraft && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <FileText className="h-3 w-3" strokeWidth={1.5} />
              已恢复草稿
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  setForm(defaultForm);
                  setImageUrls([]);
                  setFeatures([]);
                  setHasDraft(false);
                }}
                className="ml-1 underline underline-offset-2 hover:text-foreground"
              >
                清除
              </button>
            </span>
          )}
        </div>

        {!user ? (
          <div className="mt-8 flex flex-col items-center border border-border p-8">
            <p className="font-mono text-sm text-muted-foreground">
              请先登录后再发布车辆
            </p>
            <AuthDialog onSuccess={() => window.location.reload()}>
              <Button size="sm" className="mt-4 font-mono text-xs">
                登录 / 注册
              </Button>
            </AuthDialog>
          </div>
        ) : (
          <>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Images */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                车辆照片
              </Label>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                第一张将作为封面图，建议上传 5-10 张，支持拖拽上传
              </p>
              <div
                className={`mt-2 flex flex-wrap gap-2 rounded p-2 transition-colors ${
                  dragging ? "bg-muted/80 ring-2 ring-foreground/20" : ""
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                {imageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="group relative h-24 w-32 border border-border bg-muted"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-foreground text-background opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-foreground/80 px-1 py-0.5 font-mono text-[9px] text-background">
                        封面
                      </span>
                    )}
                  </div>
                ))}
                <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center border border-dashed border-border transition-colors hover:border-foreground/30">
                  {uploading ? (
                    <Loader2
                      className="h-5 w-5 animate-spin text-muted-foreground"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <>
                      <Upload
                        className="h-5 w-5 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                      <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                        上传照片
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {/* Basic info */}
            <div className="border-t border-border pt-6">
              <h2 className="font-mono text-xs font-semibold">基本信息</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    品牌 *
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={makeOptions}
                      value={form.make}
                      onValueChange={(v) => update("make", v)}
                      placeholder="选择品牌"
                      searchPlaceholder="搜索品牌..."
                      emptyText="未找到该品牌"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    车型 *
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="如 Camry, CR-V"
                    value={form.model}
                    onChange={(e) => update("model", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    年份 *
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={yearOptions}
                      value={form.year}
                      onValueChange={(v) => update("year", v)}
                      placeholder="选择年份"
                      searchPlaceholder="搜索年份..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    配置等级
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="如 SE, EX-L, Sport"
                    value={form.trim}
                    onChange={(e) => update("trim", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    车况 *
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={conditionOptions}
                      value={form.condition}
                      onValueChange={(v) => update("condition", v)}
                      placeholder="选择车况"
                      searchPlaceholder="搜索..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    价格 ($) *
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      className="h-9 font-mono text-xs"
                      type="number"
                      placeholder="25000"
                      value={form.price}
                      onChange={(e) => update("price", e.target.value)}
                      required={!priceCallOnly}
                      disabled={priceCallOnly}
                    />
                  </div>
                  <label className="mt-1.5 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceCallOnly}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setShowCallWarning(true);
                        } else {
                          setPriceCallOnly(false);
                          setShowCallWarning(false);
                        }
                      }}
                      className="h-3 w-3"
                    />
                    <span className="font-mono text-[10px] text-muted-foreground">电议</span>
                  </label>
                  {showCallWarning && !priceCallOnly && (
                    <div className="mt-2 border border-yellow-500/50 bg-yellow-500/5 p-2">
                      <p className="font-mono text-[11px] text-yellow-600 dark:text-yellow-400">
                        注意：选择电议可能会影响曝光率
                      </p>
                      <div className="mt-1.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setPriceCallOnly(true); setShowCallWarning(false); update("price", "0"); }}
                          className="font-mono text-[10px] text-foreground underline"
                        >
                          确认电议
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCallWarning(false)}
                          className="font-mono text-[10px] text-muted-foreground"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    里程 (mi) *
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    type="number"
                    placeholder="12000"
                    value={form.mileage}
                    onChange={(e) => update("mileage", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Vehicle details */}
            <div className="border-t border-border pt-6">
              <h2 className="font-mono text-xs font-semibold">车辆详情</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    燃油类型
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={fuelOptions}
                      value={form.fuel_type}
                      onValueChange={(v) => update("fuel_type", v)}
                      placeholder="选择燃油"
                      searchPlaceholder="搜索..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    变速箱
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={transmissionOptions}
                      value={form.transmission}
                      onValueChange={(v) => update("transmission", v)}
                      placeholder="选择变速箱"
                      searchPlaceholder="搜索..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    外观颜色
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={exteriorColorOptions}
                      value={form.exterior_color}
                      onValueChange={(v) => update("exterior_color", v)}
                      placeholder="选择颜色"
                      searchPlaceholder="搜索颜色..."
                      emptyText="未找到该颜色"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    内饰颜色
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={interiorColorOptions}
                      value={form.interior_color}
                      onValueChange={(v) => update("interior_color", v)}
                      placeholder="选择颜色"
                      searchPlaceholder="搜索颜色..."
                      emptyText="未找到该颜色"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    驱动方式
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={drivetrainOptions}
                      value={form.drivetrain}
                      onValueChange={(v) => update("drivetrain", v)}
                      placeholder="选择驱动"
                      searchPlaceholder="搜索..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    车辆类型
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={bodyTypeOptions}
                      value={form.body_type}
                      onValueChange={(v) => update("body_type", v)}
                      placeholder="选择车型"
                      searchPlaceholder="搜索..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    气缸数
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={cylinderOptions}
                      value={form.cylinders}
                      onValueChange={(v) => update("cylinders", v)}
                      placeholder="选择气缸"
                      searchPlaceholder="搜索..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    座位数
                  </Label>
                  <div className="mt-1">
                    <Combobox
                      options={seatOptions}
                      value={form.seats}
                      onValueChange={(v) => update("seats", v)}
                      placeholder="选择座位"
                      searchPlaceholder="搜索..."
                      emptyText="未找到"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    VIN
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="车辆识别号"
                    value={form.vin}
                    onChange={(e) => update("vin", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    所在 Zipcode *
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="如 91007"
                    maxLength={5}
                    value={form.zipcode}
                    onChange={(e) => update("zipcode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    详细地址
                  </Label>
                  {isDealer && dealerStores.length > 0 && (
                    <div className="mt-1 mb-2 flex flex-wrap gap-1.5">
                      {dealerStores.map((store) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => {
                            setSelectedStoreId(store.id);
                            setForm((f) => ({
                              ...f,
                              address: store.address,
                              zipcode: store.zipcode || f.zipcode,
                              phone: store.phone || f.phone,
                              seller_name: store.name,
                            }));
                          }}
                          className={`flex items-center gap-1 border px-2 py-1 font-mono text-[11px] transition-colors ${
                            selectedStoreId === store.id
                              ? "border-foreground bg-foreground text-background"
                              : "border-border hover:border-foreground/30"
                          }`}
                        >
                          <Store className="h-3 w-3" strokeWidth={1.5} />
                          {store.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="123 Main St, City, CA"
                    value={form.address}
                    onChange={(e) => {
                      update("address", e.target.value);
                      setSelectedStoreId("");
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="border-t border-border pt-6">
              <h2 className="font-mono text-xs font-semibold">车辆配置</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {features.map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-[11px]"
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() =>
                        setFeatures((prev) => prev.filter((x) => x !== f))
                      }
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  className="h-8 font-mono text-xs"
                  placeholder="添加配置，如：倒车影像、全景天窗"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 font-mono text-xs"
                  onClick={addFeature}
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                  添加
                </Button>
              </div>
            </div>

            {/* Seller info */}
            <div className="border-t border-border pt-6">
              <h2 className="font-mono text-xs font-semibold">卖家信息</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    卖家名称 *
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="你的名字或车行名"
                    value={form.seller_name}
                    onChange={(e) => update("seller_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    联系电话 *
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    type="tel"
                    placeholder="(626) 555-0123"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-border pt-6">
              <Label className="font-mono text-xs font-semibold">
                车辆描述
              </Label>
              <textarea
                className="mt-2 w-full border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={5}
                placeholder="描述车辆状况、保养历史、卖车原因等..."
                value={form.description_zh}
                onChange={(e) => update("description_zh", e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="border border-destructive/50 bg-destructive/5 p-3">
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 border-t border-border pt-6">
              <Button
                type="submit"
                className="gap-1.5 font-mono text-xs"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      strokeWidth={1.5}
                    />
                    发布中...
                  </>
                ) : (
                  "发布车辆"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-mono text-xs"
                onClick={() => router.back()}
              >
                取消
              </Button>
            </div>
          </form>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
