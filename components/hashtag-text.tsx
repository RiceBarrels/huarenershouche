"use client";

import { useRouter } from "next/navigation";
import { useOverlay } from "@/components/car-overlay-provider";

// 把文本里的 #话题 渲染成可点击链接(X 式),点击跳社区搜索该话题。
// 在卡片 Link 内部使用时会阻止冒泡,不会误触打开帖子;
// 在浮层/抽屉里点击时先清空浮层栈(跳转仅变 query,pathname 清栈不会触发)
export function HashtagText({ text }: { text: string }) {
  const router = useRouter();
  const { closeAll } = useOverlay();
  const parts = text.split(/(#[^\s#,。;!?、,.;:!?]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeAll();
              router.push(`/community?q=${encodeURIComponent(part.slice(1))}`);
            }}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {part}
          </button>
        ) : (
          part
        ),
      )}
    </>
  );
}
