"use client";
import dynamic from "next/dynamic";
import { ChevronLeft } from "lucide-react";
const PilotAttendance = dynamic(() => import("../../src/PilotAttendance"), { ssr: false });
export default function Page() {
  return <main className="standalone-attendance">
    <header className="attendance-appbar"><a href="/"><ChevronLeft size={20} aria-hidden="true" />Portal</a><span>Presensi Grup 2</span></header>
    <PilotAttendance />
  </main>;
}
