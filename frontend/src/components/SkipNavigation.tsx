import React from 'react';

interface SkipNavigationProps {
  links?: Array<{
    href: string;
    label: string;
  }>;
}

const defaultLinks = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#project-selector', label: 'Skip to project selector' },
  { href: '#settings-button', label: 'Skip to settings' }
];

export const SkipNavigation: React.FC<SkipNavigationProps> = ({ 
  links = defaultLinks 
}) => {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-blue-600 text-white p-2 rounded-br-lg">
        <nav aria-label="Skip navigation">
          <ul className="flex flex-col gap-1">
            {links.map((link, index) => (
              <li key={index}>
                <a
                  href={link.href}
                  className="block px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 rounded transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.querySelector(link.href);
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                      // Focus the target element if it's focusable
                      if (target instanceof HTMLElement) {
                        target.focus();
                      }
                    }
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default SkipNavigation;
