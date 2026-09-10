import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LEGAL } from "@/lib/legal/config";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const DESCRIPTION =
  "Routine vocale personnalisée et progressive pour choristes, adaptée à la voix réelle de chacun — soprano, alto, ténor, basse.";

export const metadata: Metadata = {
  // Sans base, Next ne peut pas résoudre les URL absolues exigées par les
  // aperçus de partage, et les balises Open Graph sortent en chemins relatifs.
  metadataBase: new URL(LEGAL.siteUrl),
  title: { default: "Vocal Training — Coach vocal choral", template: "%s · Vocal Training" },
  description: DESCRIPTION,
  applicationName: LEGAL.serviceName,
  authors: [{ name: LEGAL.publisher.name }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: LEGAL.siteUrl,
    siteName: LEGAL.serviceName,
    title: "Vocal Training — Coach vocal choral",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Vocal Training — Coach vocal choral",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
