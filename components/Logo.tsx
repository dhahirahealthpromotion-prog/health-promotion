import React, { useContext } from 'react';
import { AppContext } from '../App';

interface LogoProps {
  className?: string;
  alt?: string;
}

const DEFAULT_LOGO = '/logo.png';

const Logo: React.FC<LogoProps> = ({ className, alt = 'شعار برنامج الإجادة المؤسسية' }) => {
  const context = useContext(AppContext);
  const customLogo = context?.customLogo;
  const logoSrc = customLogo || DEFAULT_LOGO;

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`object-contain select-none ${className || ''}`}
      loading="eager"
    />
  );
};

export default Logo;
