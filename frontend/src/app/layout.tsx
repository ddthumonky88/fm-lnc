import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import AppLayout from '../components/AppLayout';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FM .LNC Manager & Explorer',
  description: 'Football Manager (.LNC) Database Management & Explorer',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className={`${inter.className} antialiased`}>
        <AntdRegistry>
          <ConfigProvider
            locale={enUS}
            theme={{
              token: {
                colorPrimary: '#1d70b8',
                borderRadius: 6,
                fontFamily: inter.style.fontFamily,
              },
            }}
          >
            <AppLayout>
              {children}
            </AppLayout>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
