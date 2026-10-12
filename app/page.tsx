"use client";

import dynamic from "next/dynamic";

const Portal = dynamic(() => import("../src/App"), {
  ssr: false,
  loading: () => (
    <div className="portal-loading" role="status">
      <span className="loading-mark">S</span>
      <p>Menyiapkan Soedirman Portal…</p>
    </div>
  ),
});

export default function Page() {
  return <Portal />;
}
