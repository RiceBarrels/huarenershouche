"use client";

import { createContext, useContext } from "react";

// (backnav) 布局组标记:桌面 Header 据此在导航栏里显示统一的返回按钮
// (页面内不再各自渲染 DesktopBack)
const NavBackContext = createContext(false);

export function NavBackProvider({ children }: { children: React.ReactNode }) {
  return <NavBackContext.Provider value={true}>{children}</NavBackContext.Provider>;
}

export function useShowNavBack() {
  return useContext(NavBackContext);
}
