import { useDocRefStore } from "../store/useDocRefStore";
import { Button } from "./ui/button";
import { Plus, Layers } from "lucide-react";
import { FileItem } from "./FileItem";
import { GroupItem } from "./GroupItem";
import { DropZone } from "./DropZone";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, CollisionDetection, getFirstCollision, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function LocalFilePanel() {
  const { 
    localItems, 
    selectedLocalItems, 
    addEntity, 
    createGroup, 
    reorderItems,
    startDrag,
    endDrag,
    dragState,
    getItemById,
    getUpdateStatus,
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

  // Custom collision detection that prioritizes drop zones
  const customCollisionDetection: CollisionDetection = (args) => {
    // First, check for pointer collision with drop zones
    const pointerCollisions = pointerWithin(args);
    const dropZoneCollisions = pointerCollisions.filter(collision => 
      String(collision.id).startsWith('dropzone-')
    );
    
    if (dropZoneCollisions.length > 0) {
      return dropZoneCollisions;
    }
    
    // Fallback to rectangle intersection for other items
    return rectIntersection(args);
  };

  const entityCount = localItems.filter(item => item.type === 'entity').length;
  const groupCount = localItems.filter(item => item.type === 'group').length;

  const handleAddEntity = () => {
    if (entityCount >= 10) return;
    addEntity('local');
  };

  const handleCreateGroup = () => {
    if (groupCount >= 10 || selectedLocalItems.length === 0) return;
    createGroup('local', selectedLocalItems, 'Group');
  };



  const handleDragStart = (event: any) => {
    const { active } = event;
    const item = getItemById(String(active.id), 'local');
    if (item) {
      const dragType = item.type === 'entity' ? 'item' : 'group';
      startDrag(String(active.id), dragType, 'local');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    endDrag();

    if (!over) return;

    const draggedItem = getItemById(String(active.id), 'local');
    if (!draggedItem) return;

    const overId = String(over.id);
    console.log('LocalFilePanel handleDragEnd:', { activeId: active.id, overId, draggedItem: draggedItem.name });
    
    // Check if dropping on a precise drop zone
    if (overId.startsWith('dropzone-')) {
      // Parse dropzone ID: dropzone-{position}-{targetId}[-group-{groupId}]
      const parts = overId.split('-');
      const position = parts[1]; // 'before', 'after', 'inside-start', 'inside-end'
      const targetId = parts[2];
      const isGroupDrop = parts[3] === 'group';
      const groupId = isGroupDrop ? parts[4] : null;
      
      console.log('Drop zone detected:', { overId, parts, position, targetId, isGroupDrop, groupId });
      
      // Handle precise positioning
      if (draggedItem.type === 'entity') {
        const sourceGroup = localItems.find(item => 
          item.type === 'group' && item.items?.includes(draggedItem.id)
        );

        console.log('Processing precise drop:', { draggedItem: draggedItem.name, sourceGroup: sourceGroup?.name });

        // Doc ref restriction checks
        if (draggedItem.sourceId && sourceGroup?.sourceId) {
          // Doc-ref'd item in linked group can only move within same group
          if (!isGroupDrop || groupId !== sourceGroup.id) {
            console.log('Blocked by doc ref restriction');
            return;
          }
        }

        if (isGroupDrop && groupId) {
          // Dropping within a group
          console.log('Attempting group drop to:', groupId);
          const targetGroup = getItemById(groupId, 'local');
          if (!targetGroup || targetGroup.type !== 'group') {
            console.log('Target group not found or invalid:', targetGroup);
            return;
          }
          console.log('Target group found:', targetGroup.name);
          
          // Doc ref restriction: Cannot move linked items into linked groups (unless already there)
          if (draggedItem.sourceId && targetGroup.sourceId && sourceGroup?.id !== groupId) {
            return;
          }
          
          // Remove from current location
          if (sourceGroup && sourceGroup.id !== groupId) {
            removeItemFromGroup('local', draggedItem.id, sourceGroup.id);
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
          const updatedItems = currentState.localItems.map(item =>
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
          
          useDocRefStore.setState({ localItems: updatedItems });
          return;
        } else {
          // Dropping at top level
          // Doc ref restriction: Cannot move linked items out of linked groups
          if (draggedItem.sourceId && sourceGroup?.sourceId) {
            return;
          }
          
          if (sourceGroup) {
            removeItemFromGroup('local', draggedItem.id, sourceGroup.id);
          }
          
          // Use repositionItem to handle moving from group to top level
          if (targetId === 'start') {
            repositionItem('local', draggedItem.id, 'start', 'before');
          } else {
            const validPosition = position === 'before' || position === 'after' ? position : 'before';
            repositionItem('local', draggedItem.id, targetId, validPosition);
          }
          return;
        }
      }
    }

    // Fallback to old logic for backward compatibility
    console.log('Using fallback logic for overId:', overId);
    const sourceGroup = localItems.find(item => 
      item.type === 'group' && item.items?.includes(draggedItem.id)
    );

    // Doc ref restriction: Cannot move linked items out of linked groups
    if (draggedItem.sourceId && sourceGroup?.sourceId) {
      if (!overId.startsWith('group-') || 
          overId.replace('group-', '') !== sourceGroup.id) {
        return;
      }
    }

    if (overId.startsWith('group-')) {
      const groupId = overId.replace('group-', '');
      const targetGroup = getItemById(groupId, 'local');
      
      if (targetGroup && targetGroup.type === 'group' && draggedItem.type === 'entity') {
        if (sourceGroup?.id === groupId) return;
        
        if (draggedItem.sourceId && targetGroup.sourceId && sourceGroup?.id !== groupId) {
          return;
        }
        
        if (sourceGroup) {
          removeItemFromGroup('local', draggedItem.id, sourceGroup.id);
        }
        addItemToGroup('local', draggedItem.id, groupId);
        return;
      }
    } else {
      if (sourceGroup && draggedItem.type === 'entity') {
        if (draggedItem.sourceId && sourceGroup.sourceId) {
          return;
        }
        
        removeItemFromGroup('local', draggedItem.id, sourceGroup.id);
        return;
      }
    }

    // Normal reordering for items without precise drop zones
    const activeIndex = localItems.findIndex(item => item.id === String(active.id));
    const overIndex = localItems.findIndex(item => item.id === String(over.id));

    if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
      reorderItems('local', activeIndex, overIndex);
    }
  };

  const topLevelItems = localItems.filter(item => 
    !localItems.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
  );

  return (
    <div className="h-full bg-white border-r border-panel">
      {/* Panel Header */}
      <div className="p-4 border-b border-panel">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Local File</h2>
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
              disabled={groupCount >= 10 || selectedLocalItems.length === 0}
              className="text-xs"
            >
              <Layers className="w-3 h-3 mr-1" />
              Create Group
            </Button>
          </div>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-4">
          <span>Entities: {entityCount}/10 • Groups: {groupCount}/10</span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 ref-tag rounded-full"></span>
            <span className="text-xs">Link</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 h-full overflow-y-auto">


        <SortableContext items={topLevelItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div 
              className={`min-h-32 ${
                dragState.isDragging && dragState.sourcePanel === 'local' 
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
                      panel="local"
                      allItems={localItems}
                    />
                  ) : (
                    <FileItem
                      item={item}
                      panel="local"
                      isSelected={selectedLocalItems.includes(item.id)}
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
            <p className="text-sm">Pull items from CDM or add local items</p>
          </div>
        )}
      </div>
    </div>
  );
}
