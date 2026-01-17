import { Capacitor } from "@capacitor/core";

interface iPadFrameProps {
  children: React.ReactNode;
}

export default function iPadFrame({ children }: iPadFrameProps) {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-800 flex items-center justify-center p-4">
      <div 
        className="relative bg-black rounded-[40px] p-[4px] shadow-2xl"
        style={{
          width: 'min(515px, 95vw)',
          aspectRatio: '2064 / 2752',
          maxHeight: '95vh',
        }}
      >
        <div 
          className="w-full h-full bg-white rounded-[36px] overflow-hidden relative"
        >
          <div className="absolute inset-0 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
