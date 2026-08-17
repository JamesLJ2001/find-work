import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = host ? new URL(`${protocol}://${host}`) : undefined;

  return {
    metadataBase,
    title: "LeetCode 100 · 刷题作战台",
    description: "按真实作答记录追踪红黄绿状态、D+1/D+3/D+7 复习队列与专题掌握率。",
    openGraph: {
      title: "LeetCode 100 · 刷题作战台",
      description: "100 道目标题的掌握状态、复习节奏和完整作答历史。",
      type: "website",
      locale: "zh_CN",
      images: metadataBase ? [{ url: "/og.png", width: 1536, height: 1024 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "LeetCode 100 · 刷题作战台",
      description: "把每次卡住，都变成下一次能独立写出的证据。",
      images: metadataBase ? ["/og.png"] : undefined,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e12" },
    { media: "(prefers-color-scheme: light)", color: "#f1f0eb" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
