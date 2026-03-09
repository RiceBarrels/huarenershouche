# Agent 开发规范 (Build with Bun & shadcn/ui)

本指南定义了高性能、非传统 AI 风格的 Agent 界面开发准则。我们追求的是**工具感**而非**科技感**。

---

## 1. 技术底座 (Infrastructure)

* **Runtime:** [Bun](https://bun.sh/) - 充分利用 `Bun.serve` 和极速的包管理，提升 Agent 的响应并发。
* **Framework:** Next.js 15 (App Router) + TypeScript.
* **UI Foundation:** [shadcn/ui](https://ui.shadcn.com/) - 仅引入必要的原语组件，避免 UI 膨胀。
* **Icons:** [Lucide React](https://lucide.dev/) - 统一使用 `1.5px` 线宽，保持视觉轻盈。

---

## 2. 视觉哲学：去“AI”化 (Anti-AI Aesthetics)

为了摆脱廉价的 AI 模板感，我们严格执行以下 UI 约束：

| 元素 | 规范 (Do) | 禁忌 (Don't) |
| :--- | :--- | :--- |
| **色彩** | `Stone` 或 `Slate` 调色板，纯白/极深灰。 | 霓虹紫、深蓝色调、高饱和度渐变。 |
| **圆角** | `radius: 0.3rem` (较小且锐利)。 | `rounded-2xl` 或 `rounded-full`。 |
| **阴影** | 实体边框 (`1px border`) 或极细内阴影。 | 弥散的大范围外发光 (Glow effects)。 |
| **字体** | `Geist Mono` 或系统等宽字体 (Monospace)。 | 过于圆润的非衬线体。 |
| **交互** | 瞬时反馈，微小的位移。 | 慢速的打字机特效或粒子动效。 |

---

## 3. shadcn/ui 核心配置 (`theme.json`)

在 `globals.css` 中微调 shadcn 默认变量，以获得更“硬核”的生产力外观：

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    /* 统一使用边框而非阴影 */
    --card: 0 0% 98%;
    --primary: 240 5.9% 10%;
    --radius: 0.3rem; 
  }
  .dark {
    --background: 240 10% 3.9%;
    --card: 240 10% 6%;
    --border: 240 5% 15%;
  }
}