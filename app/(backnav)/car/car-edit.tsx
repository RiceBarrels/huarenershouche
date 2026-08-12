"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRouteParams } from "@/lib/use-route-params";
import { Loader2, Upload, X, Plus, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { geocodeZipToCoords, lookupZip } from "@/lib/geocode";
import { isCarfaxUrl, normalizeCarfaxUrl, fetchCarfaxSummary, formatCarfaxSummary, type CarfaxSummary } from "@/lib/carfax";
import { useIdentity } from "@/components/identity-provider";
import type { DbCar } from "@/lib/types";

const FUEL_TYPES = ["汽油", "柴油", "纯电", "混动", "插电混动"];
const TRANSMISSIONS = ["AT 自动", "MT 手动", "CVT 无级", "DCT 双离合", "AMT 机械自动", "单速(电动车)"];

const EXTERIOR_COLORS = [
  { value: "珍珠白", hex: "#F5F5F0" }, { value: "水晶白", hex: "#FFFFFF" }, { value: "雪花白", hex: "#FFFAFA" },
  { value: "曜石黑", hex: "#1A1A1A" }, { value: "水晶黑", hex: "#2C2C2C" }, { value: "钢琴黑", hex: "#0D0D0D" },
  { value: "铂金灰", hex: "#8C8C8C" }, { value: "暗影灰", hex: "#5A5A5A" }, { value: "火山灰", hex: "#6B6B6B" },
  { value: "现代钢", hex: "#71797E" }, { value: "水泥灰", hex: "#95918C" }, { value: "午夜银", hex: "#A9A9A9" },
  { value: "亮银色", hex: "#C0C0C0" }, { value: "矿石白", hex: "#E8E4DF" },
  { value: "深海蓝", hex: "#1B3A5C" }, { value: "纳瓦拉蓝", hex: "#2E5090" }, { value: "天际蓝", hex: "#4A90D9" },
  { value: "宝石蓝", hex: "#1E3A8A" }, { value: "冰川蓝", hex: "#A0C4E8" },
  { value: "超音速红", hex: "#C41E3A" }, { value: "烈焰红", hex: "#E02020" }, { value: "勃艮第红", hex: "#6C1D45" }, { value: "酒红色", hex: "#722F37" },
  { value: "香槟金", hex: "#C9B37C" }, { value: "棕褐色", hex: "#7B5B3A" }, { value: "摩卡棕", hex: "#6B4226" }, { value: "古铜色", hex: "#8B6E4E" },
  { value: "墨绿色", hex: "#2D5A3D" }, { value: "橄榄绿", hex: "#556B2F" }, { value: "英国赛车绿", hex: "#004225" },
  { value: "橙色", hex: "#E87830" }, { value: "日落橙", hex: "#FF6B35" },
  { value: "紫色", hex: "#6A0DAD" }, { value: "珊瑚色", hex: "#FF7F7F" }, { value: "黄色", hex: "#FFD700" }, { value: "青色", hex: "#00CED1" },
];

const INTERIOR_COLORS = [
  { value: "黑色真皮", hex: "#1A1A1A" }, { value: "黑色织物", hex: "#2C2C2C" }, { value: "黑色翻毛皮", hex: "#333333" },
  { value: "米色真皮", hex: "#D4C5A9" }, { value: "米色织物", hex: "#C2B280" },
  { value: "棕色真皮", hex: "#8B6914" }, { value: "红色真皮", hex: "#8B2500" }, { value: "红棕色真皮", hex: "#A0522D" },
  { value: "灰色织物", hex: "#808080" }, { value: "灰色真皮", hex: "#696969" },
  { value: "白色真皮", hex: "#F0EDE8" }, { value: "奶油色真皮", hex: "#FFFDD0" },
  { value: "蓝色真皮", hex: "#1B3A5C" }, { value: "双色内饰", hex: "#D2B48C" },
];

function colorDot(hex: string) {
  return <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-border" style={{ backgroundColor: hex }} />;
}

const makeOptions: ComboboxOption[] = [
  ...MAKES.map((m) => ({ value: m, label: `${MAKES_ZH[m]} ${m}` })),
  { value: "Other", label: "其他品牌" },
];
const fuelOptions: ComboboxOption[] = FUEL_TYPES.map((f) => ({ value: f, label: f }));
const transmissionOptions: ComboboxOption[] = TRANSMISSIONS.map((t) => ({ value: t, label: t }));
const exteriorColorOptions: ComboboxOption[] = EXTERIOR_COLORS.map((c) => ({ value: c.value, label: c.value, icon: colorDot(c.hex) }));
const interiorColorOptions: ComboboxOption[] = INTERIOR_COLORS.map((c) => ({ value: c.value, label: c.value, icon: colorDot(c.hex) }));
const drivetrainOptions: ComboboxOption[] = [
  { value: "FWD", label: "前驱 FWD" }, { value: "AWD", label: "全驱 AWD" },
  { value: "4WD", label: "四驱 4WD" }, { value: "RWD", label: "后驱 RWD" },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

export default function EditCarPage() {
  const router = useRouter();
  const params = useRouteParams<{ id: string }>();
  const carId = params.id as string;
  const { actingId, authId } = useIdentity();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [car, setCar] = useState<DbCar | null>(null);

  const [form, setForm] = useState({
    price: "", mileage: "", zipcode: "", phone: "", seller_name: "",
    fuel_type: "", transmission: "", exterior_color: "", interior_color: "",
    drivetrain: "", description_zh: "", make: "", model: "", year: "",
    trim: "", customMake: "", carfax_url: "",
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [carfaxLoading, setCarfaxLoading] = useState(false);
  const [carfaxSummary, setCarfaxSummary] = useState<CarfaxSummary | null>(null);
  const [dragging, setDragging] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (!actingId) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      // 归属按当前操作身份(切换成车行时可编辑车行自发的车)
      const acct = actingId || user.id;
      setUserId(acct);

      // Check admin（管理员判定用真实账号）
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const admin = profile?.role === "admin";
      if (admin) setIsAdmin(true);

      const { data: carData } = await supabase.from("cars").select("*").eq("id", carId).single();
      if (!carData) { router.push("/account/listings"); return; }

      const c = carData as DbCar;
      // 自动检索车源不可编辑(只能停用),非管理员一律拦截
      if (c.source_id && !admin) {
        router.push(`/car/${carId}`);
        return;
      }
      // 仅归属者(本人或所操作车行)或管理员可编辑
      if (c.seller_id !== acct && !admin) {
        router.push(`/car/${carId}`);
        return;
      }

      setCar(c);
      const isOther = !(MAKES as readonly string[]).includes(c.make);
      setForm({
        price: String(c.price),
        mileage: String(c.mileage),
        zipcode: c.location?.match(/\b\d{5}\b/)?.[0] || "",
        phone: c.phone || "",
        seller_name: c.seller_name || "",
        fuel_type: c.fuel_type || "汽油",
        transmission: c.transmission || "AT 自动",
        exterior_color: c.exterior_color || "",
        interior_color: c.interior_color || "",
        drivetrain: c.drivetrain || "",
        description_zh: c.description_zh || "",
        make: isOther ? "Other" : c.make,
        model: c.model,
        year: String(c.year),
        trim: c.trim || "",
        customMake: isOther ? c.make : "",
        carfax_url: c.carfax_url || "",
      });
      if (c.carfax_summary) {
        setCarfaxSummary({ title: "Carfax Report", owners: null, accidents: null, serviceRecords: null });
      }
      setImageUrls([c.image_url, ...(c.images || [])].filter(Boolean) as string[]);
      setFeatures(c.features || []);
      setLoading(false);
    }
    load();
  }, [carId, router, actingId]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadFiles(files: File[]) {
    if (!userId || files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop();
      // 存储桶 RLS 按 auth.uid() 文件夹校验,故传到本人文件夹
      const path = `${authId || userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("car-images").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("car-images").getPublicUrl(path);
        setImageUrls((prev) => [...prev, urlData.publicUrl]);
      }
    }
    setUploading(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    await uploadFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) {
      uploadFiles(files);
      return;
    }

    // Dropped image from web page
    const html = e.dataTransfer.getData("text/html");
    const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");

    let imgUrl = "";
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) imgUrl = match[1];
    }
    if (!imgUrl && uri && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif|bmp)/i.test(uri)) {
      imgUrl = uri;
    }

    if (imgUrl) {
      setUploading(true);
      try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const ext = imgUrl.split(".").pop()?.split("?")[0] || "jpg";
        const file = new File([blob], `web-${Date.now()}.${ext}`, { type: blob.type || "image/jpeg" });
        await uploadFiles([file]);
      } catch {
        setImageUrls((prev) => [...prev, imgUrl]);
        setUploading(false);
      }
    }
  }

  async function handleSave() {
    if (!car || !userId) return;
    setError("");

    if (imageUrls.length === 0) {
      setError("请至少上传一张车辆照片");
      return;
    }
    setSaving(true);

    const newPrice = Number(form.price);
    const oldPrice = car.price;
    const actualMake = form.make === "Other" ? form.customMake.trim() : form.make;
    const makeZh = form.make === "Other" ? actualMake : (MAKES_ZH[form.make] || actualMake);
    const titleEn = `${form.year} ${actualMake} ${form.model}${form.trim ? " " + form.trim : ""}`;
    const titleZh = `${form.year} ${makeZh} ${form.model}${form.trim ? " " + form.trim : ""}`;

    // Price change logic: track original price if changed after 24h (admin bypasses)
    const createdAt = new Date(car.created_at).getTime();
    const lastPriceUpdate = car.price_updated_at ? new Date(car.price_updated_at).getTime() : createdAt;
    const hoursSinceLastChange = (Date.now() - lastPriceUpdate) / (1000 * 60 * 60);
    const priceChanged = newPrice !== oldPrice;

    let originalPrice = car.original_price;
    let priceUpdatedAt = car.price_updated_at;

    if (priceChanged) {
      if (isAdmin || hoursSinceLastChange >= 24) {
        // Set original_price to old price (or keep existing original if already set)
        if (!originalPrice) originalPrice = oldPrice;
        priceUpdatedAt = new Date().toISOString();
      } else {
        setError(`价格修改需在发布/上次改价后满 24 小时（还需等待 ${Math.ceil(24 - hoursSinceLastChange)} 小时）`);
        setSaving(false);
        return;
      }
    }

    // Geocode
    const coords = form.zipcode ? await geocodeZipToCoords(form.zipcode) : null;
    const [zipEn, zipZh] = form.zipcode
      ? await Promise.all([lookupZip(form.zipcode, "en"), lookupZip(form.zipcode, "zh")])
      : [null, null];
    const locationEn = zipEn ? `${zipEn.city}, ${zipEn.stateCode} ${form.zipcode}` : car.location;
    const locationZh = zipZh?.city || car.location_zh;

    const { error: updateError } = await supabase
      .from("cars")
      .update({
        title: titleEn,
        title_zh: titleZh,
        make: actualMake,
        model: form.model,
        year: Number(form.year),
        trim: form.trim || null,
        price: newPrice,
        original_price: originalPrice,
        price_updated_at: priceUpdatedAt,
        mileage: Number(form.mileage),
        location: locationEn,
        location_zh: locationZh,
        lat: coords?.lat || car.lat,
        lng: coords?.lng || car.lng,
        image_url: imageUrls[0] || null,
        images: imageUrls.slice(1),
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        exterior_color: form.exterior_color || null,
        interior_color: form.interior_color || null,
        drivetrain: form.drivetrain || null,
        description_zh: form.description_zh || null,
        seller_name: form.seller_name,
        phone: form.phone || null,
        carfax_url: form.carfax_url ? normalizeCarfaxUrl(form.carfax_url) : null,
        carfax_summary: carfaxSummary ? formatCarfaxSummary(carfaxSummary) : (car.carfax_summary || null),
        features,
      })
      .eq("id", carId);

    setSaving(false);
    if (updateError) {
      setError(`保存失败: ${updateError.message}`);
    } else {
      router.push(`/car/${carId}`);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  if (!car) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-logo text-xl tracking-tight">编辑车辆</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{car.title_zh}</p>

        <div className="mt-6 space-y-6">
          {/* Images */}
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">照片（支持拖拽上传）</Label>
            <div
              className={`mt-2 flex flex-wrap gap-2 p-2 transition-colors ${dragging ? "bg-muted/80 ring-2 ring-foreground/20" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {imageUrls.map((url, i) => (
                <div key={url} className="group relative h-20 w-28 rounded-xl bg-muted">
                  <img src={url} alt="" className="h-full w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 rounded-tr-lg rounded-bl-xl bg-foreground px-1 py-0.5 text-[9px] text-background">封面</span>
                  )}
                </div>
              ))}
              <label className="flex h-20 w-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 hover:border-foreground/30">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-[9px] text-muted-foreground">拖拽或点击</span>
                  </div>
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">品牌</Label>
              <Combobox options={makeOptions} value={form.make} onValueChange={(v) => update("make", v)} placeholder="选择品牌" className="mt-1" />
            </div>
            {form.make === "Other" && (
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">自定义品牌</Label>
                <Input className="mt-1 h-9 font-mono text-xs" value={form.customMake} onChange={(e) => update("customMake", e.target.value)} />
              </div>
            )}
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">型号</Label>
              <Input className="mt-1 h-9 font-mono text-xs" value={form.model} onChange={(e) => update("model", e.target.value)} />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">年份</Label>
              <Input className="mt-1 h-9 font-mono text-xs" type="number" value={form.year} onChange={(e) => update("year", e.target.value)} />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">配置</Label>
              <Input className="mt-1 h-9 font-mono text-xs" value={form.trim} onChange={(e) => update("trim", e.target.value)} placeholder="如 SE, Limited" />
            </div>
          </div>

          {/* Price & Mileage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">
                价格 *
                {car.price !== Number(form.price) && Number(form.price) > 0 && (
                  <span className="ml-2 text-[10px] text-muted-foreground/60">
                    原价 {formatPrice(car.price)}
                  </span>
                )}
              </Label>
              <Input className="mt-1 h-9 font-mono text-xs" type="number" value={form.price} onChange={(e) => update("price", e.target.value)} required />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">里程 (mi) *</Label>
              <Input className="mt-1 h-9 font-mono text-xs" type="number" value={form.mileage} onChange={(e) => update("mileage", e.target.value)} required />
            </div>
          </div>

          {/* Vehicle details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">燃油类型</Label>
              <Combobox options={fuelOptions} value={form.fuel_type} onValueChange={(v) => update("fuel_type", v)} className="mt-1" />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">变速箱</Label>
              <Combobox options={transmissionOptions} value={form.transmission} onValueChange={(v) => update("transmission", v)} className="mt-1" />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">外观颜色</Label>
              <Combobox options={exteriorColorOptions} value={form.exterior_color} onValueChange={(v) => update("exterior_color", v)} className="mt-1" />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">内饰颜色</Label>
              <Combobox options={interiorColorOptions} value={form.interior_color} onValueChange={(v) => update("interior_color", v)} className="mt-1" />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">驱动方式</Label>
              <Combobox options={drivetrainOptions} value={form.drivetrain} onValueChange={(v) => update("drivetrain", v)} className="mt-1" />
            </div>
          </div>

          {/* Location & Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">ZIP Code</Label>
              <Input className="mt-1 h-9 font-mono text-xs" maxLength={5} inputMode="numeric" value={form.zipcode} onChange={(e) => update("zipcode", e.target.value.replace(/\D/g, "").slice(0, 5))} />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">联系电话</Label>
              <Input className="mt-1 h-9 font-mono text-xs" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">卖家名称</Label>
              <Input className="mt-1 h-9 font-mono text-xs" value={form.seller_name} onChange={(e) => update("seller_name", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">描述</Label>
            <textarea
              className="mt-1 w-full resize-none rounded-xl bg-muted px-3 py-2.5 font-mono text-xs transition-colors focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={4}
              value={form.description_zh}
              onChange={(e) => update("description_zh", e.target.value)}
              placeholder="车况描述、改装信息等..."
            />
          </div>

          {/* Carfax */}
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">Carfax 报告</Label>
            <div className="mt-1 flex gap-2">
              <Input
                className="h-9 flex-1 font-mono text-xs"
                placeholder="https://www.carfax.com/vehicle/..."
                value={form.carfax_url}
                onChange={(e) => {
                  update("carfax_url", e.target.value);
                  setCarfaxSummary(null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 font-mono text-[11px]"
                disabled={carfaxLoading || !form.carfax_url.trim()}
                onClick={async () => {
                  const url = normalizeCarfaxUrl(form.carfax_url);
                  if (!isCarfaxUrl(url)) {
                    setError("请输入有效的 Carfax 链接");
                    return;
                  }
                  setCarfaxLoading(true);
                  setError("");
                  const result = await fetchCarfaxSummary(url);
                  setCarfaxLoading(false);
                  if (result) {
                    setCarfaxSummary(result);
                  } else {
                    setCarfaxSummary({ title: "Carfax Report", owners: null, accidents: null, serviceRecords: null });
                  }
                }}
              >
                {carfaxLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                获取
              </Button>
            </div>
            {(carfaxSummary || car.carfax_summary) && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <span className="flex-1 font-mono text-[11px]">
                  {carfaxSummary ? formatCarfaxSummary(carfaxSummary) : car.carfax_summary}
                </span>
                {form.carfax_url && (
                  <a
                    href={normalizeCarfaxUrl(form.carfax_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    Carfax
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Features */}
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">亮点标签</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {features.map((f) => (
                <span key={f} className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-mono text-[11px]">
                  {f}
                  <button type="button" onClick={() => setFeatures((prev) => prev.filter((x) => x !== f))}>
                    <X className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={2} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  className="h-7 w-24 font-mono text-[11px]"
                  placeholder="添加标签"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && featureInput.trim()) {
                      e.preventDefault();
                      setFeatures((prev) => [...prev, featureInput.trim()]);
                      setFeatureInput("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!featureInput.trim()}
                  onClick={() => {
                    if (featureInput.trim()) {
                      setFeatures((prev) => [...prev, featureInput.trim()]);
                      setFeatureInput("");
                    }
                  }}
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-[11px] text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button className="gap-1.5 font-mono text-xs" disabled={saving} onClick={handleSave}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
              保存修改
            </Button>
            <Button variant="secondary" className="font-mono text-xs" onClick={() => router.back()}>
              取消
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
