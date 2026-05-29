import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

/*
 * Fuentes: objetivo de diseño = General Sans (cuerpo) + Clash Display (títulos),
 * que requieren self-host desde Fontshare. Mientras tanto usamos equivalentes
 * distintivos servidos por Google (NO Inter/Roboto, UX-08) mapeados a las mismas
 * variables CSS, para mantener el build sin assets offline. Ver docs/ARCHITECTURE.md.
 */
const body = Manrope({
  subsets: ["latin"],
  variable: "--font-general-sans",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-clash-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tandem",
  description: "El centro de control de vuestra startup",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${body.variable} ${display.variable} dark`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
