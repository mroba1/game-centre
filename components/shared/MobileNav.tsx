"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarBody } from "@/components/shared/Sidebar";

export function MobileNav({
  brandTitle,
  brandSubtitle,
  variant = "user",
  footer,
}: {
  brandTitle: string;
  brandSubtitle: string;
  variant?: "user" | "admin";
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <SheetContent side="left" className="bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Site navigation menu</SheetDescription>
        <SidebarBody brandTitle={brandTitle} brandSubtitle={brandSubtitle} variant={variant} footer={footer} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
