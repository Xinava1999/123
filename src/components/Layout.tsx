import React from 'react';
import { Sparkles } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F0F0F0] text-black font-sans selection:bg-yellow-400 selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black p-4 md:p-6 flex justify-between items-center">
        <div className="flex items-center gap-3 group">
          <div className="bg-black text-white p-2 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">欢迎来到炉批小团体</h1>
        </div>
        
        <div className="hidden md:block text-xs font-black uppercase tracking-widest border-2 border-black px-4 py-2 bg-yellow-400">
          炉石 HUB / 自由分享
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black p-8 bg-white mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm font-black uppercase italic tracking-tighter">炉批小团体 HUB</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">© 2026 炉批小团体 PROJECT</div>
        </div>
      </footer>
    </div>
  );
};
