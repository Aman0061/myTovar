
import React from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

/** Общий компонент логотипа MyBusiness для всего приложения */
const Logo: React.FC<LogoProps> = ({ className = 'h-15 w-auto object-contain', alt = 'MyBusiness' }) => (
  <img src="/logo.png" alt={alt} className={className} />
);

export default Logo;
