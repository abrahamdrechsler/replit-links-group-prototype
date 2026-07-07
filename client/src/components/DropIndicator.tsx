interface DropIndicatorProps {
  isActive: boolean;
  position: 'top' | 'bottom' | 'inside';
}

export function DropIndicator({ isActive, position }: DropIndicatorProps) {
  if (!isActive) return null;

  const baseClasses = "absolute left-0 right-0 z-10 transition-all duration-200";
  
  if (position === 'inside') {
    return (
      <div className={`${baseClasses} inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-lg`} />
    );
  }

  const positionClasses = position === 'top' ? '-top-1' : '-bottom-1';
  
  return (
    <div className={`${baseClasses} ${positionClasses} h-0.5 bg-primary rounded-full shadow-lg`} />
  );
}