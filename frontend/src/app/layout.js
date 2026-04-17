// src/app/layout.js
import './globals.css';
import { AuthProvider } from '../lib/AuthContext';

export const metadata = {
  title: 'ReplyAI ERP — AI Messaging for Every Business',
  description: 'Automate WhatsApp & Instagram replies with AI. Universal ERP for any business.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
