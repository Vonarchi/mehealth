import type { Metadata } from "next";
import { HerResetApp } from "@/components/her-reset/her-reset-app";

export const metadata: Metadata = {
  title: "Hive Reset | Demo",
  description: "Demo of a coach-branded 12-week body reset app.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <HerResetApp brandId="hive" demo />;
}
