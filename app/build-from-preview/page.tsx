"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function BuildFromPreviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  useEffect(() => {
    if (!slug) { router.replace("/build"); return; }

    fetch(`/api/get-preview?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        if (data.html) {
          sessionStorage.setItem("rb_build_state", JSON.stringify({
            html: data.html,
            businessName: data.businessName || "Your Business",
            sourceUrl: data.url || "",
          }));
        }
        router.replace("/build");
      })
      .catch(() => router.replace("/build"));
  }, [slug, router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a08", color: "#e8e0d0",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", flexDirection: "column", gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, border: "3px solid #2a2820",
        borderTopColor: "#c8a96e", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{"@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }"}</style>
      <div style={{ color: "rgba(232,224,208,0.6)", fontSize: 15 }}>Loading your site into the builder…</div>
    </div>
  );
}

export default function BuildFromPreview() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", background: "#0a0a08", color: "#e8e0d0",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif", flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, border: "3px solid #2a2820",
          borderTopColor: "#c8a96e", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{"@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }"}</style>
        <div style={{ color: "rgba(232,224,208,0.6)", fontSize: 15 }}>Loading…</div>
      </div>
    }>
      <BuildFromPreviewInner />
    </Suspense>
  );
}
