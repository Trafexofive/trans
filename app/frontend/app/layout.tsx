import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google"; // Import Rajdhani
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

// Configure fonts
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ 
    subsets: ["latin"], 
    weight: ["400", "500", "600", "700"],
    variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  title: "Transcendence",
  description: "The Ultimate Pong Experience. Remastered.",
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en" className="dark">
      {/* Apply font variables to the body */}
      <body className={`${inter.variable} ${rajdhani.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
