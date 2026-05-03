export interface LoanPartner {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  minCreditScore: number;
  aprRange: string;
  url: string;
  features: string[];
}

export const LOAN_PARTNERS: LoanPartner[] = [
  {
    id: "lendingtree",
    name: "LendingTree Auto",
    nameZh: "LendingTree 贷款比价",
    description: "一次申请，多家银行报价，选择最优利率",
    minCreditScore: 500,
    aprRange: "3.99% - 24.99%",
    url: "https://www.lendingtree.com/auto/",
    features: ["多家银行比价", "无硬查询预审", "最快当天批准"],
  },
  {
    id: "capitalone",
    name: "Capital One Auto Navigator",
    nameZh: "Capital One 汽车贷款",
    description: "预审不影响信用分，可在经销商直接使用",
    minCreditScore: 550,
    aprRange: "5.24% - 18.99%",
    url: "https://www.capitalone.com/auto-financing/",
    features: ["预审不查信用", "覆盖全美经销商", "在线管理还款"],
  },
  {
    id: "myautoloan",
    name: "myAutoloan",
    nameZh: "myAutoloan 在线车贷",
    description: "支持私人买卖贷款，适合华人社区交易",
    minCreditScore: 575,
    aprRange: "3.49% - 19.99%",
    url: "https://www.myautoloan.com/",
    features: ["支持私人交易", "可贷旧车", "60秒预审"],
  },
  {
    id: "bankofamerica",
    name: "Bank of America",
    nameZh: "美国银行汽车贷款",
    description: "大银行信誉保障，现有客户享更低利率",
    minCreditScore: 620,
    aprRange: "4.49% - 12.99%",
    url: "https://www.bankofamerica.com/auto-loans/",
    features: ["0.25% 老客户折扣", "最长 75 个月", "网上申请"],
  },
];

export const QA_CATEGORIES = [
  { value: "buying", label: "购车", icon: "🚗" },
  { value: "selling", label: "卖车", icon: "💰" },
  { value: "loan", label: "贷款", icon: "🏦" },
  { value: "insurance", label: "保险", icon: "🛡️" },
  { value: "dmv", label: "过户", icon: "📋" },
  { value: "maintenance", label: "保养", icon: "🔧" },
  { value: "general", label: "其他", icon: "💬" },
];
