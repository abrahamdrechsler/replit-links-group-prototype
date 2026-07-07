import { useDocRefStore } from "../store/useDocRefStore";
import { DocRefItem } from "../types";
import { Badge } from "./ui/badge";
import { Settings, GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DropIndicator } from "./DropIndicator";
import { useState, useRef, useEffect } from "react";

interface FileItemProps {
  item: DocRefItem;
  panel: 'cdm' | 'local';
  isSelected: boolean;
  inGroup?: boolean;
  orderNumber?: number;
}

export function FileItem({ item, panel, isSelected, inGroup = false, orderNumber }: FileItemProps) {
  const { 
    toggleItemSelection, 
    showContextMenu, 
    getUpdateStatus,
    selectedCdmItems,
    selectedLocalItems,
    dragState,
    moveItemUp,
    moveItemDown,
    deleteItem,
    renameItem,
    setSelectedItems
  } = useDocRefStore();

  const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.name);
  const editInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: false // Always allow dragging, even within groups
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const currentSelection = panel === 'cdm' ? selectedCdmItems : selectedLocalItems;
    const isCtrlOrCmd = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on Mac
    const isShift = e.shiftKey;
    
    if (isShift && currentSelection.length > 0) {
      // Shift-click: Range selection
      const allItems = panel === 'cdm' ? useDocRefStore.getState().cdmItems : useDocRefStore.getState().localItems;
      const topLevelItems = allItems.filter(item => 
        !allItems.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
      );
      
      const currentIndex = topLevelItems.findIndex(i => i.id === item.id);
      const lastSelectedIndex = topLevelItems.findIndex(i => i.id === currentSelection[currentSelection.length - 1]);
      
      if (currentIndex !== -1 && lastSelectedIndex !== -1) {
        const startIndex = Math.min(currentIndex, lastSelectedIndex);
        const endIndex = Math.max(currentIndex, lastSelectedIndex);
        const rangeItems = topLevelItems.slice(startIndex, endIndex + 1).map(i => i.id);
        
        // Combine existing selection with range and remove duplicates
        const newSelection = [...currentSelection];
        rangeItems.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        setSelectedItems(panel, newSelection);
      }
    } else if (isCtrlOrCmd) {
      // Ctrl/Cmd-click: Toggle individual item
      toggleItemSelection(panel, item.id);
    } else {
      // Regular click: Select only this item (clear others)
      setSelectedItems(panel, [item.id]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const selectedItems = panel === 'cdm' ? selectedCdmItems : selectedLocalItems;
    
    // If the right-clicked item is not selected, use just this item
    // If it is selected, use all selected items
    const contextSelectedIds = selectedItems.includes(item.id) ? selectedItems : [item.id];
    
    showContextMenu(e.clientX, e.clientY, item.id, contextSelectedIds);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragState.isDragging || dragState.draggedId === item.id) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const position = e.clientY < midPoint ? 'top' : 'bottom';
    
    setDragOver(position);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSelected) return;
    
    // Get the current selection for this panel
    const currentSelection = panel === 'cdm' ? selectedCdmItems : selectedLocalItems;
    
    // Don't allow movement if multiple items are selected
    if (currentSelection.length > 1) return;
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveItemUp(panel, item.id);
      // Maintain focus after movement
      setTimeout(() => {
        const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement;
        if (element) element.focus();
      }, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveItemDown(panel, item.id);
      // Maintain focus after movement
      setTimeout(() => {
        const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement;
        if (element) element.focus();
      }, 0);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteItem(panel, item.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(item.name);
  };

  const handleEditSubmit = () => {
    if (editValue.trim() && editValue.trim() !== item.name) {
      renameItem(panel, item.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditValue(item.name);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const getStatusBadge = () => {
    if (panel === 'cdm' || !item.sourceId) return null;

    const status = getUpdateStatus(item);
    
    switch (status) {
      case 'linked':
      case 'update-available':
      case 'modified':
        return <Badge className="ref-tag text-xs">Link</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <DropIndicator isActive={dragOver === 'top'} position="top" />
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        data-item-id={item.id}
        className={`
          flex items-center p-2 rounded transition-all cursor-pointer group relative
          ${isSelected 
            ? 'bg-primary text-primary-foreground border-2 border-primary shadow-md' 
            : 'bg-white border border-gray-200 hover:border-primary hover:shadow-sm'
          }
          ${isDragging ? 'opacity-50' : ''}
          ${inGroup ? 'ml-6' : ''}
        `}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        tabIndex={isSelected ? 0 : -1}
        {...listeners}
      >
        <Settings className={`w-4 h-4 mr-3 ${isSelected ? 'text-primary-foreground' : 'text-gray-500'}`} />
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleEditKeyDown}
            className="flex-1 text-sm bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          />
        ) : (
          <span 
            className={`flex-1 text-sm cursor-pointer ${isSelected ? 'text-primary-foreground font-medium' : ''}`}
            onDoubleClick={handleDoubleClick}
          >
            {item.name}
          </span>
        )}
        
        {/* Right side elements - order number, trash, ref badge space, drag handle */}
        <div className="flex items-center ml-auto">
          {orderNumber && (
            <span className={`text-xs mr-3 font-mono ${isSelected ? 'text-primary-foreground' : 'text-gray-400'}`}>
              {orderNumber}
            </span>
          )}
          <button
            onClick={handleDelete}
            className={`p-1 rounded hover:bg-red-100 transition-colors mr-2 ${isSelected ? 'text-primary-foreground hover:text-red-600' : 'text-gray-400 hover:text-red-600'}`}
            title="Delete item"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          {/* Reserved space for ref badge - always present to maintain alignment */}
          <div className="w-12 flex justify-center mr-2">
            {getStatusBadge()}
          </div>
          <div className="drag-handle">
            <GripVertical className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>
      <DropIndicator isActive={dragOver === 'bottom'} position="bottom" />
    </div>
  );
}
