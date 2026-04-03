import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Mountain Connect — Seasonal Jobs at Ski Resorts Worldwide",
  description:
    "Connect with ski resort businesses and find seasonal work opportunities around the world. Build your profile, discover resorts, and apply to jobs with ease.",
  metadataBase: new URL("https://www.mountainconnects.com"),
  openGraph: {
    title: "Mountain Connect — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Connect with ski resort businesses and find seasonal work at resorts worldwide.",
    url: "https://www.mountainconnects.com",
    siteName: "Mountain Connect",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mountain Connect — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Connect with ski resort businesses and find seasonal work at resorts worldwide.",
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
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}
      <body className={`${jakarta.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
