import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { hashEmailToken } from "@/lib/email/tokens";

export default async function VerifyEmailPage({ params }: { params: { token: string } }) {
  const token = await prisma.emailToken.findUnique({
    where: { tokenHash: hashEmailToken(params.token) },
    include: { user: true },
  });

  const isValid =
    token &&
    token.type === "EMAIL_VERIFICATION" &&
    !token.usedAt &&
    token.expiresAt >= new Date() &&
    token.user.isActive;

  if (!isValid) {
    if (token && token.type === "EMAIL_VERIFICATION" && !token.usedAt) {
      await prisma.emailToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
    }

    return (
      <VerificationShell
        success={false}
        title="Verification link expired"
        message="Request a fresh verification link from the login page."
      />
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: token.user.emailVerifiedAt ?? new Date() },
    }),
    prisma.emailToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return (
    <VerificationShell
      success
      title="Email verified"
      message="Your account is ready. You can now sign in to your workspace."
    />
  );
}

function VerificationShell({
  success,
  title,
  message,
}: {
  success: boolean;
  title: string;
  message: string;
}) {
  const Icon = success ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md space-y-5 bg-white p-6 text-center">
        <div className={success ? "mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600" : "mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-medium">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        <Button asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
      </Card>
    </div>
  );
}
