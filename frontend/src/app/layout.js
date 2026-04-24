import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "SHARPKODE | Field Tracking & Lead Management",
  description: "GPS-based field employee tracking, route visualization, and real-time lead management by SHARPKODE.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SHARPKODE Track",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2570eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2570eb" />
        <link rel="apple-touch-icon" href="/sharpkode.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="app-bg min-h-screen text-text-primary antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('[SW] Registered:', reg.scope))
                    .catch(err => console.warn('[SW] Registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
