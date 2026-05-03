"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, X, Plus, Loader2, Store, FileText, ShieldCheck, Wand2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { geocodeZipToCoords, lookupZip } from "@/lib/geocode";
import { decodeVin, isValidVinFormat, hasVinData } from "@/lib/vin";
import { isCarfaxUrl, normalizeCarfaxUrl, fetchCarfaxSummary, formatCarfaxSummary, type CarfaxSummary } from "@/lib/carfax";
import type { DbDealerStore } from "@/lib/types";

const FUEL_TYPES = ["汽油", "柴油", "纯电", "混动", "插电混动"];
const TRANSMISSIONS = ["AT 自动", "MT 手动", "CVT 无级", "DCT 双离合", "AMT 机械自动", "单速(电动车)"];
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
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);

  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinAutoFilled, setVinAutoFilled] = useState(false);
  const [priceCallOnly, setPriceCallOnly] = useState(false);
  const [showCallWarning, setShowCallWarning] = useState(false);
  const [isDealer, setIsDealer] = useState(false);
  const [dealerStores, setDealerStores] = useState<DbDealerStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [fakeCount, setFakeCount] = useState(5);
  const [fakeGenerating, setFakeGenerating] = useState(false);
  const [fakeDialogOpen, setFakeDialogOpen] = useState(false);
  const [fakeResult, setFakeResult] = useState("");

  const defaultForm = {
    make: "",
    model: "",
    year: "",
    trim: "",
    price: "",
    mileage: "",
    zipcode: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    fuel_type: "汽油",
    transmission: "",
    exterior_color: "",
    interior_color: "",
    drivetrain: "",
    body_type: "",
    cylinders: "",
    seats: "",
    condition: "used",
    vin: "",
    customMake: "",
    seller_name: "",
    phone: "",
    description_zh: "",
    carfax_url: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [carfaxLoading, setCarfaxLoading] = useState(false);
  const [carfaxSummary, setCarfaxSummary] = useState<CarfaxSummary | null>(null);

  // Check for draft on mount — ask user before restoring
  useEffect(() => {
    const draft = loadDraft();
    if (draft && (draft.form?.make || draft.form?.vin || (draft.imageUrls && draft.imageUrls.length > 0))) {
      setDraftDialogOpen(true);
    }
  }, []);

  function restoreDraft() {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
      setForm((f) => ({ ...f, ...draft.form }));
      setImageUrls(draft.imageUrls || []);
      setFeatures(draft.features || []);
    }
    setDraftDialogOpen(false);
  }

  function discardDraft() {
    clearDraft();
    setDraftDialogOpen(false);
  }

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
          .select("username, phone, account_type, role")
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
          if (profile.role === "admin") setIsAdmin(true);
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

  // Auto-resolve zipcode to city name (English + Chinese)
  const [zipCity, setZipCity] = useState("");
  const [zipCityZh, setZipCityZh] = useState("");
  useEffect(() => {
    if (form.zipcode.length !== 5) {
      setZipCity("");
      setZipCityZh("");
      return;
    }
    Promise.all([
      lookupZip(form.zipcode, "en"),
      lookupZip(form.zipcode, "zh"),
    ]).then(([en, zh]) => {
      setZipCity(en ? `${en.city}, ${en.stateCode}` : "");
      setZipCityZh(zh?.city || "");
      // Auto-fill city and state
      if (en) {
        setForm((f) => ({
          ...f,
          city: f.city || en.city,
          state: f.state || en.stateCode,
        }));
      }
    });
  }, [form.zipcode]);

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

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    // 1. Dropped files (local)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) {
      uploadFiles(files);
      return;
    }

    // 2. Dropped image from web page — try to get URL
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
      // Fetch the image and upload as file
      setUploading(true);
      try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const ext = imgUrl.split(".").pop()?.split("?")[0] || "jpg";
        const file = new File([blob], `web-${Date.now()}.${ext}`, { type: blob.type || "image/jpeg" });
        await uploadFiles([file]);
      } catch {
        // If fetch fails (CORS), add URL directly
        setImageUrls((prev) => [...prev, imgUrl]);
        setUploading(false);
      }
    }
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

  async function handleVinAutoFill() {
    const cleaned = form.vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (!isValidVinFormat(cleaned)) {
      setError("请输入有效的 17 位 VIN 码");
      return;
    }
    setVinDecoding(true);
    setError("");
    const result = await decodeVin(cleaned);
    setVinDecoding(false);

    if (!result || !hasVinData(result)) {
      setError("无法识别此 VIN，请手动填写信息");
      return;
    }

    // Map make to MAKES list or use "Other" + customMake
    const matchedMake = MAKES.find(
      (m) => m.toLowerCase() === result.make.toLowerCase()
    );

    // Map fuel type
    const fuelLower = result.fuelType.toLowerCase();
    const fuelMap: Record<string, string> = {
      gasoline: "汽油", diesel: "柴油", electric: "纯电",
      "plug-in hybrid": "插电混动", hybrid: "混动",
    };
    const mappedFuel = Object.entries(fuelMap).find(([k]) => fuelLower.includes(k))?.[1] || "";

    // Map transmission
    const transLower = result.transmission.toLowerCase();
    const mappedTrans = transLower.includes("manual") && !transLower.includes("auto") ? "MT 手动"
      : transLower.includes("cvt") ? "CVT 无级"
      : transLower.includes("dct") || transLower.includes("dual") ? "DCT 双离合"
      : transLower.includes("amt") || transLower.includes("automated manual") ? "AMT 机械自动"
      : transLower.includes("auto") ? "AT 自动" : "";

    // Map drivetrain
    const driveLower = result.driveType.toLowerCase();
    const mappedDrive = driveLower.includes("4wd") || driveLower.includes("4x4") ? "4WD"
      : driveLower.includes("awd") || driveLower.includes("all") ? "AWD"
      : driveLower.includes("rwd") || driveLower.includes("rear") ? "RWD"
      : driveLower.includes("fwd") || driveLower.includes("front") ? "FWD" : "";

    // Map body type
    const bodyLower = result.bodyClass.toLowerCase();
    const mappedBody = bodyLower.includes("sedan") ? "sedan"
      : bodyLower.includes("suv") || bodyLower.includes("sport utility") ? "suv"
      : bodyLower.includes("van") || bodyLower.includes("minivan") ? "van"
      : bodyLower.includes("pickup") || bodyLower.includes("truck") ? "pickup"
      : bodyLower.includes("wagon") ? "wagon"
      : bodyLower.includes("coupe") || bodyLower.includes("convertible") || bodyLower.includes("roadster") ? "sports" : "";

    setForm((prev) => {
      const next = { ...prev };
      if (matchedMake) { next.make = matchedMake; next.customMake = ""; }
      else if (result.make) { next.make = "Other"; next.customMake = result.make; }
      if (result.model) next.model = result.model;
      if (result.year) next.year = String(result.year);
      if (result.trim) next.trim = result.trim;
      if (mappedFuel) next.fuel_type = mappedFuel;
      if (mappedTrans) next.transmission = mappedTrans;
      if (mappedDrive) next.drivetrain = mappedDrive;
      if (result.engineCylinders) next.cylinders = result.engineCylinders;
      if (mappedBody) next.body_type = mappedBody;
      return next;
    });
    setVinAutoFilled(true);
  }

  // === Admin: generate fake listings ===
  const FAKE_MODELS: Record<string, { models: string[]; img: string }> = {
    Toyota: { models: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Prius", "4Runner"], img: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800" },
    Honda: { models: ["Civic", "Accord", "CR-V", "HR-V", "Pilot", "Odyssey"], img: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800" },
    BMW: { models: ["3 Series", "5 Series", "X3", "X5", "X1", "4 Series"], img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800" },
    "Mercedes-Benz": { models: ["C-Class", "E-Class", "GLC", "GLE", "A-Class", "S-Class"], img: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800" },
    Tesla: { models: ["Model 3", "Model Y", "Model S", "Model X"], img: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800" },
    Hyundai: { models: ["Elantra", "Tucson", "Santa Fe", "Sonata", "Kona", "Palisade"], img: "https://images.unsplash.com/photo-1629897048514-3dd7414fe72a?w=800" },
    Ford: { models: ["F-150", "Mustang", "Explorer", "Escape", "Bronco", "Edge"], img: "https://images.unsplash.com/photo-1551830820-330a71b99659?w=800" },
    Lexus: { models: ["RX", "ES", "NX", "IS", "GX", "UX"], img: "https://images.unsplash.com/photo-1622200984595-9e1e1e1e1e1e?w=800" },
    Audi: { models: ["A4", "Q5", "A6", "Q7", "A3", "e-tron"], img: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800" },
    Mazda: { models: ["CX-5", "Mazda3", "CX-30", "CX-50", "MX-5 Miata"], img: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800" },
    Subaru: { models: ["Outback", "Forester", "Crosstrek", "Impreza", "WRX"], img: "https://images.unsplash.com/photo-1626443252351-4f3e2ea27112?w=800" },
    Kia: { models: ["Sportage", "Telluride", "K5", "Forte", "Seltos", "Sorento"], img: "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800" },
    Nissan: { models: ["Altima", "Rogue", "Sentra", "Pathfinder", "Frontier"], img: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800" },
    Chevrolet: { models: ["Silverado", "Equinox", "Malibu", "Traverse", "Camaro", "Tahoe"], img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800" },
    Volkswagen: { models: ["Jetta", "Tiguan", "Atlas", "Golf", "ID.4", "Taos"], img: "https://images.unsplash.com/photo-1622200984595-9e1e1e1e1e1e?w=800" },
  };

  const FAKE_ZIPS = [
    { zip: "10001", city: "New York", cityZh: "纽约", state: "NY" },
    { zip: "90001", city: "Los Angeles", cityZh: "洛杉矶", state: "CA" },
    { zip: "60601", city: "Chicago", cityZh: "芝加哥", state: "IL" },
    { zip: "77001", city: "Houston", cityZh: "休斯顿", state: "TX" },
    { zip: "85001", city: "Phoenix", cityZh: "凤凰城", state: "AZ" },
    { zip: "19101", city: "Philadelphia", cityZh: "费城", state: "PA" },
    { zip: "78201", city: "San Antonio", cityZh: "圣安东尼奥", state: "TX" },
    { zip: "92101", city: "San Diego", cityZh: "圣地亚哥", state: "CA" },
    { zip: "75201", city: "Dallas", cityZh: "达拉斯", state: "TX" },
    { zip: "95101", city: "San Jose", cityZh: "圣何塞", state: "CA" },
    { zip: "94102", city: "San Francisco", cityZh: "旧金山", state: "CA" },
    { zip: "98101", city: "Seattle", cityZh: "西雅图", state: "WA" },
    { zip: "02101", city: "Boston", cityZh: "波士顿", state: "MA" },
    { zip: "30301", city: "Atlanta", cityZh: "亚特兰大", state: "GA" },
    { zip: "33101", city: "Miami", cityZh: "迈阿密", state: "FL" },
    { zip: "48201", city: "Detroit", cityZh: "底特律", state: "MI" },
    { zip: "55401", city: "Minneapolis", cityZh: "明尼阿波利斯", state: "MN" },
    { zip: "20001", city: "Washington", cityZh: "华盛顿", state: "DC" },
    { zip: "89101", city: "Las Vegas", cityZh: "拉斯维加斯", state: "NV" },
    { zip: "97201", city: "Portland", cityZh: "波特兰", state: "OR" },
  ];

  const FAKE_NAMES = ["张先生", "李女士", "王师傅", "赵老板", "刘先生", "陈女士", "杨师傅", "黄老板", "周先生", "吴女士", "Auto Plus", "Car World", "好车行", "信达车行", "华人车行"];

  function randomVin() {
    const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    let vin = "";
    for (let i = 0; i < 17; i++) vin += chars[Math.floor(Math.random() * chars.length)];
    return vin;
  }

  function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async function handleGenerateFake() {
    if (!user) return;
    setFakeGenerating(true);
    setFakeResult("");

    const makes = Object.keys(FAKE_MODELS);
    const listings = [];

    for (let i = 0; i < fakeCount; i++) {
      const make = randomPick(makes);
      const info = FAKE_MODELS[make];
      const model = randomPick(info.models);
      const year = randomInt(2015, 2025);
      const price = randomInt(8000, 65000);
      const mileage = randomInt(5000, 150000);
      const loc = randomPick(FAKE_ZIPS);
      const fuel = make === "Tesla" ? "纯电" : randomPick(["汽油", "汽油", "汽油", "混动"]);
      const trans = make === "Tesla" ? "单速(电动车)" : randomPick(["AT 自动", "AT 自动", "CVT 无级", "DCT 双离合"]);
      const extColor = randomPick(EXTERIOR_COLORS);
      const intColor = randomPick(INTERIOR_COLORS);
      const drivetrain = randomPick(["FWD", "AWD", "RWD"]);
      const makeZh = MAKES_ZH[make] || make;

      listings.push({
        seller_id: user,
        title: `${year} ${make} ${model}`,
        title_zh: `${year} ${makeZh} ${model}`,
        year,
        make,
        model,
        price,
        mileage,
        location: `${loc.city}, ${loc.state} ${loc.zip}`,
        location_zh: `${loc.cityZh}, ${loc.state}`,
        image_url: info.img,
        images: [],
        fuel_type: fuel,
        transmission: trans,
        exterior_color: extColor.value,
        interior_color: intColor.value,
        drivetrain,
        vin: randomVin(),
        seller_name: randomPick(FAKE_NAMES),
        phone: `${randomInt(200, 999)}-${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
        lat: null,
        lng: null,
        description_zh: null,
        features: [],
        status: "active" as const,
      });
    }

    const { error: insertError } = await supabase.from("cars").insert(listings);

    setFakeGenerating(false);
    if (insertError) {
      setFakeResult(`失败: ${insertError.message}`);
    } else {
      setFakeResult(`成功生成 ${fakeCount} 条假车源`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");

    if (imageUrls.length === 0) {
      setError("请至少上传一张车辆照片");
      return;
    }

    if (!isValidVinFormat(form.vin)) {
      setError("请输入有效的 17 位 VIN 码");
      return;
    }

    if (form.make === "Other" && !form.customMake.trim()) {
      setError("请输入品牌名称");
      return;
    }

    // Phone validation: must be at least 10 digits
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!phoneDigits || phoneDigits.length < 10) {
      setError("请输入有效的联系电话（至少 10 位数字）");
      return;
    }

    setLoading(true);

    const actualMake = form.make === "Other" ? form.customMake.trim() : form.make;
    const titleEn = `${form.year} ${actualMake} ${form.model}${form.trim ? " " + form.trim : ""}`;
    const makeZh = form.make === "Other" ? actualMake : (MAKES_ZH[form.make] || actualMake);
    const titleZh = `${form.year} ${makeZh} ${form.model}${form.trim ? " " + form.trim : ""}`;

    // Build location from structured fields
    const fullAddress = [form.address, form.address2].filter(Boolean).join(", ");
    const cityState = [form.city, form.state].filter(Boolean).join(", ");
    const locationEn = fullAddress
      ? `${fullAddress}, ${cityState} ${form.zipcode}`.trim()
      : cityState
        ? `${cityState} ${form.zipcode}`.trim()
        : zipCity || form.zipcode;
    const locationZh = zipCityZh || cityState || zipCity || form.zipcode;

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
        make: actualMake,
        model: form.model,
        trim: form.trim || null,
        price: Number(form.price),
        mileage: Number(form.mileage),
        location: locationEn,
        location_zh: locationZh,
        image_url: imageUrls[0] || null,
        images: imageUrls.slice(1),
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        exterior_color: form.exterior_color || null,
        interior_color: form.interior_color || null,
        vin: form.vin,
        seller_name: form.seller_name,
        phone: form.phone || null,
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        description_zh: form.description_zh || null,
        carfax_url: form.carfax_url ? normalizeCarfaxUrl(form.carfax_url) : null,
        carfax_summary: carfaxSummary ? formatCarfaxSummary(carfaxSummary) : null,
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

        {/* Admin: fake listing generator */}
        {isAdmin && (
          <div className="mt-6 border border-dashed border-yellow-500/50 bg-yellow-500/5 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />
              <span className="font-mono text-xs font-semibold text-yellow-700 dark:text-yellow-400">管理员工具</span>
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              批量生成假车源用于测试和展示
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="font-mono text-[11px] text-muted-foreground">数量</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={fakeCount}
                  onChange={(e) => setFakeCount(Number(e.target.value))}
                  className="h-8 w-20 font-mono text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 font-mono text-xs"
                disabled={fakeGenerating}
                onClick={() => setFakeDialogOpen(true)}
              >
                {fakeGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                批量生成
              </Button>
            </div>
            {fakeResult && (
              <p className={`mt-2 font-mono text-[11px] ${fakeResult.startsWith("失败") ? "text-destructive" : "text-green-600"}`}>
                {fakeResult}
              </p>
            )}
          </div>
        )}

        {/* Confirm dialog for fake generation */}
        <Dialog open={fakeDialogOpen} onOpenChange={setFakeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">确认生成假车源</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                将以当前账号生成 {fakeCount} 条假车源，数据随机生成（品牌、价格、里程、地区等）。确认继续？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setFakeDialogOpen(false)}>
                取消
              </Button>
              <Button
                size="sm"
                className="font-mono text-xs"
                disabled={fakeGenerating}
                onClick={() => {
                  setFakeDialogOpen(false);
                  handleGenerateFake();
                }}
              >
                确认生成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!user ? (
          <div className="mt-8 flex flex-col items-center border border-border p-8">
            <p className="font-mono text-sm text-muted-foreground">
              请先登录后再发布车辆
            </p>
            <Link href="/login">
              <Button size="sm" className="mt-4 font-mono text-xs">
                登录 / 注册
              </Button>
            </Link>
          </div>
        ) : (
          <>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Images */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                车辆照片 <span className="text-destructive">*</span>
              </Label>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                至少上传一张照片，第一张将作为封面图，建议 5-10 张
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
                    <img src={url} alt="" className="h-full w-full object-cover" />
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
                        上传图片
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

            {/* VIN Auto-fill */}
            <div className="border-t border-border pt-6">
              <h2 className="font-mono text-xs font-semibold">VIN 码 <span className="text-destructive">*</span></h2>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                输入 VIN 码可自动填写车辆信息（必填）
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  className="h-9 flex-1 font-mono text-xs uppercase"
                  placeholder="输入 17 位 VIN 码"
                  value={form.vin}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
                    update("vin", v);
                    if (vinAutoFilled) setVinAutoFilled(false);
                  }}
                  maxLength={17}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 font-mono text-[11px]"
                  disabled={vinDecoding || form.vin.length !== 17}
                  onClick={handleVinAutoFill}
                >
                  {vinDecoding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  自动填写
                </Button>
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {form.vin.length}/17 位
              </p>
              {vinAutoFilled && (
                <p className="mt-1 font-mono text-[11px] text-green-600 dark:text-green-400">
                  已根据 VIN 自动填写车辆信息，请核实并补充其余内容
                </p>
              )}
            </div>

            {/* Carfax link */}
            <div className="border-t border-border pt-6">
              <h2 className="font-mono text-xs font-semibold">Carfax 报告</h2>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                粘贴 Carfax 链接，系统将自动获取报告摘要
              </p>
              <div className="mt-3 flex gap-2">
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
                  获取报告
                </Button>
              </div>
              {carfaxSummary && (
                <div className="mt-2 flex items-center gap-2 border border-border bg-muted/30 px-3 py-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  <span className="flex-1 font-mono text-[11px]">
                    {formatCarfaxSummary(carfaxSummary)}
                  </span>
                  <a
                    href={normalizeCarfaxUrl(form.carfax_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    Carfax
                  </a>
                </div>
              )}
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
                      onValueChange={(v) => {
                        update("make", v);
                        if (v !== "Other") update("customMake", "");
                      }}
                      placeholder="选择品牌"
                      searchPlaceholder="搜索品牌..."
                      emptyText="未找到该品牌"
                    />
                  </div>
                  {form.make === "Other" && (
                    <Input
                      className="mt-2 h-9 font-mono text-xs"
                      placeholder="请输入品牌名称"
                      value={form.customMake || ""}
                      onChange={(e) => update("customMake", e.target.value)}
                      required
                    />
                  )}
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
                  <Input
                    type="number"
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="如 2020"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    min={1900}
                    max={2030}
                    required
                  />
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
              </div>
            </div>

            {/* Location */}
            <div className="border-t border-border pt-6">
              <h2 className="font-mono text-xs font-semibold">所在位置</h2>
              {isDealer && dealerStores.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
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
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-3">
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    Address
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="123 Main St (optional)"
                    value={form.address}
                    onChange={(e) => {
                      update("address", e.target.value);
                      setSelectedStoreId("");
                    }}
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    Address Line 2
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="Apt, Suite, Unit (optional)"
                    value={form.address2}
                    onChange={(e) => update("address2", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    City
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="City (optional)"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    State
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="CA (optional)"
                    maxLength={2}
                    value={form.state}
                    onChange={(e) => update("state", e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">
                    Zip Code *
                  </Label>
                  <Input
                    className="mt-1 h-9 font-mono text-xs"
                    placeholder="91007"
                    maxLength={5}
                    value={form.zipcode}
                    onChange={(e) => update("zipcode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    inputMode="numeric"
                    required
                  />
                  {(zipCityZh || zipCity) && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {zipCityZh ? `${zipCityZh} · ${zipCity}` : zipCity}
                    </p>
                  )}
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

      {/* Draft restore dialog */}
      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">发现未完成的草稿</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              是否继续编辑上次的草稿？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 font-mono text-xs"
              onClick={discardDraft}
            >
              重新开始
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 font-mono text-xs"
              onClick={restoreDraft}
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
              继续编辑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
