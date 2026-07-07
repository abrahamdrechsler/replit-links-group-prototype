import { useDocRefStore } from "../store/useDocRefStore";
import { Button } from "./ui/button";
import { Plus, Layers } from "lucide-react";
import { FileItem } from "./FileItem";
import { GroupItem } from "./GroupItem";
import { DropZone } from "./DropZone";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, CollisionDetection, getFirstCollision, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function CDMFilePanel() {
  const { 
    cdmItems, 
    selectedCdmItems, 
    addEntity, 
    createGroup, 
    reorderItems,
    startDrag,
    endDrag,
    dragState,
    getItemById,
    addItemToGroup,
    removeItemFromGroup,
    repositionItem
  } = useDocRefStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Custom collision detection that prioritizes drop zones, especially the start drop zone
  const customCollisionDetection: CollisionDetection = (args) => {
    // First, check for pointer collision with drop zones
    const pointerCollisions = pointerWithin(args);
    const dropZoneCollisions = pointerCollisions.filter(collision => 
      String(collision.id).startsWith('dropzone-')
    );
    
    // Debug logging for child items trying to reach start drop zone
    if (args.active?.id && String(args.active.id).includes('cdm-settings-')) {
      const activeId = String(args.active.id);
      const isInGroup = cdmItems.some(item => 
        item.type === 'group' && item.items?.includes(activeId)
      );
      
      if (isInGroup) {
        console.log('Child item collision detection:', {
          activeId,
          allCollisions: pointerCollisions.map(c => c.id),
          dropZoneCollisions: dropZoneCollisions.map(c => c.id),
          hasStartZone: dropZoneCollisions.some(c => String(c.id) === 'dropzone-before-start')
        });
      }
    }
    
    // Prioritize the start drop zone if it's being detected
    const startDropZone = dropZoneCollisions.find(collision => 
      String(collision.id) === 'dropzone-before-start'
    );
    
    if (startDropZone) {
      return [startDropZone];
    }
    
    if (dropZoneCollisions.length > 0) {
      return dropZoneCollisions;
    }
    
    // Fallback to rectangle intersection for other items
    return rectIntersection(args);
  };

  const entityCount = cdmItems.filter(item => item.type === 'entity').length;
  const groupCount = cdmItems.filter(item => item.type === 'group').length;

  const handleAddEntity = () => {
    if (entityCount >= 10) return;
    addEntity('cdm');
  };

  const handleCreateGroup = () => {
    if (groupCount >= 10 || selectedCdmItems.length === 0) return;
    createGroup('cdm', selectedCdmItems, 'Group');
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const item = getItemById(String(active.id), 'cdm');
    if (item) {
      const dragType = item.type === 'entity' ? 'item' : 'group';
      startDrag(String(active.id), dragType, 'cdm');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    endDrag();

    if (!over) return;

    const draggedItem = getItemById(String(active.id), 'cdm');
    if (!draggedItem) return;

    const overId = String(over.id);
    
    // Check if dropping on a precise drop zone
    if (overId.startsWith('dropzone-')) {
      // Parse dropzone ID: dropzone-{position}-{targetId}[-group-{groupId}]
      const parts = overId.split('-');
      const position = parts[1]; // 'before', 'after', 'inside-start', 'inside-end'
      const targetId = parts[2];
      const isGroupDrop = parts[3] === 'group';
      const groupId = isGroupDrop ? parts[4] : null;
      
      // Handle precise positioning
      if (draggedItem.type === 'entity') {
        if (isGroupDrop && groupId) {
          // Dropping within a group
          const targetGroup = getItemById(groupId, 'cdm');
          if (!targetGroup || targetGroup.type !== 'group') return;
          
          // Remove from current location
          const sourceGroup = cdmItems.find(item => 
            item.type === 'group' && item.items?.includes(draggedItem.id)
          );
          if (sourceGroup) {
            removeItemFromGroup('cdm', draggedItem.id, sourceGroup.id);
          }
          
          // Add to target group at specific position
          const groupItems = targetGroup.items || [];
          let insertIndex = 0;
          
          if (position === 'inside-start') {
            insertIndex = 0;
          } else if (position === 'inside-end') {
            insertIndex = groupItems.length;
          } else if (position === 'after') {
            const targetIndex = groupItems.findIndex(id => id === targetId);
            insertIndex = targetIndex !== -1 ? targetIndex + 1 : groupItems.length;
          } else if (position === 'before') {
            const targetIndex = groupItems.findIndex(id => id === targetId);
            insertIndex = targetIndex !== -1 ? targetIndex : 0;
          }
          
          const newGroupItems = [...groupItems];
          
          // Remove from current position if already in this group
          const currentIndex = newGroupItems.indexOf(draggedItem.id);
          if (currentIndex !== -1) {
            newGroupItems.splice(currentIndex, 1);
            // Adjust insert index if needed
            if (currentIndex < insertIndex) {
              insertIndex--;
            }
          }
          
          newGroupItems.splice(insertIndex, 0, draggedItem.id);
          
          // Update the store state directly to preserve precise positioning
          const currentState = useDocRefStore.getState();
          const updatedItems = currentState.cdmItems.map(item =>
            item.id === groupId
              ? { 
                  ...item, 
                  items: newGroupItems, 
                  localOrder: newGroupItems,
                  isModified: item.sourceId ? true : item.isModified,
                  lastUpdated: Date.now() 
                }
              : item
          );
          
          useDocRefStore.setState({ cdmItems: updatedItems });
          return;
        } else {
          // Dropping at top level
          const sourceGroup = cdmItems.find(item => 
            item.type === 'group' && item.items?.includes(draggedItem.id)
          );
          if (sourceGroup) {
            removeItemFromGroup('cdm', draggedItem.id, sourceGroup.id);
          }
          
          // Use repositionItem to handle moving from group to top level
          if (targetId === 'start') {
            repositionItem('cdm', draggedItem.id, 'start', 'before');
          } else {
            const validPosition = position === 'before' || position === 'after' ? position : 'before';
            repositionItem('cdm', draggedItem.id, targetId, validPosition);
          }
          return;
        }
      }
    }

    // Fallback to old logic for backward compatibility
    if (overId.startsWith('group-')) {
      const groupId = overId.replace('group-', '');
      const targetGroup = getItemById(groupId, 'cdm');
      
      if (targetGroup && targetGroup.type === 'group' && draggedItem.type === 'entity') {
        const sourceGroup = cdmItems.find(item => 
          item.type === 'group' && item.items?.includes(draggedItem.id)
        );
        
        if (sourceGroup?.id === groupId) return;
        
        if (sourceGroup) {
          removeItemFromGroup('cdm', draggedItem.id, sourceGroup.id);
        }
        addItemToGroup('cdm', draggedItem.id, groupId);
        return;
      }
    }

    // Normal reordering for items without precise drop zones
    const activeIndex = cdmItems.findIndex(item => item.id === active.id);
    const overIndex = cdmItems.findIndex(item => item.id === over.id);

    if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
      reorderItems('cdm', activeIndex, overIndex);
    }
  };

  const topLevelItems = cdmItems.filter(item => 
    !cdmItems.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
  );

  return (
    <div className="h-full bg-white border-r border-panel">
      {/* Panel Header */}
      <div className="p-4 border-b border-panel">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">CDM File</h2>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAddEntity}
              disabled={entityCount >= 10}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Entity
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCreateGroup}
              disabled={groupCount >= 10 || selectedCdmItems.length === 0}
              className="text-xs"
            >
              <Layers className="w-3 h-3 mr-1" />
              Create Group
            </Button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Entities: {entityCount}/10 • Groups: {groupCount}/10
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 h-full overflow-y-auto">
        <SortableContext items={topLevelItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div 
              className={`min-h-32 ${
                dragState.isDragging && dragState.sourcePanel === 'cdm' 
                  ? 'border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-2' 
                  : ''
              }`}
            >
              {/* Drop zone at start - with extra spacing for better targeting */}
              <div className="pt-2">
                <DropZone id="start" position="before" />
              </div>
              
              {topLevelItems.map((item, index) => (
                <div key={item.id}>
                  {item.type === 'group' ? (
                    <GroupItem
                      item={item}
                      panel="cdm"
                      allItems={cdmItems}
                    />
                  ) : (
                    <FileItem
                      item={item}
                      panel="cdm"
                      isSelected={selectedCdmItems.includes(item.id)}
                      orderNumber={index + 1}
                    />
                  )}
                  {/* Drop zone after each top-level item */}
                  <DropZone id={item.id} position="after" />
                </div>
              ))}
            </div>
        </SortableContext>

        {/* Drop Zone */}
        {topLevelItems.length === 0 && (
          <div className="drop-zone p-8 text-center text-gray-500">
            <Plus className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Add settings sets and create groups</p>
          </div>
        )}
      </div>
    </div>
  );
}
