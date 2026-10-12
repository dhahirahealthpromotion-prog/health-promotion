import React, { useEffect, useContext } from 'react';
import { AppContext } from '../App';

export const FaviconManager: React.FC = () => {
  const context = useContext(AppContext);
  const customLogo = context?.customLogo;

  useEffect(() => {
    const updateFavicon = (href: string) => {
      // Update standard icon
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = href;

      // Update apple-touch-icon
      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel~='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleLink);
      }
      appleLink.href = href;
    };

    if (customLogo) {
      updateFavicon(customLogo);
    } else {
      updateFavicon('/favicon-32x32.png');
    }

    if (document.title !== 'برنامج الإجادة المؤسسية') {
      document.title = 'برنامج الإجادة المؤسسية';
    }
  }, [customLogo]);

  return null;
};
