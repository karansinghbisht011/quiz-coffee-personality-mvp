import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Noto_Sans_Kannada } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], variable: "--font-kannada", weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Namma Coffee Personality Test",
  description: "Nine questions, three real coffees from Bengaluru cafes that match your personality.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // use the whole screen on notched phones; the CSS adds safe-area padding
  themeColor: "#f6f0e6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} ${kannada.variable}`}>
      <head>
        {/* Start downloading the quiz data (49 KB gzipped) while the page code loads, so slow networks wait less.
            A plain fetch (not <link rel="preload">, which Firefox handles badly); the page falls back to its own fetch. */}
        <script dangerouslySetInnerHTML={{ __html: "window.__quizData=fetch('/quiz_data.json').then(function(r){if(!r.ok)throw new Error(r.status);return r.json()});window.__quizData.catch(function(){});" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
