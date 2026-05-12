import type { Metadata } from "next";
import "./globals.css";

import "@digdir/designsystemet-css/index.css";
import "rk-design-tokens/design-tokens-build/theme.css";
import { Source_Sans_3 } from "next/font/google";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});
export const metadata: Metadata = {
  title: "Red Cross Immigration Capacity Planning",
  description: "Capacity planning for immigration in Norway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className={`${sourceSans3.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
