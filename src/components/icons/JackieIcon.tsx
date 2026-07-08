import React from 'react';
import jcCoinAsset from '@/assets/jc-coin.png.asset.json';

interface JackieIconProps {
  className?: string;
  size?: number;
}

export const JackieIcon: React.FC<JackieIconProps> = ({ className = '', size = 48 }) => {
  return (
    <img
      src={jcCoinImage}
      alt="Jackie Chain"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
};

export const CoinIcon: React.FC<JackieIconProps> = ({ className = '', size = 24 }) => {
  return (
    <img
      src={jcCoinImage}
      alt="JC Token"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
};
