import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer/Footer';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F8] font-sans">
      <Navbar />
      
      <main className="flex-grow flex flex-col relative">
        {children}
      </main>

      <Footer />
    </div>
  );
};