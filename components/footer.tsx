import { Car } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4" strokeWidth={1.5} />
              <span className="font-mono text-xs font-semibold">华人二手车</span>
            </div>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              北美华人最信赖的二手车交易平台，让买卖车更简单、更安心。
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs font-semibold">买车</h4>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">搜索车辆</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">按品牌浏览</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">按城市浏览</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">新车优惠</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-semibold">卖车</h4>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">免费发布</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">车辆估价</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">卖车指南</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">车行入驻</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-semibold">帮助</h4>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">购车指南</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">贷款计算器</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">保险比较</span>
              </li>
              <li>
                <span className="font-mono text-[11px] text-muted-foreground">联系我们</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-4">
          <p className="font-mono text-[10px] text-muted-foreground/60">
            © 2026 华人二手车 HuarenCars. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
