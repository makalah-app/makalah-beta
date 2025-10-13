import { cn } from "@/lib/utils";
import { Plus, Send } from "lucide-react";

export default function ChatInputHeroMock() {
  return (
    <div
      className={cn(
        "pointer-events-none select-none hidden md:block",
        "w-full max-w-4xl mx-auto"
      )}
      aria-hidden
    >
      <div className="rounded-[3px] border border-white/10 bg-[#0f0f0f] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7),0_8px_24px_-8px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Browser bar */}
        <div className="h-7 md:h-8 bg-[#2b2b2b] border-b border-white/10 flex items-center px-3 gap-2 rounded-t-[3px]">
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f56' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#5e5e5e' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
        </div>
        {/* Chat input area (single large box) */}
        <div className="relative rounded-b-[3px] border border-white/10 bg-[#161616] h-32 md:h-36">
          {/* Placeholder shimmer text */}
          <div className="absolute left-4 top-3 md:left-5 md:top-4">
            <span className="hero-text-shimmer text-base md:text-lg font-medium">Kirim percakapan...</span>
          </div>
          {/* Corner icons */}
          <div className="absolute left-4 bottom-3 md:left-5 md:bottom-4 text-white/65">
            <Plus className="w-6 h-6" />
          </div>
          <div className="absolute right-4 bottom-3 md:right-5 md:bottom-4 text-white/65">
            <Send className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
