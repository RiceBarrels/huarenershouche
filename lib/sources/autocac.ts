// 友车哒 / CAC Auto Group (autocac.com) —— 自研 JSON API 数据源。
// 站点是静态 HTML + Vue,车源经 POST /api/v1/cac/doService 获取(service 名区分接口)。
// 前端默认把 data 用 3DES 加密,但接口接受 test:true 的明文请求,故直接发明文 JSON。
// 列表(queryCarListService)一次返回全部车辆(含已售),只取 carSellType=inventory;
// 详情(queryOfficialCarInfoByIdService)补全图集/颜色/配置。
// 注意:autocac.com 证书链不完整(缺 ZeroSSL 中间证书),Node fetch 会报
// UNABLE_TO_VERIFY_LEAF_SIGNATURE,故用 node:https 并补上中间证书。
// 多门店:按车辆 ownStore 映射门店地址(同步引擎有门店记录时会以门店地址覆盖)。

import https from "node:https";
import tls from "node:tls";
import type { CrawlResult, ParsedListing, SourceAdapter, SourceListingRef } from "./types";
import { MAKES_ZH } from "@/lib/mock-data";
import { mapColor } from "./dealercenter-wp";

const API_URL = "https://autocac.com/api/v1/cac/doService";
const SITE = "https://autocac.com";
const MAX_FEATURES = 40;

// ZeroSSL RSA Domain Secure Site CA(autocac.com 未下发的中间证书,2030-01-29 到期)
const ZEROSSL_INTERMEDIATE = `-----BEGIN CERTIFICATE-----
MIIG1TCCBL2gAwIBAgIQbFWr29AHksedBwzYEZ7WvzANBgkqhkiG9w0BAQwFADCB
iDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0pl
cnNleSBDaXR5MR4wHAYDVQQKExVUaGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNV
BAMTJVVTRVJUcnVzdCBSU0EgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkwHhcNMjAw
MTMwMDAwMDAwWhcNMzAwMTI5MjM1OTU5WjBLMQswCQYDVQQGEwJBVDEQMA4GA1UE
ChMHWmVyb1NTTDEqMCgGA1UEAxMhWmVyb1NTTCBSU0EgRG9tYWluIFNlY3VyZSBT
aXRlIENBMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAhmlzfqO1Mdgj
4W3dpBPTVBX1AuvcAyG1fl0dUnw/MeueCWzRWTheZ35LVo91kLI3DDVaZKW+TBAs
JBjEbYmMwcWSTWYCg5334SF0+ctDAsFxsX+rTDh9kSrG/4mp6OShubLaEIUJiZo4
t873TuSd0Wj5DWt3DtpAG8T35l/v+xrN8ub8PSSoX5Vkgw+jWf4KQtNvUFLDq8mF
WhUnPL6jHAADXpvs4lTNYwOtx9yQtbpxwSt7QJY1+ICrmRJB6BuKRt/jfDJF9Jsc
RQVlHIxQdKAJl7oaVnXgDkqtk2qddd3kCDXd74gv813G91z7CjsGyJ93oJIlNS3U
gFbD6V54JMgZ3rSmotYbz98oZxX7MKbtCm1aJ/q+hTv2YK1yMxrnfcieKmOYBbFD
hnW5O6RMA703dBK92j6XRN2EttLkQuujZgy+jXRKtaWMIlkNkWJmOiHmErQngHvt
iNkIcjJumq1ddFX4iaTI40a6zgvIBtxFeDs2RfcaH73er7ctNUUqgQT5rFgJhMmF
x76rQgB5OZUkodb5k2ex7P+Gu4J86bS15094UuYcV09hVeknmTh5Ex9CBKipLS2W
2wKBakf+aVYnNCU6S0nASqt2xrZpGC1v7v6DhuepyyJtn3qSV2PoBiU5Sql+aARp
wUibQMGm44gjyNDqDlVp+ShLQlUH9x8CAwEAAaOCAXUwggFxMB8GA1UdIwQYMBaA
FFN5v1qqK0rPVIDh2JvAnfKyA2bLMB0GA1UdDgQWBBTI2XhootkZaNU9ct5fCj7c
tYaGpjAOBgNVHQ8BAf8EBAMCAYYwEgYDVR0TAQH/BAgwBgEB/wIBADAdBgNVHSUE
FjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwIgYDVR0gBBswGTANBgsrBgEEAbIxAQIC
TjAIBgZngQwBAgEwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cDovL2NybC51c2VydHJ1
c3QuY29tL1VTRVJUcnVzdFJTQUNlcnRpZmljYXRpb25BdXRob3JpdHkuY3JsMHYG
CCsGAQUFBwEBBGowaDA/BggrBgEFBQcwAoYzaHR0cDovL2NydC51c2VydHJ1c3Qu
Y29tL1VTRVJUcnVzdFJTQUFkZFRydXN0Q0EuY3J0MCUGCCsGAQUFBzABhhlodHRw
Oi8vb2NzcC51c2VydHJ1c3QuY29tMA0GCSqGSIb3DQEBDAUAA4ICAQAVDwoIzQDV
ercT0eYqZjBNJ8VNWwVFlQOtZERqn5iWnEVaLZZdzxlbvz2Fx0ExUNuUEgYkIVM4
YocKkCQ7hO5noicoq/DrEYH5IuNcuW1I8JJZ9DLuB1fYvIHlZ2JG46iNbVKA3ygA
Ez86RvDQlt2C494qqPVItRjrz9YlJEGT0DrttyApq0YLFDzf+Z1pkMhh7c+7fXeJ
qmIhfJpduKc8HEQkYQQShen426S3H0JrIAbKcBCiyYFuOhfyvuwVCFDfFvrjADjd
4jX1uQXd161IyFRbm89s2Oj5oU1wDYz5sx+hoCuh6lSs+/uPuWomIq3y1GDFNafW
+LsHBU16lQo5Q2yh25laQsKRgyPmMpHJ98edm6y2sHUabASmRHxvGiuwwE25aDU0
2SAeepyImJ2CzB80YG7WxlynHqNhpE7xfC7PzQlLgmfEHdU+tHFeQazRQnrFkW2W
kqRGIq7cKRnyypvjPMkjeiV9lRdAM9fSJvsB3svUuu1coIG1xxI1yegoGM4r5QP4
RGIVvYaiI76C0djoSbQ/dkIUUXQuB8AL5jyH34g3BZaaXyvpmnV4ilppMXVAnAYG
ON51WhJ6W0xNdNJwzYASZYH+tmCWI+N60Gv2NNMGHwMZ7e9bXgzUCZH5FaBFDGR5
S9VWqHB73Q+OyIVvIbKYcSc2w/aSuFKGSA==
-----END CERTIFICATE-----`;

