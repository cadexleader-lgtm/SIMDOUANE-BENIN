interface LogoProps {
  size?: number;
  className?: string;
}

const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;

export function SimDouaneLogo({ size = 48, className = "" }: LogoProps) {
  return (
    <img
      width={size}
      height={size}
      src={logoSrc}
      alt="SimDouane"
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
