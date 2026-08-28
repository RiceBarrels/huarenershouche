"use client";

import { Suspense } from "react";
import UserDetailPage from "./user-detail";

export default function UserQueryPage() {
  return (
    <Suspense>
      <UserDetailPage />
    </Suspense>
  );
}
