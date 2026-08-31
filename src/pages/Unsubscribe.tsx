import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    apiGet<{ valid?: boolean; reason?: string }>(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(d => {
        if (d.valid === false && d.reason === "already_unsubscribed") setStatus("already");
        else if (d.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleUnsubscribe() {
    if (!token) return;
    try {
      const result = await apiPost<{ success: boolean; reason?: string }>("/api/unsubscribe", { token });
      setStatus(result.success ? "success" : "already");
    } catch { setStatus("error"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
        {status === "loading" && <p className="text-muted-foreground">Loading…</p>}
        {status === "valid" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-4">Unsubscribe</h1>
            <p className="text-sm text-muted-foreground mb-6">Click below to unsubscribe from future emails.</p>
            <button onClick={handleUnsubscribe} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Confirm Unsubscribe
            </button>
          </>
        )}
        {status === "already" && <p className="text-muted-foreground">You have already unsubscribed.</p>}
        {status === "invalid" && <p className="text-destructive">Invalid or expired link.</p>}
        {status === "success" && <p className="text-green-600 font-medium">You have been unsubscribed successfully.</p>}
        {status === "error" && <p className="text-destructive">Something went wrong. Please try again.</p>}
      </div>
    </div>
  );
}
