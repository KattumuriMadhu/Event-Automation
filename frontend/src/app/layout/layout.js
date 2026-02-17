import "./globals.scss";


export const metadata = {
  title: "Event Automation",
  description: "Event Automation System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
