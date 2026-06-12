"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";

import { AppLogo } from "@/components/layout/AppLogo";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Button } from "@/components/ui/button";

export function Topbar({
  user,
  workspace,
  onOpenMobileSidebar,
}: {
  user: {
    name: string | null;
    email: string;
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    id: string;
    name: string;
    creditsRemaining: number;
  };
  onOpenMobileSidebar?: () => void;
}) {
  return (
    <motion.header
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-zinc-100/80 bg-[#fafafa]/90 px-4 backdrop-blur-md md:justify-end md:px-8"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center gap-2 md:hidden">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="icon"
            size="icon"
            aria-label="Open navigation"
            onClick={onOpenMobileSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </motion.div>
        <AppLogo variant="mark" className="h-9 w-9 items-center justify-center" />
      </div>

      <div className="flex items-center gap-2">
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/settings/billing">{workspace.creditsRemaining.toLocaleString()} credits</Link>
          </Button>
        </motion.div>
        <NotificationBell />
        <AccountMenu user={user} creditsRemaining={workspace.creditsRemaining} />
      </div>
    </motion.header>
  );
}
