import React from 'react';

interface TonIconProps {
  size?: number;
  className?: string;
}

export const TonIcon: React.FC<TonIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="28" cy="28" r="28" fill="#0098EA" />
      <path
        d="M37.56 15.6H18.44c-3.51 0-5.74 3.79-3.97 6.85l11.78 20.4a1.91 1.91 0 0 0 3.31 0l11.78-20.4c1.76-3.05-.46-6.85-3.97-6.85ZM26.24 36.86 23.67 31.9l-6.19-11.07a1.34 1.34 0 0 1 1.17-2h7.59v18.04Zm12.27-15.94L32.33 31.9l-2.57 4.96V18.83h7.59c.93 0 1.62.99 1.16 2.09Z"
        fill="#fff"
      />
    </svg>
  );
};
