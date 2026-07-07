import { useDocRefStore } from "./store/useDocRefStore";
import { AdminRulesPanel } from "./components/AdminRulesPanel";
import { CDMFilePanel } from "./components/CDMFilePanel";
import { LocalFilePanel } from "./components/LocalFilePanel";
import { DocRefInspector } from "./components/DocRefInspector";
import { ContextMenu } from "./components/ContextMenu";
import { Button } from "./components/ui/button";
import { Download, Upload } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { FileItem } from "./components/FileItem";
import { GroupItem } from "./components/GroupItem";
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels";

function App() {
  const { 
    exportState, 
    importState, 
    saveState, 
    clearSelection,
    dragState,
    startDrag,
    endDrag,
    getItemById,
    cdmItems,
    localItems,
    reorderItems,
    addItemToGroup,
    removeItemFromGroup,
    repositionItem,
    pullFromCDM
  } = useDocRefStore();

  const [isAdminPanelCollapsed, setIsAdminPanelCollapsed] = useState(false);
  const adminPanelRef = useRef<ImperativePanelHandle>(null);

  const toggleAdminPanel = () => {
    if (adminPanelRef.current) {
      if (isAdminPanelCollapsed) {
        // Expand to 15%
        adminPanelRef.current.resize(15);
      } else {
        // Collapse to 3%
        adminPanelRef.current.resize(3);
      }
      setIsAdminPanelCollapsed(!isAdminPanelCollapsed);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Custom collision detection that prioritizes drop zones
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    const dropZoneCollisions = pointerCollisions.filter(collision => 
      String(collision.id).startsWith('dropzone-')
    );
    
    if (dropZoneCollisions.length > 0) {
      return dropZoneCollisions;
    }
    
    return rectIntersection(args);
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const activeId = String(active.id);
    
    // Determine source panel and drag type
    const cdmItem = getItemById(activeId, 'cdm');
    const localItem = getItemById(activeId, 'local');
    
    if (cdmItem) {
      const dragType = cdmItem.type === 'group' ? 'group' : 'item';
      startDrag(activeId, dragType, 'cdm');
    } else if (localItem) {
      const dragType = localItem.type === 'group' ? 'group' : 'item';
      startDrag(activeId, dragType, 'local');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    endDrag();

    if (!over) return;

    const draggedId = String(active.id);
    const overId = String(over.id);
    
    console.log('App-level drag end:', { draggedId, overId });

    // Determine if this is a cross-panel drag or intra-panel drag
    const draggedCdmItem = getItemById(draggedId, 'cdm');
    const draggedLocalItem = getItemById(draggedId, 'local');
    const targetCdmItem = getItemById(overId, 'cdm');
    const targetLocalItem = getItemById(overId, 'local');
    
    // Cross-panel detection: dragging from CDM to something that exists in Local panel (or vice versa)
    // For drop zones, check if the target item exists in the opposite panel
    let isDropZoneInLocalPanel = false;
    let isDropZoneInCdmPanel = false;
    
    if (overId.startsWith('dropzone-')) {
      const parts = overId.split('-');
      const groupIndex = parts.findIndex(part => part === 'group');
      let dropZoneTargetId;
      
      if (groupIndex !== -1) {
        dropZoneTargetId = parts.slice(groupIndex + 1).join('-'); // This is the group ID
      } else {
        dropZoneTargetId = parts.slice(2).join('-'); // This is the target item ID
      }
      
      isDropZoneInLocalPanel = !!getItemById(dropZoneTargetId, 'local');
      isDropZoneInCdmPanel = !!getItemById(dropZoneTargetId, 'cdm');
    }
    
    const isCrossPanelDrag = (draggedCdmItem && (targetLocalItem || isDropZoneInLocalPanel)) || 
                             (draggedLocalItem && (targetCdmItem || isDropZoneInCdmPanel));

    console.log('Drag analysis:', { 
      draggedId, 
      overId, 
      sourcePanel: dragState.sourcePanel, 
      draggedCdmItem: !!draggedCdmItem, 
      draggedLocalItem: !!draggedLocalItem,
      targetCdmItem: !!targetCdmItem,
      targetLocalItem: !!targetLocalItem,
      isDropZoneInLocalPanel,
      isCrossPanelDrag 
    });

    // Handle cross-panel drag from CDM to Local
    if (dragState.sourcePanel === 'cdm' && isCrossPanelDrag) {
      const draggedItem = getItemById(draggedId, 'cdm');
      if (!draggedItem) return;

      // Check if dropping on a precise drop zone in local panel
      if (overId.startsWith('dropzone-')) {
        // Parse dropzone ID: dropzone-{position}-{targetId}-group-{groupId} OR dropzone-{position}-{targetId}
        const parts = overId.split('-');
        
        // Handle compound positions like "inside-start" and "inside-end"
        let position = parts[1];
        let startIndex = 2; // Where target ID starts
        
        if (parts[2] === 'start' || parts[2] === 'end') {
          position = `${parts[1]}-${parts[2]}`;
          startIndex = 3;
        }
        
        // Find where 'group' appears to split target ID from group ID
        const groupIndex = parts.findIndex(part => part === 'group');
        let targetId, isGroupDrop, groupId;
        
        if (groupIndex !== -1) {
          // This is a group drop zone
          targetId = parts.slice(startIndex, groupIndex).join('-');
          isGroupDrop = true;
          groupId = parts.slice(groupIndex + 1).join('-');
        } else {
          // This is a top-level drop zone
          targetId = parts.slice(startIndex).join('-');
          isGroupDrop = false;
          groupId = null;
        }
        
        console.log('Cross-panel drop zone detected:', { position, targetId, isGroupDrop, groupId });

        // Pull from CDM to Local first
        pullFromCDM([draggedId]);
        
        // If dropping into a group, handle precise positioning
        if (isGroupDrop && groupId) {
          setTimeout(() => {
            const targetGroup = getItemById(groupId, 'local');
            if (targetGroup && targetGroup.type === 'group') {
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
              
              // Get the new local item ID (it will be different from CDM ID)
              const newLocalItems = useDocRefStore.getState().localItems;
              const newLocalItem = newLocalItems.find(item => item.sourceId === draggedId);
              
              if (newLocalItem) {
                const newGroupItems = [...groupItems];
                newGroupItems.splice(insertIndex, 0, newLocalItem.id);
                
                // Update the group directly
                useDocRefStore.setState(state => ({
                  localItems: state.localItems.map(item =>
                    item.id === groupId
                      ? { 
                          ...item, 
                          items: newGroupItems, 
                          localOrder: newGroupItems,
                          isModified: item.sourceId ? true : item.isModified,
                          lastUpdated: Date.now() 
                        }
                      : item
                  )
                }));
              }
            }
          }, 100); // Small delay to ensure pull operation completes
        }
        return;
      }
      
      // Regular cross-panel drag (not to a drop zone)
      pullFromCDM([draggedId]);
      return;
    }

    // Handle intra-panel drags (within same panel)
    if (dragState.sourcePanel === 'cdm' && !isCrossPanelDrag) {
      console.log('Handling CDM intra-panel drag');
      
      // Check if dropping on a drop zone within the same panel
      if (overId.startsWith('dropzone-')) {
        const parts = overId.split('-');
        
        // Handle compound positions like "inside-start" and "inside-end"
        let position = parts[1];
        let startIndex = 2; // Where target ID starts
        
        if (parts[2] === 'start' || parts[2] === 'end') {
          position = `${parts[1]}-${parts[2]}`;
          startIndex = 3;
        }
        
        // Find where 'group' appears to split target ID from group ID
        const groupIndex = parts.findIndex(part => part === 'group');
        let targetId, isGroupDrop, groupId;
        
        if (groupIndex !== -1) {
          targetId = parts.slice(startIndex, groupIndex).join('-');
          isGroupDrop = true;
          groupId = parts.slice(groupIndex + 1).join('-');
        } else {
          targetId = parts.slice(startIndex).join('-');
          isGroupDrop = false;
          groupId = null;
        }
        
        console.log('CDM drop zone detected:', { position, targetId, isGroupDrop, groupId });
        
        const draggedItem = getItemById(draggedId, 'cdm');
        if (!draggedItem) return;
        
        // Use the new repositionItem method for all positioning
        if (isGroupDrop && groupId) {
          // Handle special group positions
          if (position === 'inside-start') {
            // Position at the beginning of the group
            const group = getItemById(groupId, 'cdm');
            const firstChildId = group?.items?.[0];
            if (firstChildId) {
              repositionItem('cdm', draggedId, firstChildId, 'before', groupId);
            } else {
              repositionItem('cdm', draggedId, groupId, 'inside', groupId);
            }
          } else if (position === 'inside-end') {
            // Position at the end of the group
            repositionItem('cdm', draggedId, groupId, 'inside', groupId);
          } else {
            // For regular before/after positions within groups
            repositionItem('cdm', draggedId, targetId, position as 'before' | 'after', groupId);
          }
        } else {
          // Handle special "start" target for positioning at beginning of list
          if (targetId === 'start' && position === 'before') {
            // Position at the beginning of the top-level list
            const topLevelItems = cdmItems.filter(item => 
              !cdmItems.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
            );
            if (topLevelItems.length > 0) {
              repositionItem('cdm', draggedId, topLevelItems[0].id, 'before');
            } else {
              // If no items, the item is already at the top level, no movement needed
              console.log('Item is already at the top level position');
            }
          } else {
            repositionItem('cdm', draggedId, targetId, position as 'before' | 'after');
          }
        }
        return;
      }
      
      // Fallback: simple item-to-item reordering
      const activeIndex = cdmItems.findIndex(item => item.id === draggedId);
      const overIndex = cdmItems.findIndex(item => item.id === overId);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        reorderItems('cdm', activeIndex, overIndex);
      }
      return;
    }

    if (dragState.sourcePanel === 'local' && !isCrossPanelDrag) {
      console.log('Handling Local intra-panel drag');
      
      // Check if dropping on a drop zone within the same panel
      if (overId.startsWith('dropzone-')) {
        const parts = overId.split('-');
        
        // Handle compound positions like "inside-start" and "inside-end"
        let position = parts[1];
        let startIndex = 2; // Where target ID starts
        
        if (parts[2] === 'start' || parts[2] === 'end') {
          position = `${parts[1]}-${parts[2]}`;
          startIndex = 3;
        }
        
        // Find where 'group' appears to split target ID from group ID
        const groupIndex = parts.findIndex(part => part === 'group');
        let targetId, isGroupDrop, groupId;
        
        if (groupIndex !== -1) {
          targetId = parts.slice(startIndex, groupIndex).join('-');
          isGroupDrop = true;
          groupId = parts.slice(groupIndex + 1).join('-');
        } else {
          targetId = parts.slice(startIndex).join('-');
          isGroupDrop = false;
          groupId = null;
        }
        
        console.log('Local drop zone detected:', { position, targetId, isGroupDrop, groupId });
        
        const draggedItem = getItemById(draggedId, 'local');
        if (!draggedItem) return;
        
        // Use the new repositionItem method for all positioning
        if (isGroupDrop && groupId) {
          // Handle special group positions
          if (position === 'inside-start') {
            // Position at the beginning of the group
            const group = getItemById(groupId, 'local');
            const firstChildId = group?.items?.[0];
            if (firstChildId) {
              repositionItem('local', draggedId, firstChildId, 'before', groupId);
            } else {
              repositionItem('local', draggedId, groupId, 'inside', groupId);
            }
          } else if (position === 'inside-end') {
            // Position at the end of the group
            repositionItem('local', draggedId, groupId, 'inside', groupId);
          } else {
            // For regular before/after positions within groups
            repositionItem('local', draggedId, targetId, position as 'before' | 'after', groupId);
          }
        } else {
          // Handle special "start" target for positioning at beginning of list
          if (targetId === 'start' && position === 'before') {
            // Position at the beginning of the top-level list
            const topLevelItems = localItems.filter(item => 
              !localItems.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
            );
            if (topLevelItems.length > 0) {
              repositionItem('local', draggedId, topLevelItems[0].id, 'before');
            } else {
              // If no items, the item is already at the top level, no movement needed
              console.log('Item is already at the top level position');
            }
          } else {
            repositionItem('local', draggedId, targetId, position as 'before' | 'after');
          }
        }
        return;
      }
      
      // Fallback: simple item-to-item reordering
      const activeIndex = localItems.findIndex(item => item.id === draggedId);
      const overIndex = localItems.findIndex(item => item.id === overId);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        reorderItems('local', activeIndex, overIndex);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click is on an item, button, or inside a context menu
      if (target.closest('[data-item-id]') || 
          target.closest('button') || 
          target.closest('[role="dialog"]') ||
          target.closest('.context-menu') ||
          target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
      
      // Clear all selections if clicking outside
      clearSelection();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSelection]);

  const handleSave = () => {
    const name = prompt("Enter save name:");
    if (name) {
      saveState(name);
      
      // Also download as JSON
      const stateJson = exportState();
      const blob = new Blob([stateJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          importState(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Linked Files Prototype
          </h1>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleSave}
              className="text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Save State
            </Button>
            <Button 
              onClick={handleLoad}
              className="text-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Load State
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <DndContext 
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1">
          <PanelGroup direction="horizontal">
            {/* Admin Rules Panel - Collapsible */}
            <Panel 
              ref={adminPanelRef}
              defaultSize={15}
              minSize={3}
              maxSize={25}
              collapsible={true}
            >
              <AdminRulesPanel 
                isCollapsed={isAdminPanelCollapsed}
                onToggleCollapse={toggleAdminPanel}
              />
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors" />

            {/* CDM File Panel */}
            <Panel defaultSize={30} minSize={20}>
              <CDMFilePanel />
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors" />

            {/* Local File Panel */}
            <Panel defaultSize={30} minSize={20}>
              <LocalFilePanel />
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors" />

            {/* Doc Ref Inspector Panel */}
            <Panel defaultSize={25} minSize={15} maxSize={40}>
              <div className="h-full bg-white">
                <DocRefInspector />
              </div>
            </Panel>
          </PanelGroup>
        </div>

        <DragOverlay>
          {dragState.isDragging && dragState.draggedId && (
            dragState.draggedType === 'group' ? (
              <div className="opacity-50">
                <GroupItem
                  item={getItemById(dragState.draggedId, dragState.sourcePanel || 'cdm')!}
                  panel={dragState.sourcePanel || 'cdm'}
                  allItems={dragState.sourcePanel === 'cdm' ? cdmItems : localItems}
                />
              </div>
            ) : (
              <div className="opacity-50">
                <FileItem
                  item={getItemById(dragState.draggedId, dragState.sourcePanel || 'cdm')!}
                  panel={dragState.sourcePanel || 'cdm'}
                  isSelected={false}
                />
              </div>
            )
          )}
        </DragOverlay>
      </DndContext>

      {/* Context Menu */}
      <ContextMenu />
    </div>
  );
}

export default App;
