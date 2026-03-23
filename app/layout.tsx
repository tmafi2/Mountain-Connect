import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Mountain Connect — Seasonal Jobs at Ski Resorts Worldwide",
  description:
    "Connect with ski resort businesses and find seasonal work opportunities around the world. Build your profile, discover resorts, and apply to jobs with ease.",
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
      </body>
    </html>
  );
}
