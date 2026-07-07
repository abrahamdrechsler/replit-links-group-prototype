import { useDocRefStore } from "../store/useDocRefStore";
import { DocRefItem } from "../types";
import { Badge } from "./ui/badge";
import { FileItem } from "./FileItem";
import { DropZone } from "./DropZone";
import { Layers, ChevronDown, ChevronRight, GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { useState, useRef, useEffect } from "react";

interface GroupItemProps {
  item: DocRefItem;
  panel: 'cdm' | 'local';
  allItems: DocRefItem[];
}

export function GroupItem({ item, panel, allItems }: GroupItemProps) {
  const { 
    toggleItemSelection, 
    showContextMenu, 
    getUpdateStatus,
    selectedCdmItems,
    selectedLocalItems,
    dragState,
    deleteItem,
    renameItem,
    setSelectedItems,
    moveItemUp,
    moveItemDown
  } = useDocRefStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropTarget, setIsDropTarget] = useState(false);
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
  } = useSortable({ id: item.id });



  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const selectedItems = panel === 'cdm' ? selectedCdmItems : selectedLocalItems;
  const isSelected = selectedItems.includes(item.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const currentSelection = panel === 'cdm' ? selectedCdmItems : selectedLocalItems;
    const isCtrlOrCmd = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on Mac
    const isShift = e.shiftKey;
    
    if (isShift && currentSelection.length > 0) {
      // Shift-click: Range selection
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

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSelected || isEditing) return;
    
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

  const getGroupColor = () => {
    if (panel === 'cdm') {
      return 'bg-blue-50 border-blue-200 text-blue-900';
    } else {
      return 'bg-green-50 border-green-200 text-green-900';
    }
  };

  const childItems = (item.items || [])
    .map(childId => allItems.find(child => child.id === childId))
    .filter(Boolean) as DocRefItem[];

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        data-item-id={item.id}
        className={`
          flex items-center p-3 rounded-lg group transition-all cursor-pointer
          ${isSelected 
            ? 'bg-primary text-primary-foreground border-2 border-primary shadow-md' 
            : `${getGroupColor()} hover:opacity-80`
          }
          ${isDragging ? 'opacity-50' : ''}
        `}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        {...listeners}
      >
        <button onClick={toggleExpanded} className="mr-2">
          {isExpanded ? (
            <ChevronDown className={`w-3 h-3 transition-transform ${isSelected ? 'text-primary-foreground' : ''}`} />
          ) : (
            <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'text-primary-foreground' : ''}`} />
          )}
        </button>
        <Layers className={`w-4 h-4 mr-2 ${isSelected ? 'text-primary-foreground' : ''}`} />
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleEditKeyDown}
            className="font-medium flex-1 bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          />
        ) : (
          <span 
            className={`font-medium flex-1 cursor-pointer ${isSelected ? 'text-primary-foreground' : ''}`}
            onDoubleClick={handleDoubleClick}
          >
            {item.name}
          </span>
        )}
        {getStatusBadge()}
        <button
          onClick={handleDelete}
          className={`p-1 rounded hover:bg-red-100 transition-colors mr-1 ${isSelected ? 'text-primary-foreground hover:text-red-600' : 'text-gray-400 hover:text-red-600'}`}
          title="Delete group"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <div className="drag-handle ml-1">
          <GripVertical className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-gray-400'}`} />
        </div>
      </div>

      {/* Group Items */}
      {isExpanded && (
        <div className="mt-2">
          {/* Drop zone at start of group */}
          <DropZone 
            id={item.id} 
            position="inside-start" 
            groupId={item.id}
          />
          
          {childItems.map((childItem, index) => (
            <div key={childItem.id}>
              {/* Drop zone before each item within group (except first one, which is covered by inside-start) */}
              {index > 0 && (
                <DropZone 
                  id={childItem.id} 
                  position="before" 
                  groupId={item.id}
                />
              )}
              <FileItem
                item={childItem}
                panel={panel}
                isSelected={selectedItems.includes(childItem.id)}
                inGroup={true}
                orderNumber={index + 1}
              />
              {/* Drop zone after each item within group */}
              <DropZone 
                id={childItem.id} 
                position="after" 
                groupId={item.id}
              />
            </div>
          ))}
          
          {/* Drop zone at end of group if empty */}
          {childItems.length === 0 && (
            <DropZone 
              id={item.id} 
              position="inside-end" 
              groupId={item.id}
            />
          )}
        </div>
      )}
    </div>
  );
}
