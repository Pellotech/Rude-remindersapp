import logoImage from "@assets/reems_logo_trimmed.png";

interface AppHeaderProps {
  className?: string;
}

export default function AppHeader({ className = "" }: AppHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      <img 
        src={logoImage} 
        alt="Reems Rude Reminders" 
        className="mx-auto max-w-[160px] w-full h-auto object-contain"
        data-testid="app-logo"
      />
    </div>
  );
}
