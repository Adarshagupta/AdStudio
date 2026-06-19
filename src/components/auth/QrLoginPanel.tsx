"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthLionIllustration } from "@/components/auth/AuthLionIllustration";
import { Button } from "@/components/ui/button";
import { getPostAuthRedirectPath } from "@/lib/dashboard-chat";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

type QrInitResponse = {
  sessionId: string;
  qrPayload: string;
  expiresAt: number;
  error?: string;
};

type QrStatusResponse = {
  status: "pending" | "approved" | "consumed" | "expired";
  error?: string;
};

type QrCompleteResponse = {
  ok?: boolean;
  onboardingComplete?: boolean;
  error?: string;
  status?: string;
};

function postAuthPath(onboardingComplete?: boolean) {
  if (onboardingComplete === false) return "/onboarding";
  return getPostAuthRedirectPath();
}

export function QrLoginPanel() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "waiting" | "expired">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const renderQr = useCallback(async (payload: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    await QRCode.toCanvas(canvas, payload, {
      width: 220,
      margin: 1,
      color: { dark: "#0B1220", light: "#FFFFFF" },
    });
    return true;
  }, []);

  const startSession = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/auth/qr/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "web_login" }),
      });
      const data = await readJsonResponse<QrInitResponse>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not start QR login."));
      }

      setSessionId(data.sessionId);
      setExpiresAt(data.expiresAt);
      setQrPayload(data.qrPayload);
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start QR login.";
      setErrorMessage(message);
      notify.error(message);
      setStatus("expired");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void startSession();
  }, [startSession]);

  useEffect(() => {
    if (!qrPayload || status !== "ready") return;
    void renderQr(qrPayload).then((ok) => {
      if (!ok) {
        requestAnimationFrame(() => {
          void renderQr(qrPayload);
        });
      }
    });
  }, [qrPayload, status, renderQr]);

  useEffect(() => {
    if (!sessionId || status !== "ready") return;

    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const response = await fetch(`/api/auth/qr/status?sessionId=${encodeURIComponent(sessionId!)}`);
          const data = await readJsonResponse<QrStatusResponse>(response);

          if (data.status === "expired") {
            setStatus("expired");
            return;
          }

          if (data.status === "approved") {
            setStatus("waiting");
            const completeResponse = await fetch("/api/auth/qr/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
            const completeData = await readJsonResponse<QrCompleteResponse>(completeResponse);

            if (completeResponse.ok) {
              notify.success("Signed in with mobile app.");
              router.push(postAuthPath(completeData.onboardingComplete));
              return;
            }

            if (completeResponse.status !== 409) {
              throw new Error(
                responseErrorMessage(completeResponse, completeData, "Could not complete QR login."),
              );
            }
          }
        } catch (error) {
          if (!cancelled) {
            notify.error(error instanceof Error ? error.message : "QR login failed.");
          }
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [router, sessionId, status]);

  useEffect(() => {
    if (!expiresAt || status !== "ready") return;
    const timer = window.setInterval(() => {
      if (Date.now() > expiresAt) {
        setStatus("expired");
        setErrorMessage("QR code expired.");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, status]);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-zinc-900">Sign in with mobile app</p>
        <p className="text-xs leading-relaxed text-zinc-500">
          Open LiteMoov on your phone, go to Profile → Scan QR, and approve this login.
        </p>
      </div>

      <div className="relative mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50">
        <canvas
          ref={canvasRef}
          className={`rounded-xl ${status === "ready" || status === "waiting" ? "opacity-100" : "opacity-0"}`}
          aria-label="QR login code"
        />
        {status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-zinc-500">Generating QR…</p>
          </div>
        ) : null}
        {status === "expired" ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
            <p className="text-sm text-zinc-500">{errorMessage ?? "Could not load QR code."}</p>
          </div>
        ) : null}
        {status === "ready" || status === "waiting" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-white p-1.5 shadow-sm">
              <AuthLionIllustration className="h-10 w-10" />
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-zinc-500">
        {status === "waiting"
          ? "Approved — finishing sign in…"
          : status === "expired"
            ? "QR code expired."
            : "Waiting for approval on your phone…"}
      </p>

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-full"
        disabled={isRefreshing}
        onClick={() => void startSession()}
      >
        {isRefreshing ? "Refreshing…" : "Refresh QR code"}
      </Button>
    </div>
  );
}

export function MobileLoginQrPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "expired">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const renderQr = useCallback(async (payload: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    await QRCode.toCanvas(canvas, payload, {
      width: 220,
      margin: 1,
      color: { dark: "#0B1220", light: "#FFFFFF" },
    });
    return true;
  }, []);

  const startSession = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/auth/qr/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "mobile_login" }),
      });
      const data = await readJsonResponse<QrInitResponse>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not create mobile login QR."));
      }

      setExpiresAt(data.expiresAt);
      setQrPayload(data.qrPayload);
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create QR code.";
      setErrorMessage(message);
      notify.error(message);
      setStatus("expired");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void startSession();
  }, [startSession]);

  useEffect(() => {
    if (!qrPayload || status !== "ready") return;
    void renderQr(qrPayload).then((ok) => {
      if (!ok) {
        // Canvas ref not ready yet — retry on next paint.
        requestAnimationFrame(() => {
          void renderQr(qrPayload);
        });
      }
    });
  }, [qrPayload, status, renderQr]);

  useEffect(() => {
    if (!expiresAt || status !== "ready") return;
    const timer = window.setInterval(() => {
      if (Date.now() > expiresAt) {
        setStatus("expired");
        setErrorMessage("QR code expired.");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, status]);

  return (
    <div className="space-y-4">
      <div className="relative mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
        <canvas
          ref={canvasRef}
          className={`rounded-xl ${status === "ready" ? "opacity-100" : "opacity-0"}`}
          aria-label="Mobile login QR code"
        />
        {status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-zinc-500">Generating…</p>
          </div>
        ) : null}
        {status === "expired" ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
            <p className="text-sm text-zinc-500">
              {errorMessage ?? "Could not load QR code."}
            </p>
          </div>
        ) : null}
        {status === "ready" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-white p-1.5 shadow-sm">
              <AuthLionIllustration className="h-9 w-9" />
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-center text-xs text-zinc-500">
        {status === "expired"
          ? "Tap refresh to generate a new code."
          : "Scan with the LiteMoov app login screen."}
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-full"
        disabled={isRefreshing}
        onClick={() => void startSession()}
      >
        {isRefreshing ? "Refreshing…" : "Refresh QR code"}
      </Button>
    </div>
  );
}
