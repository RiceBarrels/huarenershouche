import { Car, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";

const buyLinks = [
  { label: "搜索车辆", href: "/browse" },
  { label: "车辆对比", href: "/compare" },
  { label: "购车指南", href: "/guide" },
];

const sellLinks = [
  { label: "免费发布", href: "/post" },
  { label: "车辆估价", href: "/valuation" },
  { label: "我的车辆", href: "/account" },
];

const helpLinks = [
  { label: "关于我们", href: "#" },
  { label: "使用条款", href: "#" },
  { label: "隐私政策", href: "#" },
];

export function Footer() {
  return (
    <footer className="hidden border-t border-border bg-card md:block">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <Car className="h-5 w-5" strokeWidth={1.5} />
              <span className="font-mono text-sm font-semibold">华人二手车</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              北美华人最信赖的二手车交易平台，让买卖车更简单、更安心。
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="mailto:contact@huarencars.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                微信客服
              </span>
            </div>
          </div>

          {/* Buy */}
          <div>
            <h4 className="text-sm font-semibold">买车</h4>
            <ul className="mt-3 space-y-2">
              {buyLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell */}
          <div>
            <h4 className="text-sm font-semibold">卖车</h4>
            <ul className="mt-3 space-y-2">
              {sellLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-sm font-semibold">帮助与支持</h4>
            <ul className="mt-3 space-y-2">
              {helpLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} 华人二手车 HuarenCars. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="#" className="transition-colors hover:text-foreground">
              使用条款
            </Link>
            <span className="text-border">|</span>
            <Link href="#" className="transition-colors hover:text-foreground">
              隐私政策
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
