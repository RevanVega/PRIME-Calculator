import type { Metadata } from "next";
import "./globals.css";
import { CalculatorProvider } from "@/context/CalculatorContext";

export const metadata: Metadata = {
  title: "PRIME Calculator",
  description: "Protected Retirement Income Made Easy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-gray-100">
        <CalculatorProvider>{children}</CalculatorProvider>
      </body>
    </html>
  );
}
