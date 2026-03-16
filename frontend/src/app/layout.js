import "./globals.scss";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";



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

        {/* ✅ GLOBAL TOAST CONTAINER */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              padding: '1rem 1.5rem',
              borderRadius: '99px',
              fontSize: '0.95rem',
              fontWeight: '600',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              marginTop: '1rem',
              maxWidth: '500px'
            },
            success: {
              style: {
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              style: {
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