const httpsAgent = new https.Agent({ ca: [...tls.rootCertificates, ZEROSSL_INTERMEDIATE], keepAlive: true });

interface CacStore {
  location: string;
  location_zh: string;
  lat: number;
  lng: number;
  phone: string;
}

// 门店表(来自站点 webConfigDetailService.storeInfo);key = ownStore
const STORES: Record<string, CacStore> = {
  "CAC Auto Group Lafayette": { location: "Lafayette, IN", location_zh: "印第安纳州拉法叶", lat: 40.379, lng: -86.843, phone: "(765) 471-0700" },
  "CAC Headquarter": { location: "Lafayette, IN", location_zh: "印第安纳州拉法叶", lat: 40.379, lng: -86.843, phone: "(765) 471-0700" },
  "CAC Auto Group Bloomington": { location: "Bloomington, IN", location_zh: "印第安纳州布卢明顿", lat: 39.165, lng: -86.562, phone: "(812) 287-8958" },
  "CAC Auto Group Champaign": { location: "Champaign, IL", location_zh: "伊利诺伊州香槟", lat: 40.1235, lng: -88.2915, phone: "(217) 607-1169" },
  "CAC Auto Group Atlanta": { location: "Duluth, GA", location_zh: "佐治亚州德卢斯(亚特兰大)", lat: 34.0005, lng: -84.145, phone: "(770) 680-4183" },
  "CAC Auto Group Boston": { location: "Southborough, MA", location_zh: "麻州绍斯伯勒(波士顿)", lat: 42.287, lng: -71.548, phone: "(508) 481-9400" },
  "CAC Auto Group Dallas": { location: "Richardson, TX", location_zh: "德州理查森(达拉斯)", lat: 32.944, lng: -96.73, phone: "(469) 975-7863" },
  "CAC Auto Group Bay Area": { location: "Sunnyvale, CA", location_zh: "加州森尼维尔(湾区)", lat: 37.371, lng: -122.045, phone: "(617) 852-0523" },
};
const HQ = STORES["CAC Headquarter"];

