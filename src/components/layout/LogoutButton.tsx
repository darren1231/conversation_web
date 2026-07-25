"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={isPending}
      onClick={() => startTransition(() => signOutAction())}
    >
      登出
    </Button>
  );
}
