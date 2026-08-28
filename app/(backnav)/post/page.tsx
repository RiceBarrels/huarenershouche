"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Plus,
  Loader2,
  Store,
  FileText,
  ShieldCheck,
  Wand2,
  ExternalLink,
  ChevronLeft,
  Check,
  Play,
  CircleHelp,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { compressImage, isVideoFile, isImageFile, validateVideo } from "@/lib/image-compress";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { geocodeZipToCoords, lookupZip } from "@/lib/geocode";
import { decodeVin, isValidVinFormat, hasVinData } from "@/lib/vin";
import { isCarfaxUrl, normalizeCarfaxUrl, fetchCarfaxSummary, formatCarfaxSummary, type CarfaxSummary } from "@/lib/carfax";
import { Header } from "@/components/header";
import { useIdentity } from "@/components/identity-provider";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { EASE } from "@/lib/motion";
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

// 常见配置亮点(点选快速添加)
const FEATURE_SUGGESTIONS = [
  "倒车影像",
  "全景天窗",
  "CarPlay",
  "座椅加热",
  "无事故",
  "一手车主",
  "真皮座椅",
  "自适应巡航",
];

// ===== 多草稿存储:数组按 updatedAt 倒序,发布/删除时移除对应条目 =====
const DRAFTS_KEY = "huaren_post_drafts";
const LEGACY_DRAFT_KEY = "huaren_post_draft";
const MAX_DRAFTS = 10;

export interface PostDraft {
  id: string;
  updatedAt: number;
  form: Record<string, string>;
  imageUrls: string[];
  features: string[];
  videoUrl?: string | null;
}

function persistDrafts(drafts: PostDraft[]) {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* ignore */ }
}

function loadDrafts(): PostDraft[] {
  if (typeof window === "undefined") return [];
  let drafts: PostDraft[] = [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) drafts = arr.filter((d) => d && d.id && d.form);
  } catch { /* ignore */ }
  // 迁移旧版单草稿
  try {
    const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (legacy) {
      const d = JSON.parse(legacy);
      if (d?.form && (d.form.make || d.form.vin || d.imageUrls?.length)) {
        drafts.unshift({
          id: `d-${Date.now()}`,
          updatedAt: Date.now(),
          form: d.form,
          imageUrls: d.imageUrls || [],
          features: d.features || [],
        });
        persistDrafts(drafts);
      }
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    }
  } catch { /* ignore */ }
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

// 草稿是否有值得保留的内容(空表单不落盘,避免覆盖/堆积垃圾草稿)
function draftHasContent(form: Record<string, string>, imageUrls: string[], features: string[]) {
  return Boolean(
    form.vin || form.make || form.model || form.price || form.mileage ||
    form.description_zh || imageUrls.length > 0 || features.length > 0
  );
}

function draftTitle(d: PostDraft) {
  const f = d.form || {};
  const make = f.make === "Other" ? f.customMake : f.make;
  const name = [f.year, make ? `${MAKES_ZH[make] || ""}${make}` : "", f.model]
    .filter(Boolean)
    .join(" ");
  if (name) return name;
  if (f.vin) return `VIN …${f.vin.slice(-6)}`;
  return "未命名草稿";
}

