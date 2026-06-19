"use client";

import { MobileLoginQrPanel } from "@/components/auth/QrLoginPanel";
import { Card } from "@/components/ui/card";

export function MobileLoginQrCard() {
  return (
    <Card className="space-y-3 p-5">
      <div>
        <h2 className="text-base font-medium">Sign in on mobile</h2>
        <p className="text-sm text-muted-foreground">
          Scan this QR code from the LiteMoov app to sign in on your phone without a password.
        </p>
      </div>
      <MobileLoginQrPanel />
    </Card>
  );
}
