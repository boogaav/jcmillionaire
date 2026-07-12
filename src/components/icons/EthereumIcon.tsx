import React from 'react';

interface EthereumIconProps {
  size?: number;
  className?: string;
}

export const EthereumIcon: React.FC<EthereumIconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 256 417"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Ethereum"
  >
    <path fill="#FFFFFF" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity=".9" />
    <path fill="#FFFFFF" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity=".7" />
    <path fill="#FFFFFF" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity=".9" />
    <path fill="#FFFFFF" d="M127.962 416.905v-104.72L0 236.585z" opacity=".7" />
    <path fill="#FFFFFF" d="M127.961 287.958l127.96-75.637-127.96-58.162z" opacity=".5" />
    <path fill="#FFFFFF" d="M0 212.32l127.96 75.638v-133.8z" opacity=".8" />
  </svg>
);