function draftTime(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

// ===== 逐题问答式步骤定义 =====
type StepId =
  | "photos"
  | "vin"
  | "carinfo"
  | "condition"
  | "price"
  | "mileage"
  | "details"
  | "colors"
  | "location"
  | "contact"
  | "carfax"
  | "features"
  | "description";

const STEPS: { id: StepId; title: string; sub?: string; optional?: boolean }[] = [
  { id: "photos", title: "先来几张车辆照片", sub: "第一张将作为封面图,建议 5-10 张" },
  { id: "vin", title: "输入 VIN 码", sub: "按「继续」自动识别并填写车辆信息" },
  { id: "carinfo", title: "这是什么车?", sub: "核对或补充车辆信息" },
  { id: "condition", title: "新车还是二手?" },
  { id: "price", title: "这辆车卖多少钱?" },
  { id: "mileage", title: "跑了多少英里?" },
  { id: "details", title: "车辆参数", sub: "VIN 识别的会自动填好,可跳过", optional: true },
  { id: "colors", title: "什么颜色?", sub: "可跳过", optional: true },
  { id: "location", title: "车在哪里?", sub: "填写邮编即可,详细地址选填" },
  { id: "contact", title: "怎么联系你?", sub: "买家将通过这些方式找到你" },
  { id: "carfax", title: "有 Carfax 报告吗?", sub: "粘贴链接自动获取摘要,可跳过", optional: true },
  { id: "features", title: "有哪些配置亮点?", sub: "可跳过", optional: true },
  { id: "description", title: "再介绍几句", sub: "车况、保养历史、卖车原因等,选填" },
];

export default function PostCarPage() {
  const router = useRouter();
  const { actingId, authId, isActingAsClaimed } = useIdentity();
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  // 草稿箱:多份草稿 + 当前正在编辑的草稿 id(未编辑过内容前为 null)
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [vinHelpOpen, setVinHelpOpen] = useState(false);

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
  const [showAddress, setShowAddress] = useState(false);

  // 向导状态:当前步 + 动画方向(1 前进 / -1 后退)
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const kbHeight = useKeyboardHeight();

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

  // 挂载时读入草稿箱(localStorage 仅客户端可读,一次性回填,不构成级联渲染)
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setDrafts(loadDrafts()), []);

  function restoreDraft(d: PostDraft) {
    const merged = { ...defaultForm, ...d.form };
    setForm(merged);
    setImageUrls(d.imageUrls || []);
    setFeatures(d.features || []);
    setVideoUrl(d.videoUrl || null);
    setDraftId(d.id);
    setVinAutoFilled(false);
    // 跳到第一个未完成的必填步,接着上次的进度答
    setStep(firstIncompleteStep(merged, d.imageUrls || []));
    setDir(1);
  }

  function deleteDraft(id: string) {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      persistDrafts(next);
      return next;
    });
    if (draftId === id) setDraftId(null);
  }

  // 自动保存(防抖):只在有实际内容时写入,且只写当前草稿条目——
  // 空表单不会再覆盖旧草稿(修复"继续编辑没反应":以前挂载 500ms 后
  // 空表单就把唯一草稿冲掉了)
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string | null>(null);
  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  useEffect(() => {
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    if (!draftHasContent(form, imageUrls, features)) return;
    draftTimeoutRef.current = setTimeout(() => {
      let id = draftIdRef.current;
      if (!id) {
        id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setDraftId(id);
      }
      const entry: PostDraft = {
        id,
        updatedAt: Date.now(),
        form,
        imageUrls,
        features,
        videoUrl,
      };
      setDrafts((prev) => {
        const next = [entry, ...prev.filter((d) => d.id !== id)].slice(0, MAX_DRAFTS);
        persistDrafts(next);
        return next;
      });
    }, 500);
  }, [form, imageUrls, features, videoUrl]);

  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, []);

  // 发布归属「当前操作身份」(actingId):切换成车行时,新车挂到车行名下。
  /* eslint-disable react-hooks/set-state-in-effect -- 同步记录当前身份,后续均为异步回填 */
  useEffect(() => {
    if (!actingId) return;
    setUser(actingId);
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, phone, account_type, role")
        .eq("id", actingId)
        .maybeSingle();
      if (!profile) {
        // 车行账号必然已存在;仅本人新账号需兜底创建
        if (isActingAsClaimed) return;
        const { data: authData } = await supabase.auth.getUser();
        const u = authData.user;
        await supabase.from("profiles").insert({
          id: actingId,
          username: u?.user_metadata?.username || u?.email || "",
        });
        setForm((f) => ({
          ...f,
          seller_name: u?.user_metadata?.username || u?.email || "",
        }));
      } else {
        const dealer = profile.account_type === "dealer";
        setIsDealer(dealer);
        setIsAdmin(profile.role === "admin");
        setForm((f) => ({
          ...f,
          seller_name: f.seller_name || profile.username || "",
          phone: f.phone || profile.phone || "",
        }));

        // Fetch dealer stores if dealer
        if (dealer) {
          const { data: stores } = await supabase
            .from("dealer_stores")
            .select("*")
            .eq("owner_id", actingId)
            .order("created_at", { ascending: false });
          setDealerStores((stores as DbDealerStore[]) || []);
        } else {
          setDealerStores([]);
        }
      }
    })();
  }, [actingId, isActingAsClaimed]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-resolve zipcode to city name (English + Chinese)
  const [zipCity, setZipCity] = useState("");
  const [zipCityZh, setZipCityZh] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- 邮编不足 5 位时同步清空提示,开销极小 */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    await uploadFiles(Array.from(files));
    e.target.value = "";
  }

  async function uploadFiles(files: File[]) {
    if (!user || files.length === 0) return;

    const images = files.filter(isImageFile);
    const videos = files.filter(isVideoFile);

    if (images.length > 0) {
      setUploading(true);
      for (const file of images) {
        const compressed = await compressImage(file);
        const ext = compressed.name.split(".").pop() || "webp";
        // 存储桶 RLS 按 auth.uid() 文件夹校验,故媒体一律传到本人文件夹(车归属仍是 actingId)
        const path = `${authId || user}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("car-images")
          .upload(path, compressed);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("car-images").getPublicUrl(path);
          setImageUrls((prev) => [...prev, publicUrl]);
        }
      }
      setUploading(false);
    }

    if (videos.length > 0 && !videoUrl) {
      const video = videos[0];
      const validation = await validateVideo(video);
      if (!validation.valid) {
        setError(validation.error || "视频格式不支持");
        return;
      }
      setVideoUploading(true);
      const ext = video.name.split(".").pop() || "mp4";
      const path = `${authId || user}/${Date.now()}-video.${ext}`;
      const { error } = await supabase.storage
        .from("car-images")
        .upload(path, video);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("car-images").getPublicUrl(path);
        setVideoUrl(publicUrl);
      }
      setVideoUploading(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    // 1. Dropped files (local)
    const files = Array.from(e.dataTransfer.files).filter((f) => isImageFile(f) || isVideoFile(f));
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

  function toggleFeature(f: string) {
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  async function handleVinAutoFill(): Promise<boolean> {
    const cleaned = form.vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (!isValidVinFormat(cleaned)) {
      setError("请输入有效的 17 位 VIN 码");
      return false;
    }
    setVinDecoding(true);
    setError("");
    const result = await decodeVin(cleaned);
    setVinDecoding(false);

    if (!result || !hasVinData(result)) {
      setError("无法识别此 VIN,请核对是否输入正确");
      return false;
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
    return true;
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

  async function handleSubmit() {
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

    // Also save phone to profile（车行身份下经 RPC 更新,普通身份直接更新）
    if (form.phone) {
      if (isActingAsClaimed) {
        await supabase.rpc("update_claimed_profile", { target: user, new_phone: form.phone });
      } else {
        await supabase
          .from("profiles")
          .update({ phone: form.phone })
          .eq("id", user);
      }
    }

    // AI 双语翻译:经服务端 /api/translate 补全中英 title / description,
    // 标签做成双语(任何失败都保持原样,发布流程不受影响)
    const loc = {
      title: titleEn as string | null,
      title_zh: titleZh as string | null,
      description: null as string | null,
      description_zh: (form.description_zh || null) as string | null,
      features: features as string[],
    };
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ title: titleEn, title_zh: titleZh, description_zh: form.description_zh || null, features }),
        });
        if (res.ok) {
          const j = await res.json();
          if (j?.localized) Object.assign(loc, j.localized);
        }
      }
    } catch {
      /* 翻译失败,保持原文 */
    }

    const { data, error: insertError } = await supabase
      .from("cars")
      .insert({
        seller_id: user,
        title: loc.title || titleEn,
        title_zh: loc.title_zh || titleZh,
        year: Number(form.year),
        make: actualMake,
        model: form.model,
        trim: form.trim || null,
        price: Number(form.price),
        mileage: Number(form.mileage),
        location: locationEn,
        location_zh: locationZh,
        image_url: imageUrls[0] || null,
        // 视频追加在 images 末尾，详情页按扩展名识别视频
        images: [...imageUrls.slice(1), ...(videoUrl ? [videoUrl] : [])],
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        drivetrain: form.drivetrain || null,
        exterior_color: form.exterior_color || null,
        interior_color: form.interior_color || null,
        vin: form.vin,
        seller_name: form.seller_name,
        phone: form.phone || null,
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        description: loc.description,
        description_zh: loc.description_zh ?? (form.description_zh || null),
        carfax_url: form.carfax_url ? normalizeCarfaxUrl(form.carfax_url) : null,
        carfax_summary: carfaxSummary ? formatCarfaxSummary(carfaxSummary) : null,
        features: loc.features.length ? loc.features : features,
        status: "active",
      })
      .select("id")
      .single();

    setLoading(false);
    if (insertError) {
      setError(`发布失败: ${insertError.message}`);
    } else if (data) {
      if (draftId) deleteDraft(draftId);
      router.push(`/car/${data.id}`);
    }
  }

  // ===== 向导:每步的完成校验 =====
  function stepComplete(id: StepId, f = form, imgs = imageUrls): boolean {
    switch (id) {
      case "photos":
        return imgs.length > 0;
      case "vin":
        return isValidVinFormat(f.vin);
      case "carinfo":
        return Boolean(
          f.make &&
          (f.make !== "Other" || f.customMake.trim()) &&
          f.model.trim() &&
          f.year.length === 4
        );
      case "condition":
        return Boolean(f.condition);
      case "price":
        return priceCallOnly || Number(f.price) > 0;
      case "mileage":
        return f.mileage !== "" && Number(f.mileage) >= 0;
      case "location":
        return f.zipcode.length === 5;
      case "contact": {
        const digits = f.phone.replace(/\D/g, "");
        return Boolean(f.seller_name.trim()) && digits.length >= 10;
      }
      // 可选步始终可继续
      default:
        return true;
    }
  }

  function firstIncompleteStep(f: typeof defaultForm, imgs: string[]): number {
    for (let i = 0; i < STEPS.length; i++) {
      if (!STEPS[i].optional && !stepComplete(STEPS[i].id, f, imgs)) return i;
    }
    return STEPS.length - 1;
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canProceed = stepComplete(current.id);

  async function goNext() {
    if (isLast) {
      handleSubmit();
      return;
    }
    // VIN 步:按「继续」自动识别并填充;识别不出来不能进入下一步
    if (current.id === "vin" && !vinAutoFilled) {
      const ok = await handleVinAutoFill();
      if (!ok) return;
    }
    setError("");
    setDir(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goPrev() {
    if (step === 0) return;
    setError("");
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  // 主按钮文案:最后一步是发布;可选步没填内容显示「跳过」
  const optionalEmpty =
    (current.id === "details" && !form.transmission && !form.drivetrain && !form.body_type && !form.cylinders && !form.seats) ||
    (current.id === "colors" && !form.exterior_color && !form.interior_color) ||
    (current.id === "carfax" && !form.carfax_url.trim()) ||
    (current.id === "features" && features.length === 0);
  const mainLabel = isLast
    ? loading ? "发布中..." : "发布车辆"
    : current.id === "vin" && vinDecoding ? "识别中..."
    : current.optional && optionalEmpty ? "跳过" : "继续";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {!user ? (
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-6">
          <div className="mt-8 flex flex-col items-center rounded-2xl bg-card p-8">
            <p className="text-sm text-muted-foreground">请先登录后再发布车辆</p>
            <Link href="/login">
              <Button size="sm" className="mt-4 text-xs">
                登录 / 注册
              </Button>
            </Link>
          </div>
        </main>
      ) : (
        <>
          {/* 进度(手机):细进度条 + 计数;桌面由左侧步骤导航展示进度 */}
          <div className="mx-auto w-full max-w-2xl px-5 pt-3 md:hidden">
            <div className="flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {step + 1}/{STEPS.length}
              </span>
            </div>
          </div>

          {/* 桌面:左侧步骤导航 + 右侧内容两栏;手机保持单列 */}
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-start gap-12 md:px-8 md:pt-12">
            {/* 步骤导航:已完成/当前/未到;必填步全部完成前不可跳到其后 */}
            <aside className="sticky top-24 hidden w-52 shrink-0 md:block">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                发布进度 {step + 1}/{STEPS.length}
              </p>
              <ol className="mt-4 space-y-0.5">
                {STEPS.map((s, i) => {
                  const reachable = i <= firstIncompleteStep(form, imageUrls);
                  const done = i < step && stepComplete(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={!reachable}
                        onClick={() => {
                          if (i === step) return;
                          setError("");
                          setDir(i > step ? 1 : -1);
                          setStep(i);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors ${
                          i === step
                            ? "bg-primary/30 font-medium text-brand-ink"
                            : reachable
                              ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              : "cursor-not-allowed text-muted-foreground/40"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] tabular-nums ${
                            done
                              ? "bg-primary/30 text-brand-ink"
                              : i === step
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground/70"
                          }`}
                        >
                          {done ? <Check className="h-3 w-3" strokeWidth={2} /> : i + 1}
                        </span>
                        <span className="truncate">{s.title}</span>
                        {s.optional && (
                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/50">选填</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </aside>

            <div className="min-w-0 flex-1 md:pb-20">
          <main className="mx-auto w-full max-w-2xl flex-1 overflow-x-hidden px-5 pb-44 pt-6 md:px-0 md:pb-8 md:pt-0">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={current.id}
                custom={dir}
                initial="enter"
                animate="center"
                exit="exit"
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 36 }),
                  center: { opacity: 1, x: 0, transition: { duration: 0.28, ease: EASE } },
                  exit: (d: number) => ({ opacity: 0, x: d * -36, transition: { duration: 0.2, ease: EASE } }),
                }}
              >
                {/* 大字提问 */}
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{current.title}</h1>
                {current.sub && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{current.sub}</p>
                )}

                <div className="mt-6">
                  {/* ==== 照片 ==== */}
                  {current.id === "photos" && (
                    <div>
                      {/* 草稿箱:有历史草稿时,第一页可直接选一份继续(也可删除) */}
                      {drafts.filter((d) => d.id !== draftId).length > 0 && (
                        <div className="mb-5 rounded-2xl bg-card p-4">
                          <p className="text-sm font-medium text-foreground">继续上次的草稿</p>
                          <div className="mt-3 space-y-2">
                            {drafts.filter((d) => d.id !== draftId).map((d) => (
                              <div key={d.id} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => restoreDraft(d)}
                                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted px-3.5 py-3 text-left transition-colors active:bg-muted/70"
                                >
                                  {d.imageUrls?.[0] ? (
                                    <img
                                      src={d.imageUrls[0]}
                                      alt=""
                                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                                      <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                    </span>
                                  )}
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-foreground">
                                      {draftTitle(d)}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                      {d.imageUrls?.length ? `${d.imageUrls.length} 张照片 · ` : ""}
                                      {draftTime(d.updatedAt)}
                                    </span>
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  aria-label="删除草稿"
                                  onClick={() => deleteDraft(d.id)}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted"
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex flex-wrap gap-3 rounded-xl transition-colors ${
                          dragging ? "bg-muted/80 ring-2 ring-brand-ink/40" : ""
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                      >
                        {imageUrls.map((url, i) => (
                          <div
                            key={i}
                            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted md:h-32 md:w-32"
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {i === 0 && (
                              <span className="absolute bottom-1 left-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                                封面
                              </span>
                            )}
                          </div>
                        ))}
                        <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-muted/50 active:bg-muted md:h-32 md:w-32 md:hover:bg-muted">
                          {uploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
                          ) : (
                            <Plus className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                          )}
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/quicktime,video/webm"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </label>
                      </div>

                      {/* Video preview */}
                      {videoUrl && (
                        <div className="relative mt-3 h-24 w-24 overflow-hidden rounded-xl bg-muted">
                          <video src={videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          <span className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50">
                            <Play className="h-2.5 w-2.5 fill-white text-white" />
                          </span>
                          <button
                            type="button"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                            onClick={() => setVideoUrl(null)}
                          >
                            <X className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                      {videoUploading && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />上传视频中...
                        </div>
                      )}
                      {!videoUrl && !videoUploading && (
                        <p className="mt-3 text-xs text-muted-foreground/70">
                          也可上传 1 个短视频（≤30秒，≤50MB）
                        </p>
                      )}

                      {/* Admin: fake listing generator */}
                      {isAdmin && (
                        <div className="mt-6 rounded-xl bg-yellow-500/10 p-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />
                            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">管理员工具</span>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Label className="text-[11px] text-muted-foreground">数量</Label>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={fakeCount}
                                onChange={(e) => setFakeCount(Number(e.target.value))}
                                className="h-8 w-20 text-xs"
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="gap-1.5 text-xs"
                              disabled={fakeGenerating}
                              onClick={() => setFakeDialogOpen(true)}
                            >
                              {fakeGenerating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                              ) : (
                                <Wand2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                              )}
                              批量生成假车源
                            </Button>
                          </div>
                          {fakeResult && (
                            <p className={`mt-2 text-[11px] ${fakeResult.startsWith("失败") ? "text-destructive" : "text-green-600"}`}>
                              {fakeResult}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==== VIN ==== */}
                  {current.id === "vin" && (
                    <div>
                      <input
                        autoFocus
                        className="w-full bg-transparent font-mono text-2xl uppercase tracking-widest text-foreground placeholder:text-muted-foreground/40 placeholder:tracking-normal focus:outline-none"
                        placeholder="17 位 VIN 码"
                        value={form.vin}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
                          update("vin", v);
                          if (vinAutoFilled) setVinAutoFilled(false);
                        }}
                        maxLength={17}
                      />
                      <div className="mt-2 h-px w-full bg-border" />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {form.vin.length}/17 位
                        </p>
                        <button
                          type="button"
                          onClick={() => setVinHelpOpen(true)}
                          className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
                        >
                          <CircleHelp className="h-3.5 w-3.5" strokeWidth={1.5} />
                          在哪里查看 VIN?
                        </button>
                      </div>
                      {vinAutoFilled && (
                        <p className="mt-3 flex items-center gap-1.5 text-sm text-brand-ink">
                          <Check className="h-4 w-4" strokeWidth={2} />
                          已自动填写车辆信息,后面几步核对一下就行
                        </p>
                      )}
                    </div>
                  )}

                  {/* ==== 车辆信息 ==== */}
                  {current.id === "carinfo" && (
                    <div className="space-y-3">
                      <Combobox
                        options={makeOptions}
                        value={form.make}
                        onValueChange={(v) => {
                          update("make", v);
                          if (v !== "Other") update("customMake", "");
                        }}
                        placeholder="品牌 *"
                        searchPlaceholder="搜索品牌..."
                        emptyText="未找到该品牌"
                      />
                      {form.make === "Other" && (
                        <input
                          className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                          placeholder="请输入品牌名称 *"
                          value={form.customMake || ""}
                          onChange={(e) => update("customMake", e.target.value)}
                        />
                      )}
                      <input
                        className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                        placeholder="车型 * 如 Camry, CR-V"
                        value={form.model}
                        onChange={(e) => update("model", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Combobox
                          options={yearOptions}
                          value={form.year}
                          onValueChange={(v) => update("year", v)}
                          placeholder="年份 *"
                          searchPlaceholder="搜索年份..."
                          emptyText="未找到"
                        />
                        <input
                          className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                          placeholder="配置等级 如 SE"
                          value={form.trim}
                          onChange={(e) => update("trim", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* ==== 车况 ==== */}
                  {current.id === "condition" && (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "used", label: "二手", sub: "Used" },
                        { value: "new", label: "新车", sub: "New" },
                      ].map((c) => {
                        const active = form.condition === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                              update("condition", c.value);
                              // 点选即前进,少按一次「继续」
                              setTimeout(() => {
                                setDir(1);
                                setStep((s) => Math.min(s + 1, STEPS.length - 1));
                              }, 180);
                            }}
                            className={`flex flex-col items-center gap-1 rounded-2xl py-8 transition-colors ${
                              active
                                ? "bg-primary/30"
                                : "bg-card active:bg-muted"
                            }`}
                          >
                            <span className={`text-xl font-semibold ${active ? "text-brand-ink" : "text-foreground"}`}>
                              {c.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{c.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ==== 价格 ==== */}
                  {current.id === "price" && (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-semibold ${priceCallOnly ? "text-muted-foreground/40" : "text-foreground"}`}>$</span>
                        <input
                          autoFocus
                          type="number"
                          inputMode="numeric"
                          className="w-full bg-transparent text-3xl font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:text-muted-foreground/40"
                          placeholder="25000"
                          value={form.price}
                          onChange={(e) => update("price", e.target.value)}
                          disabled={priceCallOnly}
                        />
                      </div>
                      <div className="mt-2 h-px w-full bg-border" />
                      <label className="mt-4 flex cursor-pointer items-center gap-2">
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
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm text-muted-foreground">电议(不显示价格)</span>
                      </label>
                      {showCallWarning && !priceCallOnly && (
                        <div className="mt-3 rounded-xl bg-yellow-500/10 p-3">
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            注意：选择电议可能会影响曝光率
                          </p>
                          <div className="mt-2 flex gap-4">
                            <button
                              type="button"
                              onClick={() => { setPriceCallOnly(true); setShowCallWarning(false); update("price", "0"); }}
                              className="text-sm font-medium text-foreground underline underline-offset-2"
                            >
                              确认电议
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCallWarning(false)}
                              className="text-sm text-muted-foreground"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==== 里程 ==== */}
                  {current.id === "mileage" && (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <input
                          autoFocus
                          type="number"
                          inputMode="numeric"
                          className="w-full bg-transparent text-3xl font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                          placeholder="32000"
                          value={form.mileage}
                          onChange={(e) => update("mileage", e.target.value)}
                        />
                        <span className="shrink-0 text-lg text-muted-foreground">英里</span>
                      </div>
                      <div className="mt-2 h-px w-full bg-border" />
                    </div>
                  )}

                  {/* ==== 车辆参数 ==== */}
                  {current.id === "details" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Combobox
                        options={fuelOptions}
                        value={form.fuel_type}
                        onValueChange={(v) => update("fuel_type", v)}
                        placeholder="燃油类型"
                        searchPlaceholder="搜索..."
                        emptyText="未找到"
                      />
                      <Combobox
                        options={transmissionOptions}
                        value={form.transmission}
                        onValueChange={(v) => update("transmission", v)}
                        placeholder="变速箱"
                        searchPlaceholder="搜索..."
                        emptyText="未找到"
                      />
                      <Combobox
                        options={drivetrainOptions}
                        value={form.drivetrain}
                        onValueChange={(v) => update("drivetrain", v)}
                        placeholder="驱动方式"
                        searchPlaceholder="搜索..."
                        emptyText="未找到"
                      />
                      <Combobox
                        options={bodyTypeOptions}
                        value={form.body_type}
                        onValueChange={(v) => update("body_type", v)}
                        placeholder="车辆类型"
                        searchPlaceholder="搜索..."
                        emptyText="未找到"
                      />
                      <Combobox
                        options={cylinderOptions}
                        value={form.cylinders}
                        onValueChange={(v) => update("cylinders", v)}
                        placeholder="气缸数"
                        searchPlaceholder="搜索..."
                        emptyText="未找到"
                      />
                      <Combobox
                        options={seatOptions}
                        value={form.seats}
                        onValueChange={(v) => update("seats", v)}
                        placeholder="座位数"
                        searchPlaceholder="搜索..."
                        emptyText="未找到"
                      />
                    </div>
                  )}

                  {/* ==== 颜色 ==== */}
                  {current.id === "colors" && (
                    <div className="space-y-3">
                      <Combobox
                        options={exteriorColorOptions}
                        value={form.exterior_color}
                        onValueChange={(v) => update("exterior_color", v)}
                        placeholder="外观颜色"
                        searchPlaceholder="搜索颜色..."
                        emptyText="未找到该颜色"
                      />
                      <Combobox
                        options={interiorColorOptions}
                        value={form.interior_color}
                        onValueChange={(v) => update("interior_color", v)}
                        placeholder="内饰颜色"
                        searchPlaceholder="搜索颜色..."
                        emptyText="未找到该颜色"
                      />
                    </div>
                  )}

                  {/* ==== 位置 ==== */}
                  {current.id === "location" && (
                    <div>
                      {isDealer && dealerStores.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
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
                              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors ${
                                selectedStoreId === store.id
                                  ? "bg-primary/30 font-medium text-brand-ink"
                                  : "bg-muted text-muted-foreground active:bg-muted/70"
                              }`}
                            >
                              <Store className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {store.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <input
                        autoFocus
                        inputMode="numeric"
                        maxLength={5}
                        className="w-full bg-transparent text-3xl font-semibold tracking-widest text-foreground placeholder:text-muted-foreground/40 placeholder:tracking-normal focus:outline-none"
                        placeholder="邮编 Zip Code"
                        value={form.zipcode}
                        onChange={(e) => update("zipcode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                      />
                      <div className="mt-2 h-px w-full bg-border" />
                      {(zipCityZh || zipCity) && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-ink">
                          <Check className="h-4 w-4" strokeWidth={2} />
                          {zipCityZh ? `${zipCityZh} · ${zipCity}` : zipCity}
                        </p>
                      )}

                      {!showAddress ? (
                        <button
                          type="button"
                          onClick={() => setShowAddress(true)}
                          className="mt-4 text-sm text-muted-foreground underline underline-offset-2"
                        >
                          + 添加详细地址(选填)
                        </button>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <input
                            className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                            placeholder="街道地址 123 Main St"
                            value={form.address}
                            onChange={(e) => {
                              update("address", e.target.value);
                              setSelectedStoreId("");
                            }}
                          />
                          <input
                            className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                            placeholder="Apt, Suite, Unit(选填)"
                            value={form.address2}
                            onChange={(e) => update("address2", e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                              placeholder="City"
                              value={form.city}
                              onChange={(e) => update("city", e.target.value)}
                            />
                            <input
                              className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] uppercase text-foreground transition-colors placeholder:normal-case placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                              placeholder="State 如 CA"
                              maxLength={2}
                              value={form.state}
                              onChange={(e) => update("state", e.target.value.toUpperCase())}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==== 联系方式 ==== */}
                  {current.id === "contact" && (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                        placeholder="你的名字或车行名 *"
                        value={form.seller_name}
                        onChange={(e) => update("seller_name", e.target.value)}
                      />
                      <input
                        type="tel"
                        className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                        placeholder="联系电话 (626) 555-0123 *"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </div>
                  )}

                  {/* ==== Carfax ==== */}
                  {current.id === "carfax" && (
                    <div>
                      <input
                        className="w-full rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                        placeholder="https://www.carfax.com/vehicle/..."
                        value={form.carfax_url}
                        onChange={(e) => {
                          update("carfax_url", e.target.value);
                          setCarfaxSummary(null);
                        }}
                      />
                      <button
                        type="button"
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
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted py-3 text-sm font-medium text-foreground transition-colors active:bg-muted/70 disabled:opacity-40"
                      >
                        {carfaxLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <FileText className="h-4 w-4" strokeWidth={1.5} />
                        )}
                        获取报告摘要
                      </button>
                      {carfaxSummary && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-3">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                          <span className="flex-1 text-sm">
                            {formatCarfaxSummary(carfaxSummary)}
                          </span>
                          <a
                            href={normalizeCarfaxUrl(form.carfax_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                            Carfax
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==== 配置亮点 ==== */}
                  {current.id === "features" && (
                    <div>
                      <div className="flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-xl bg-muted px-4 py-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                          placeholder="如：倒车影像、全景天窗"
                          value={featureInput}
                          onChange={(e) => setFeatureInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addFeature();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addFeature}
                          className="flex shrink-0 items-center gap-1 rounded-xl bg-muted px-4 text-sm text-foreground active:bg-muted/70"
                        >
                          <Plus className="h-4 w-4" strokeWidth={1.5} />
                          添加
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[...features.filter((f) => !FEATURE_SUGGESTIONS.includes(f)), ...FEATURE_SUGGESTIONS].map((f) => {
                          const selected = features.includes(f);
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() => toggleFeature(f)}
                              className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                                selected
                                  ? "bg-primary/30 font-medium text-brand-ink"
                                  : "bg-muted text-muted-foreground active:bg-muted/70"
                              }`}
                            >
                              {selected ? (
                                <X className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
                              ) : (
                                <Plus className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
                              )}
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ==== 描述 + 发布 ==== */}
                  {current.id === "description" && (
                    <textarea
                      autoFocus
                      className="min-h-[30vh] w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      placeholder="描述车辆状况、保养历史、卖车原因等..."
                      value={form.description_zh}
                      onChange={(e) => update("description_zh", e.target.value)}
                    />
                  )}
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="mt-4 rounded-xl bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* 底部操作栏:上一步 + 继续/跳过/发布;手机固定底部随键盘顶起,桌面内联在内容下方 */}
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-sm transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none"
            style={{
              paddingBottom: kbHeight > 0 ? "0.75rem" : "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
              transform: kbHeight > 0 ? `translateY(-${kbHeight}px)` : "translateY(0)",
            }}
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="上一步"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors active:bg-muted md:hover:bg-muted"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed || loading || vinDecoding}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-base font-medium text-primary-foreground transition-opacity active:opacity-90 disabled:opacity-40 md:flex-none md:min-w-48 md:px-10 md:text-sm md:hover:opacity-90"
              >
                {(loading || vinDecoding) && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
                {mainLabel}
              </button>
            </div>
          </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm dialog for fake generation */}
      <Dialog open={fakeDialogOpen} onOpenChange={setFakeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">确认生成假车源</DialogTitle>
            <DialogDescription className="text-xs">
              将以当前账号生成 {fakeCount} 条假车源，数据随机生成（品牌、价格、里程、地区等）。确认继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" className="text-xs" onClick={() => setFakeDialogOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              className="text-xs"
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

      {/* VIN 位置教程 drawer */}
      <Drawer open={vinHelpOpen} onOpenChange={setVinHelpOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>在哪里查看 VIN 码?</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
            {[
              {
                title: "挡风玻璃左下角",
                desc: "驾驶位一侧仪表台与前挡风玻璃的交界处,从车外透过玻璃看最清楚",
              },
              {
                title: "驾驶员侧门框",
                desc: "打开驾驶室车门,B 柱(门框)上的贴纸,通常和胎压标签在一起",
              },
              {
                title: "行驶证 / 保险卡 / Title",
                desc: "Registration、保险卡和车辆产权证(Title)上都印有 VIN",
              },
              {
                title: "引擎舱铭牌",
                desc: "部分车型在发动机舱防火墙或散热器支架上也有 VIN 铭牌",
              },
            ].map((item, i) => (
              <div key={item.title} className="flex gap-3 rounded-2xl bg-muted px-4 py-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/30 text-xs font-semibold text-brand-ink">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
            <p className="px-1 pt-1 text-xs leading-relaxed text-muted-foreground/70">
              VIN 共 17 位,由数字和大写字母组成,不含字母 I、O、Q。
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
