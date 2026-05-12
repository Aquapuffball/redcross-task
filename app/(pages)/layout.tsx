"use client";
import "@digdir/designsystemet-css/index.css";
import "rk-design-tokens/design-tokens-build/theme.css";
import { SkipLink } from "@digdir/designsystemet-react";
import { Footer, Header } from "rk-designsystem";

const FOOTER_SHORTCUTS = [
  { label: "Forside", href: "/" },
  { label: "Kommunesammenligning", href: "/comparison" },
];
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SkipLink href="#main-content">Hopp til hovedinnhold</SkipLink>
      <Header
        data-color="primary"
        showUser={false}
        showSearch={false}
        showLogin={false}
        showCta={false}
        showMenuButton={false}
        showNavItems={false}
      />
      {children}
      <Footer
        data-color="neutral"
        hideNewsletter
        shortcutsTitle="Snarveier"
        shortcutsLinks={[...FOOTER_SHORTCUTS]}
      />
    </>
  );
}
