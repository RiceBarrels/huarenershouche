// 由同名适配器族填充(见 index.ts)
//
// 2026-09 调研结果:本族候选站点目前都没有可抓取的在线库存,暂不接入。
// - apexautonet (Apex Autonet, 400 W Valley Blvd, Alhambra CA 91803) —— DealerCarSearch,
//   canonical 域名 apexautonet.net;库存页 /newandusedcars 真实浏览器下也是「No results found」,
//   sitemap 无任何 /vdp/ 车辆页(Yelp 显示已停业)。
// - sky1auto (Sky 1 Auto, 9270 Federal Blvd, Federal Heights CO 80260) —— DealerCarSearch,
//   /inventory、/newandusedcars 均为空库存,sitemap 无车辆页。
// - carpapapa (Carpapapa Auto Group, Seattle WA) —— eBizAutos/MotorCar 平台,
//   除首页外所有页面(inventory.aspx、used-cars.aspx、sitemap 等)全部 301 回首页,
//   页脚 © 2019,账号疑似停用。
// 若日后库存恢复:DCS 列表为服务端渲染(/InventoryModule/RefreshInventoryModule?pagename=newandusedcars
// &pagesize=100&page=N,GET),车辆页为 /vdp/<id>/...,可再写 dealercarsearch.ts 工厂。
import type { SourceAdapter } from "./types";

export const SITES: SourceAdapter[] = [];
