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
            slug: slug, // ← pass slug so editor can save back to same record
          }));
        }
        router.replace("/build");
      })
      .catch(() => router.replace("/build"));
  }, [slug, router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0b0b09", color: "#e8e2d8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", flexDirection: "column", gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, border: "3px solid #1a1a14",
        borderTopColor: "#c8a96e", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
      <div style={{ color: "rgba(232,226,216,0.5)", fontSize: 14, fontFamily: "system-ui" }}>
        Loading your site into the editor…
      </div>
    </div>
  );
}

export default function BuildFromPreview() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", background: "#0b0b09", color: "#e8e2d8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          width: 44, height: 44, border: "3px solid #1a1a14",
          borderTopColor: "#c8a96e", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
      </div>
    }>
      <BuildFromPreviewInner />
    </Suspense>
  );
}
