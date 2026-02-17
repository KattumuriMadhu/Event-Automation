import "./globals.scss";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import Chatbot from "./components/Chatbot";



export const metadata = {
  title: "Event Maganagement Automation",
  description: "Event Maganagement Automation Dashboard for NSRIT",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />

        {children}

        <Chatbot />

        {/* ✅ GLOBAL TOAST CONTAINER */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
