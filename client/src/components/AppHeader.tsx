import logoImage from "@assets/translusant_logo1_1767105109175.png";

interface AppHeaderProps {
  className?: string;
}

export default function AppHeader({ className = "" }: AppHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      <img 
        src={logoImage} 
        alt="Rude Reminders" 
        className="mx-auto max-w-[200px] w-full h-auto object-contain"
        data-testid="app-logo"
      />
    </div>
  );
}