interface CacListRec {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trimLevel: string | null;
  askingPrice: number | null;
  mileage: number | null;
  mainImage: string | null;
  carSellType: string | null;
  saleType: string | null;
  status: string | null;
  bodyType: string | null;
  soldTime: number | null;
  hasOrder: boolean | null;
  ownStore: string | null;
  vin: string | null;
  stock: string | null;
}

interface CacDetail extends CacListRec {
  images: string[] | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  driveMode: string | null;
  fuelType: string | null;
  transmission: string | null;
  engineCylinder: string | null;
  engineDisplacement: string | null;
  accident: string | null;
  highlightList: string[] | null;
  equipmentList: { category?: string; equipmentName?: string }[] | null;
}

/** POST 明文(test:true)请求 doService,返回 { code, data, ... } */
function callService<T>(service: string, data: Record<string, unknown>): Promise<{ code: number; data: T; totalPage?: number }> {
  const body = JSON.stringify({
    service,
    platform: "web",
    salt: String(Math.random()).slice(2, 8),
    time: Math.floor(Date.now() / 1000),
    test: true,
    data: JSON.stringify({ ...data, guid: "123456", platform: "web" }),
    version: "1.0",
    token: "",
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      API_URL,
      {
        method: "POST",
        agent: httpsAgent,
        timeout: 30_000,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Origin: SITE,
          Referer: `${SITE}/shop.html`,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          if ((res.statusCode ?? 0) >= 400) return reject(new Error(`autocac HTTP ${res.statusCode} (${service})`));
          try {
            // 与前端一致:16 位以上长整数转字符串,避免精度丢失
            const text = Buffer.concat(chunks).toString("utf8").replace(/([: ])(\d{16,})([\r\n},])/g, '$1"$2"$3');
            const json = JSON.parse(text);
            if (json.code !== 200) return reject(new Error(`autocac ${service} code=${json.code} ${json.message ?? ""}`));
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error(`autocac timeout (${service})`)));
    req.on("error", reject);
    req.end(body);
  });
}

