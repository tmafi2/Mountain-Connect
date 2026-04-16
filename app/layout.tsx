import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import CookieConsent from "@/components/ui/CookieConsent";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
  description:
    "Connect with ski resort businesses and find seasonal work opportunities around the world. Build your profile, discover resorts, and apply to jobs with ease.",
  metadataBase: new URL("https://www.mountainconnects.com"),
  openGraph: {
    title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Connect with ski resort businesses and find seasonal work at resorts worldwide.",
    url: "https://www.mountainconnects.com",
    siteName: "Mountain Connects",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Connect with ski resort businesses and find seasonal work at resorts worldwide.",
    images: ["/images/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased`}>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
