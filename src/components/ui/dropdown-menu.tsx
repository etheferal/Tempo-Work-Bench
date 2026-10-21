"use client";

import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg data-[state=open]:animate-[fade-in_0.12s_ease-out]",
          className
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  danger,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { danger?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none transition data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground",
        danger && "text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger [&_svg]:text-danger",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-border" />;
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}
