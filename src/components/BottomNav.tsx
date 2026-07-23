import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gamepad2, User, BookOpen, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center justify-center gap-1 flex-1 py-2 px-3 rounded-xl transition-all',
      isActive 
        ? 'text-primary bg-primary/10' 
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    )}
  >
    <div className={cn(
      'p-2 rounded-full transition-all',
      isActive && 'bg-primary text-primary-foreground'
    )}>
      {icon}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { icon: <BookOpen className="w-5 h-5" />, label: 'Story', path: '/' },
    { icon: <Gamepad2 className="w-5 h-5" />, label: 'Game', path: '/game' },
    { icon: <Radio className="w-5 h-5" />, label: t('nav.live'), path: '/' },
    { icon: <User className="w-5 h-5" />, label: t('nav.profile'), path: '/profile' },
  ];

  // Don't show on active gameplay/result/verify pages
  const hiddenPaths = ['/play', '/result', '/verify'];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            isActive={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
