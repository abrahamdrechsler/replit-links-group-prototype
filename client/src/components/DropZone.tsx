import { useDroppable } from "@dnd-kit/core";

interface DropZoneProps {
  id: string;
  position: 'before' | 'after' | 'inside-start' | 'inside-end';
  groupId?: string;
  isActive?: boolean;
}

export function DropZone({ id, position, groupId, isActive = false }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone-${position}-${id}${groupId ? `-group-${groupId}` : ''}`,
  });

  const showIndicator = isOver || isActive;
  
  if (!showIndicator) {
    // For the "start" position, make the drop zone more generous in height
    const height = id === 'start' ? 'h-4' : 'h-2';
    const margin = id === 'start' ? '-my-2' : '-my-1';
    
    // Make drop zones invisible when not active
    const debugClass = 'opacity-0';
    
    return (
      <div 
        ref={setNodeRef} 
        className={`${height} ${margin} ${debugClass} relative ${id === 'start' ? 'z-50' : 'z-30'}`}
        data-dropzone={id}
        style={{ pointerEvents: 'all' }}

      />
    );
  }

  // For the "start" position, make the visible drop zone more prominent
  const height = id === 'start' ? 'h-4' : 'h-2';
  const margin = id === 'start' ? '-my-2' : '-my-1';
  const backgroundHeight = id === 'start' ? 'h-4' : 'h-3';
  const backgroundMargin = id === 'start' ? '-top-1' : '-top-0.5';

  return (
    <div 
      ref={setNodeRef} 
      className={`relative ${height} ${margin} ${id === 'start' ? 'z-50' : 'z-40'}`}
      data-dropzone={id}
      style={{ pointerEvents: 'all' }}
    >
      <div className="absolute inset-0 bg-blue-500 h-0.5 top-0.75 rounded-full shadow-lg z-50" />
      <div className={`absolute inset-0 bg-blue-500/20 ${backgroundHeight} ${backgroundMargin} rounded-lg z-40`} />
    </div>
  );
}