function canonicalMake(raw: string): string {
  const make = raw.trim();
  const hit = Object.keys(MAKES_ZH).find((k) => k.toLowerCase() === make.toLowerCase());
  if (hit) return hit;
  return make.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function mapFuel(f: string | null, make: string): string {
  const t = (f || "").toLowerCase();
  if (t.includes("hydrogen")) return "氢燃料";
  if (t.includes("plug")) return "插电混动";
  if (t.includes("hybrid")) return "混动";
  if (t.includes("electric") || make === "Tesla") return "纯电";
  if (t.includes("diesel")) return "柴油";
  return "汽油";
}

function mapTransmission(t: string | null): string {
  const s = (t || "").toLowerCase();
  if (s.includes("cvt")) return "CVT 无级";
  if (s.includes("manual")) return "MT 手动";
  return "AT 自动";
}

function mapDrive(d: string | null): string | null {
  const s = (d || "").toLowerCase();
  if (s.startsWith("awd") || s.includes("all wheel") || s.includes("all-wheel")) return "AWD";
  if (s.startsWith("4wd") || s.includes("4x4") || s.includes("4-wheel")) return "4WD";
  if (s.startsWith("fwd") || s.includes("front")) return "FWD";
  if (s.startsWith("rwd") || s.includes("rear")) return "RWD";
  return null; // "4x2" 无法区分前驱/后驱
}

/** "Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]" → "Sport Utility Vehicle" */
function simpleBody(b: string | null): string | null {
  const v = (b || "").split("/")[0].replace(/\s*[[(].*?[\])]/g, "").trim();
  return v || null;
}

function dedupe(urls: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const u of urls) {
    const v = (u || "").trim();
    if (v && /^https?:\/\//.test(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

function isListable(r: CacListRec): boolean {
  if (r.carSellType !== "inventory" || r.status !== "active") return false;
  if (r.hasOrder) return false;
  if (r.soldTime && r.soldTime > 0) return false; // 有成交时间的视为已售(库存状态未及时更新)
  if (!(r.askingPrice && r.askingPrice > 0)) return false;
  if (!r.mainImage) return false;
  if (/motorcycle/i.test(r.bodyType || "")) return false;
  return true;
}

function detailUrl(id: string): string {
  return `${SITE}/product-details.html?id=${id}`;
}

export function createAutoCacAdapter(): SourceAdapter {
  let cache = new Map<string, CacListRec>();

  return {
    key: "autocac",
    multiLocation: true,
    languages: ["zh", "en"],

    async listAll(): Promise<CrawlResult> {
      const res = await callService<CacListRec[]>("queryCarListService", {
        carTableDto: {
          makeAndModel: "", minPrice: "", maxPrice: "", make: [], model: [], bodyType: [],
          minYear: "", maxYear: "", minMileage: "", maxMileage: "", features: [], location: [],
          sortType: 1, sortName: "Best Match", pageNum: 1, pageLimit: 2000,
        },
      });
      const records = Array.isArray(res.data) ? res.data : [];
      if (records.length === 0) throw new Error("autocac: 列表为空(接口异常?)");
      const next = new Map<string, CacListRec>();
      const refs: SourceListingRef[] = [];
      for (const r of records) {
        if (!r.id || !isListable(r)) continue;
        next.set(r.id, r);
        refs.push({ sourceListingId: r.id, url: detailUrl(r.id) });
      }
      cache = next;
      // 列表含大量已售车,totalDeclared 取在售数,避免下架安全阀误判
      return { refs, totalDeclared: refs.length, pagesFetched: 1, failed: false };
    },

    async fetchDetail(_fetchHtml, ref): Promise<ParsedListing> {
      const listRec = cache.get(ref.sourceListingId);
      const res = await callService<CacDetail>("queryOfficialCarInfoByIdService", { id: ref.sourceListingId });
      const d = { ...(listRec ?? {}), ...res.data } as CacDetail;

      const year = Number(d.year) || 0;
      if (year < 1950) throw new Error(`invalid year "${d.year}"`);
      const make = canonicalMake(d.make || "");
      const model = (d.model || "").replace(/\s+/g, " ").trim();
      if (!make || !model) throw new Error(`missing make/model for ${ref.sourceListingId}`);
      const trim = (d.trimLevel || "").replace(/\s+/g, " ").trim() || null;

      const price = Math.round(d.askingPrice ?? 0);
      if (!(price > 0)) throw new Error("no price");
      if (d.carSellType !== "inventory") throw new Error(`not in stock (${d.carSellType})`);

      const images = dedupe([d.mainImage, ...(d.images ?? [])]);
      if (images.length === 0) throw new Error("no photos");

      const vinRaw = (d.vin || "").toUpperCase().trim();
      const vin = /^[A-HJ-NPR-Z0-9]{17}$/.test(vinRaw) ? vinRaw : null;

      const features: string[] = [];
      for (const f of [...(d.highlightList ?? []), ...(d.equipmentList ?? []).map((e) => e.equipmentName || "")]) {
        const v = f.replace(/\s+/g, " ").trim();
        if (v && !/carfax report/i.test(v) && !features.includes(v)) features.push(v);
      }

      const store = STORES[d.ownStore || ""] ?? HQ;
      const fuel_type = mapFuel(d.fuelType, make);
      const engine = [d.engineDisplacement ? `${d.engineDisplacement}L` : null, d.engineCylinder ? `${d.engineCylinder}-cyl` : null]
        .filter(Boolean)
        .join(" ");
      const description =
        [
          `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`,
          [simpleBody(d.bodyType), engine || null, d.transmission, mapDrive(d.driveMode)].filter(Boolean).join(" · "),
          d.accident === "No" ? "No accidents reported" : null,
        ]
          .filter(Boolean)
          .join("\n") || null;

      return {
        title: `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`,
        title_zh: `${year} ${MAKES_ZH[make] ?? make} ${model}${trim ? ` ${trim}` : ""}`,
        year,
        make,
        model,
        trim,
        price,
        original_price: null,
        mileage: Math.max(0, Math.round(d.mileage ?? 0)),
        location: store.location,
        location_zh: store.location_zh,
        lat: store.lat,
        lng: store.lng,
        image_url: images[0],
        images: images.slice(1),
        fuel_type,
        transmission: mapTransmission(d.transmission),
        exterior_color: mapColor(d.exteriorColor),
        interior_color: mapColor(d.interiorColor),
        drivetrain: mapDrive(d.driveMode),
        vin,
        description,
        description_zh: null,
        features: features.slice(0, MAX_FEATURES),
        seller_name: "CAC Auto Group 友车哒",
        phone: store.phone,
        carfax_url: null,
        carfax_summary: d.accident === "No" ? "无事故" : null,
        source_listing_id: ref.sourceListingId,
        source_url: ref.url,
      };
    },
  };
}
