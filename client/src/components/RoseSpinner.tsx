import rosePng from "/rose_transparent.png?url";

interface RoseSpinnerProps {
  size?: number;
  className?: string;
}

export default function RoseSpinner({ size = 20, className = "" }: RoseSpinnerProps) {
  return (
    <img
      src={rosePng}
      alt=""
      aria-hidden
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        animation: "roseSpin 3.5s linear infinite",
        transformOrigin: "center center",
        display: "inline-block",
      }}
      data-testid="rose-spinner"
    />
  );
}
