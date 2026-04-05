import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const geistSans = Manrope({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PGSMZJ4V');`}
        </Script>
        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-S8L3NT7CBW"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-S8L3NT7CBW');`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-white">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PGSMZJ4V"
            height="0" width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
