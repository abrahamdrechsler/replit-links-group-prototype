import { create } from 'zustand';
import { DocRefItem, AdminRules, SavedState, ContextMenuState, DragState } from '../types';

interface DocRefStore {
  // Core data
  cdmItems: DocRefItem[];
  localItems: DocRefItem[];
  adminRules: AdminRules;
  
  // UI state
  selectedCdmItems: string[];
  selectedLocalItems: string[];
  selectedInspectorItems: string[];
  contextMenu: ContextMenuState;
  dragState: DragState;
  
  // Save/load state
  recentSaves: SavedState[];
  
  // Actions
  addEntity: (panel: 'cdm' | 'local', name?: string) => void;
  deleteItem: (panel: 'cdm' | 'local', id: string) => void;
  renameItem: (panel: 'cdm' | 'local', id: string, newName: string) => void;
  createGroup: (panel: 'cdm' | 'local', itemIds: string[], groupName?: string) => void;
  ungroupItems: (panel: 'cdm' | 'local', groupId: string) => void;
  addItemToGroup: (panel: 'cdm' | 'local', itemId: string, groupId: string) => void;
  removeItemFromGroup: (panel: 'cdm' | 'local', itemId: string, groupId: string) => void;
  reorderItems: (panel: 'cdm' | 'local', fromIndex: number, toIndex: number, parentId?: string) => void;
  repositionItem: (panel: 'cdm' | 'local', itemId: string, targetId: string, position: 'before' | 'after' | 'inside', groupId?: string) => void;
  moveItemUp: (panel: 'cdm' | 'local', itemId: string) => void;
  moveItemDown: (panel: 'cdm' | 'local', itemId: string) => void;
  
  // Document reference operations
  pullFromCDM: (cdmItemIds: string[]) => void;
  refreshFromCDM: () => void;
  handleDeletedItem: (itemId: string, action: 'make-local' | 'delete') => void;
  
  // Selection management
  setSelectedItems: (panel: 'cdm' | 'local' | 'inspector', itemIds: string[]) => void;
  toggleItemSelection: (panel: 'cdm' | 'local' | 'inspector', itemId: string) => void;
  clearSelection: (panel?: 'cdm' | 'local' | 'inspector') => void;
  
  // Context menu
  showContextMenu: (x: number, y: number, targetId: string, selectedIds: string[]) => void;
  hideContextMenu: () => void;
  
  // Drag and drop
  startDrag: (itemId: string, type: 'item' | 'group', sourcePanel: 'cdm' | 'local') => void;
  endDrag: () => void;
  setDropTarget: (id: string | null, type: 'before' | 'after' | 'inside' | null) => void;
  
  // Admin rules
  updateAdminRules: (rules: Partial<AdminRules>) => void;
  
  // Save/load
  saveState: (name: string) => void;
  loadState: (state: SavedState) => void;
  exportState: () => string;
  importState: (jsonData: string) => void;
  
  // Utility functions
  getItemById: (id: string, panel?: 'cdm' | 'local') => DocRefItem | undefined;
  getUpdateStatus: (localItem: DocRefItem) => 'linked' | 'modified' | 'update-available' | 'local-only';
  hasUpdatesAvailable: () => boolean;
  generateId: () => string;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useDocRefStore = create<DocRefStore>((set, get) => ({
  // Initial state
  cdmItems: [
    {
      id: 'cdm-settings-a',
      name: 'A',
      type: 'entity',
      isLocal: false,
      lastUpdated: Date.now(),
    },
    {
      id: 'cdm-settings-b',
      name: 'B',
      type: 'entity',
      isLocal: false,
      lastUpdated: Date.now(),
    },
    {
      id: 'cdm-settings-c',
      name: 'C',
      type: 'entity',
      isLocal: false,
      lastUpdated: Date.now(),
    },
    {
      id: 'cdm-settings-d',
      name: 'D',
      type: 'entity',
      isLocal: false,
      lastUpdated: Date.now(),
    },
    {
      id: 'cdm-settings-e',
      name: 'E',
      type: 'entity',
      isLocal: false,
      lastUpdated: Date.now(),
    },
    {
      id: 'cdm-settings-f',
      name: 'F',
      type: 'entity',
      isLocal: false,
      lastUpdated: Date.now(),
    },
    {
      id: 'cdm-settings-g',
      name: 'G',
      type: 'entity',
      isLocal: false,
      lastUpdated: Date.now(),
    },
  ],
  localItems: [
    {
      id: 'local-settings-z',
      name: 'Z',
      type: 'entity',
      isLocal: true,
      lastUpdated: Date.now(),
    },
    {
      id: 'local-settings-x',
      name: 'X',
      type: 'entity',
      isLocal: true,
      lastUpdated: Date.now(),
    },
    {
      id: 'local-settings-y',
      name: 'Y',
      type: 'entity',
      isLocal: true,
      lastUpdated: Date.now(),
    },
  ],
  adminRules: {
    allowReordering: true,
    allowDeletion: false,
    allowAddingLocal: false,
    allowReorderingWithinLinkedGroups: true,
    replaceModifiedGroups: false,
  },
  selectedCdmItems: [],
  selectedLocalItems: [],
  selectedInspectorItems: [],
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
    selectedIds: [],
  },
  dragState: {
    isDragging: false,
    draggedId: null,
    draggedType: null,
    sourcePanel: null,
    dropTargetId: null,
    dropPosition: null,
  },
  recentSaves: [],
  
  // Actions
  addEntity: (panel: 'cdm' | 'local', name?: string) => {
    const id = generateId();
    const newItem: DocRefItem = {
      id,
      name: name || `Entity ${Date.now()}`,
      type: 'entity',
      isLocal: panel === 'local',
      lastUpdated: Date.now(),
    };
    
    set(state => ({
      [`${panel}Items`]: [...state[`${panel}Items` as keyof typeof state] as DocRefItem[], newItem],
    }));
  },
  
  deleteItem: (panel, id) => {
    const { adminRules } = get();
    const items = panel === 'cdm' ? get().cdmItems : get().localItems;
    const item = items.find(i => i.id === id);
    
    if (!item) return;
    
    // Check admin rules for referenced items
    // Linked groups can always be deleted from Local panel (only removes local reference)
    if (panel === 'local' && item.sourceId && item.type !== 'group' && !adminRules.allowDeletion) {
      return; // Not allowed by admin rules
    }
    
    // Note: When deleting from CDM, we no longer automatically convert linked items
    // They will remain as references until explicitly refreshed
    
    // Remove the item and handle cascading deletion for groups
    set(state => {
      const items = panel === 'cdm' ? state.cdmItems : state.localItems;
      let itemsToDelete = [id];
      
      // If deleting a group, also delete all its child items
      if (item.type === 'group' && item.items) {
        itemsToDelete = [id, ...item.items];
      }
      
      // Remove all items to be deleted
      const filteredItems = items.filter((i: DocRefItem) => !itemsToDelete.includes(i.id));
      
      // Update any remaining groups that might have contained the deleted items
      const updatedItems = filteredItems.map((i: DocRefItem) => {
        if (i.type === 'group' && i.items?.some(itemId => itemsToDelete.includes(itemId))) {
          return {
            ...i,
            items: i.items.filter(itemId => !itemsToDelete.includes(itemId)),
            isModified: panel === 'local' && i.sourceId ? true : i.isModified,
          };
        }
        return i;
      });
      
      return panel === 'cdm' 
        ? { cdmItems: updatedItems }
        : { localItems: updatedItems };
    });
  },
  
  renameItem: (panel, id, newName) => {
    set(state => {
      const items = panel === 'cdm' ? state.cdmItems : state.localItems;
      const updatedItems = items.map((item: DocRefItem) =>
        item.id === id 
          ? { 
              ...item, 
              name: newName,
              isModified: panel === 'local' && item.sourceId ? true : item.isModified,
              lastUpdated: Date.now(),
            }
          : item
      );
      
      return panel === 'cdm' 
        ? { cdmItems: updatedItems }
        : { localItems: updatedItems };
    });
  },
  
  createGroup: (panel, itemIds, groupName) => {
    if (itemIds.length === 0) return;
    
    const id = generateId();
    const newGroup: DocRefItem = {
      id,
      name: groupName || `Group ${Date.now()}`,
      type: 'group',
      isLocal: panel === 'local',
      items: itemIds,
      lastUpdated: Date.now(),
    };
    
    set(state => {
      const items = state[`${panel}Items`] as DocRefItem[];
      
      // Find the position of the topmost selected item
      let insertIndex = items.length; // Default to end if no items found
      for (let i = 0; i < items.length; i++) {
        if (itemIds.includes(items[i].id)) {
          insertIndex = i;
          break;
        }
      }
      
      // Insert the group at the position of the topmost selected item
      const newItems = [...items];
      newItems.splice(insertIndex, 0, newGroup);
      
      return {
        [`${panel}Items`]: newItems,
      };
    });
  },
  
  ungroupItems: (panel, groupId) => {
    set(state => {
      const items = panel === 'cdm' ? state.cdmItems : state.localItems;
      const filteredItems = items.filter((item: DocRefItem) => item.id !== groupId);
      
      return panel === 'cdm' 
        ? { cdmItems: filteredItems }
        : { localItems: filteredItems };
    });
  },

  addItemToGroup: (panel, itemId, groupId) => {
    set(state => {
      const items = panel === 'cdm' ? state.cdmItems : state.localItems;
      
      // Check admin rule: prevent adding local items to linked groups
      const targetGroup = items.find(item => item.id === groupId);
      const draggedItem = items.find(item => item.id === itemId);
      const { adminRules } = state;
      
      if (panel === 'local' && 
          targetGroup?.sourceId && // target group is linked
          draggedItem && !draggedItem.sourceId && // dragged item is local-only
          !adminRules.allowAddingLocal) {
        console.log('Admin rule violation: Cannot add local items to linked\'d groups');
        return state; // Prevent the operation
      }
      
      const updatedItems = items.map(item => {
        if (item.id === groupId && item.type === 'group') {
          return {
            ...item,
            items: [...(item.items || []), itemId]
          };
        }
        return item;
      });
      
      return panel === 'cdm' 
        ? { cdmItems: updatedItems }
        : { localItems: updatedItems };
    });
  },

  removeItemFromGroup: (panel, itemId, groupId) => {
    set(state => {
      const items = panel === 'cdm' ? state.cdmItems : state.localItems;
      const updatedItems = items.map(item => {
        if (item.id === groupId && item.type === 'group') {
          return {
            ...item,
            items: (item.items || []).filter(id => id !== itemId),
            isModified: panel === 'local' && item.sourceId ? true : item.isModified,
          };
        }
        return item;
      });
      
      return panel === 'cdm' 
        ? { cdmItems: updatedItems }
        : { localItems: updatedItems };
    });
  },

  moveItemUp: (panel, itemId) => {
    set(state => {
      const items = panel === 'cdm' ? state.cdmItems : state.localItems;
      
      // Find the item and its current context (group or top-level)
      const targetItem = items.find(item => item.id === itemId);
      if (!targetItem) return state;
      
      // Handle group movement (groups are always at top level)
      if (targetItem.type === 'group') {
        // Get all top-level items (not in any group)
        const topLevelItems = items.filter(item => 
          !items.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
        );
        
        const topLevelIndex = topLevelItems.findIndex(item => item.id === itemId);
        if (topLevelIndex === 0) return state; // Already at visual top
        
        const visualPrevItem = topLevelItems[topLevelIndex - 1];
        
        // Swap with visual previous item
        const currentItemIndex = items.findIndex(item => item.id === itemId);
        const prevItemIndex = items.findIndex(item => item.id === visualPrevItem.id);
        
        const newItems = [...items];
        newItems[currentItemIndex] = newItems[prevItemIndex];
        newItems[prevItemIndex] = targetItem;
        
        return panel === 'cdm' 
          ? { cdmItems: newItems }
          : { localItems: newItems };
      }
      
      // Handle entity movement (existing logic)
      if (targetItem.type !== 'entity') return state;
      
      // Check if item is in a group
      const parentGroup = items.find(item => 
        item.type === 'group' && item.items?.includes(itemId)
      );
      
      if (parentGroup) {
        // Item is in a group - move within group or exit to top
        const groupItems = parentGroup.items || [];
        const itemIndex = groupItems.indexOf(itemId);
        
        if (itemIndex === 0) {
          // First item in group - exit group and place above it
          
          // Doc ref restriction: Cannot move linked items out of linked groups
          if (panel === 'local' && targetItem.sourceId && parentGroup.sourceId) {
            return state; // Prevent movement
          }
          
          const groupIndex = items.findIndex(item => item.id === parentGroup.id);
          if (groupIndex === 0) return state; // Group is at top, can't move up
          
          // Remove the item from the group
          const updatedGroup = {
            ...parentGroup,
            items: groupItems.filter(id => id !== itemId)
          };
          
          // Find the target item's current position in the top-level array
          const itemIndex = items.findIndex(item => item.id === itemId);
          const newItems = [...items];
          
          // Update the group
          newItems[groupIndex] = updatedGroup;
          
          // Move the item to position before the group
          if (itemIndex !== -1) {
            const [movedItem] = newItems.splice(itemIndex, 1);
            const newGroupIndex = newItems.findIndex(item => item.id === parentGroup.id);
            newItems.splice(newGroupIndex, 0, movedItem);
          }
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        } else {
          // Move up within group
          
          // Check admin rules for reordering within linked groups
          const { adminRules } = get();
          if (panel === 'local' && parentGroup.sourceId && !adminRules.allowReorderingWithinLinkedGroups) {
            return state; // Prevent movement
          }
          
          const newGroupItems = [...groupItems];
          newGroupItems[itemIndex] = newGroupItems[itemIndex - 1];
          newGroupItems[itemIndex - 1] = itemId;
          
          const updatedGroup = { ...parentGroup, items: newGroupItems };
          const newItems = items.map(item => 
            item.id === parentGroup.id ? updatedGroup : item
          );
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        }
      } else {
        // Item is at top level - find the visual previous position
        
        // Get all top-level items (not in any group)
        const topLevelItems = items.filter(item => 
          !items.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
        );
        
        const topLevelIndex = topLevelItems.findIndex(item => item.id === itemId);
        if (topLevelIndex === 0) return state; // Already at visual top
        
        const visualPrevItem = topLevelItems[topLevelIndex - 1];
        
        if (visualPrevItem.type === 'group') {
          // Previous item is a group - check if we can enter it
          
          // Admin rule checks
          const { adminRules } = get();
          
          // Doc ref restriction: Cannot move linked items into linked groups
          if (panel === 'local' && targetItem.sourceId && visualPrevItem.sourceId) {
            return state; // Prevent movement
          }
          
          // Admin rule: Cannot add local items to linked groups
          if (panel === 'local' && 
              !targetItem.sourceId && // item is local-only
              visualPrevItem.sourceId && // group is linked
              !adminRules.allowAddingLocal) {
            // Bypass the group - move to position before the group instead
            const currentItemIndex = items.findIndex(item => item.id === itemId);
            const groupIndex = items.findIndex(item => item.id === visualPrevItem.id);
            
            if (currentItemIndex !== -1 && groupIndex !== -1) {
              const newItems = [...items];
              const [movedItem] = newItems.splice(currentItemIndex, 1);
              
              // Insert before the group (adjust index since we removed an item)
              const adjustedGroupIndex = groupIndex > currentItemIndex ? groupIndex - 1 : groupIndex;
              newItems.splice(adjustedGroupIndex, 0, movedItem);
              
              return panel === 'cdm' 
                ? { cdmItems: newItems }
                : { localItems: newItems };
            }
            return state;
          }
          
          const updatedGroup = {
            ...visualPrevItem,
            items: [...(visualPrevItem.items || []), itemId]
          };
          
          const newItems = items.map(item => 
            item.id === visualPrevItem.id ? updatedGroup : item
          );
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        } else {
          // Normal swap with visual previous item
          const currentItemIndex = items.findIndex(item => item.id === itemId);
          const prevItemIndex = items.findIndex(item => item.id === visualPrevItem.id);
          
          const newItems = [...items];
          newItems[currentItemIndex] = newItems[prevItemIndex];
          newItems[prevItemIndex] = targetItem;
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        }
      }
    });
  },

  moveItemDown: (panel, itemId) => {
    set(state => {
      const items = panel === 'cdm' ? state.cdmItems : state.localItems;
      
      // Find the item and its current context
      const targetItem = items.find(item => item.id === itemId);
      if (!targetItem) return state;
      
      // Handle group movement (groups are always at top level)
      if (targetItem.type === 'group') {
        // Get all top-level items (not in any group)
        const topLevelItems = items.filter(item => 
          !items.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
        );
        
        const topLevelIndex = topLevelItems.findIndex(item => item.id === itemId);
        if (topLevelIndex === topLevelItems.length - 1) return state; // Already at visual bottom
        
        const visualNextItem = topLevelItems[topLevelIndex + 1];
        
        // Swap with visual next item
        const currentItemIndex = items.findIndex(item => item.id === itemId);
        const nextItemIndex = items.findIndex(item => item.id === visualNextItem.id);
        
        const newItems = [...items];
        newItems[currentItemIndex] = newItems[nextItemIndex];
        newItems[nextItemIndex] = targetItem;
        
        return panel === 'cdm' 
          ? { cdmItems: newItems }
          : { localItems: newItems };
      }
      
      // Handle entity movement (existing logic)
      if (targetItem.type !== 'entity') return state;
      
      // Check if item is in a group
      const parentGroup = items.find(item => 
        item.type === 'group' && item.items?.includes(itemId)
      );
      
      if (parentGroup) {
        // Item is in a group
        const groupItems = parentGroup.items || [];
        const itemIndex = groupItems.indexOf(itemId);
        
        if (itemIndex === groupItems.length - 1) {
          // Last item in group - exit group and place below it
          
          // Doc ref restriction: Cannot move linked items out of linked groups
          if (panel === 'local' && targetItem.sourceId && parentGroup.sourceId) {
            return state; // Prevent movement
          }
          
          const groupIndex = items.findIndex(item => item.id === parentGroup.id);
          if (groupIndex === items.length - 1) return state; // Group is at bottom
          
          // Remove the item from the group
          const updatedGroup = {
            ...parentGroup,
            items: groupItems.filter(id => id !== itemId)
          };
          
          // Find the target item's current position in the top-level array
          const itemIndex = items.findIndex(item => item.id === itemId);
          const newItems = [...items];
          
          // Update the group
          newItems[groupIndex] = updatedGroup;
          
          // Move the item to position after the group
          if (itemIndex !== -1) {
            const [movedItem] = newItems.splice(itemIndex, 1);
            const newGroupIndex = newItems.findIndex(item => item.id === parentGroup.id);
            newItems.splice(newGroupIndex + 1, 0, movedItem);
          }
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        } else {
          // Move down within group
          
          // Check admin rules for reordering within linked groups
          const { adminRules } = get();
          if (panel === 'local' && parentGroup.sourceId && !adminRules.allowReorderingWithinLinkedGroups) {
            return state; // Prevent movement
          }
          
          const newGroupItems = [...groupItems];
          newGroupItems[itemIndex] = newGroupItems[itemIndex + 1];
          newGroupItems[itemIndex + 1] = itemId;
          
          const updatedGroup = { ...parentGroup, items: newGroupItems };
          const newItems = items.map(item => 
            item.id === parentGroup.id ? updatedGroup : item
          );
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        }
      } else {
        // Item is at top level - find the visual next position
        
        // Get all top-level items (not in any group)
        const topLevelItems = items.filter(item => 
          !items.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
        );
        
        const topLevelIndex = topLevelItems.findIndex(item => item.id === itemId);
        if (topLevelIndex === topLevelItems.length - 1) return state; // Already at visual bottom
        
        const visualNextItem = topLevelItems[topLevelIndex + 1];
        
        if (visualNextItem.type === 'group') {
          // Next item is a group - check if we can enter it
          
          // Admin rule checks
          const { adminRules } = get();
          
          // Doc ref restriction: Cannot move linked items into linked groups
          if (panel === 'local' && targetItem.sourceId && visualNextItem.sourceId) {
            return state; // Prevent movement
          }
          
          // Admin rule: Cannot add local items to linked groups
          if (panel === 'local' && 
              !targetItem.sourceId && // item is local-only
              visualNextItem.sourceId && // group is linked
              !adminRules.allowAddingLocal) {
            // Bypass the group - move to position after the group instead
            const currentItemIndex = items.findIndex(item => item.id === itemId);
            const groupIndex = items.findIndex(item => item.id === visualNextItem.id);
            
            if (currentItemIndex !== -1 && groupIndex !== -1) {
              const newItems = [...items];
              const [movedItem] = newItems.splice(currentItemIndex, 1);
              
              // Insert after the group (adjust index since we removed an item)
              const adjustedGroupIndex = groupIndex > currentItemIndex ? groupIndex - 1 : groupIndex;
              newItems.splice(adjustedGroupIndex + 1, 0, movedItem);
              
              return panel === 'cdm' 
                ? { cdmItems: newItems }
                : { localItems: newItems };
            }
            return state;
          }
          
          const updatedGroup = {
            ...visualNextItem,
            items: [itemId, ...(visualNextItem.items || [])]
          };
          
          const newItems = items.map(item => 
            item.id === visualNextItem.id ? updatedGroup : item
          );
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        } else {
          // Normal swap with visual next item
          const currentItemIndex = items.findIndex(item => item.id === itemId);
          const nextItemIndex = items.findIndex(item => item.id === visualNextItem.id);
          
          const newItems = [...items];
          newItems[currentItemIndex] = newItems[nextItemIndex];
          newItems[nextItemIndex] = targetItem;
          
          return panel === 'cdm' 
            ? { cdmItems: newItems }
            : { localItems: newItems };
        }
      }
    });
  },
  
  reorderItems: (panel, fromIndex, toIndex, parentId) => {
    const { adminRules } = get();
    
    set(state => {
      const items = [...state[`${panel}Items` as keyof typeof state] as DocRefItem[]];
      
      if (parentId) {
        // Reordering within a group
        const group = items.find(i => i.id === parentId);
        if (!group || group.type !== 'group') return state;
        
        // Check admin rules for referenced groups
        if (panel === 'local' && group.sourceId && !adminRules.allowReorderingWithinLinkedGroups) {
          return state;
        }
        
        const newItems = [...(group.items || [])];
        const [moved] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, moved);
        
        const updatedItems = items.map(item =>
          item.id === parentId
            ? {
                ...item,
                items: newItems,
                localOrder: newItems,
                isModified: panel === 'local' && item.sourceId ? true : item.isModified,
                lastUpdated: Date.now(),
              }
            : item
        );
        
        return {
          [`${panel}Items`]: updatedItems,
        };
      } else {
        // Reordering top-level items
        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
        
        return {
          [`${panel}Items`]: items,
        };
      }
    });
  },

  // New method for repositioning items within groups or moving them out
  repositionItem: (panel: 'cdm' | 'local', itemId: string, targetId: string, position: 'before' | 'after' | 'inside', groupId?: string) => {
    set((state) => {
      const items = [...(panel === 'cdm' ? state.cdmItems : state.localItems)];
      
      // Find the item being moved - search all items first to get the actual item
      let draggedItem: DocRefItem | undefined;
      let sourceGroupId: string | undefined;
      
      // First, find the dragged item by searching through all items
      const findItemRecursively = (itemsList: DocRefItem[]): DocRefItem | undefined => {
        for (const item of itemsList) {
          if (item.id === itemId) {
            return item;
          }
        }
        return undefined;
      };
      
      draggedItem = findItemRecursively(items);
      
      // Then check if it's in a group
      for (const item of items) {
        if (item.type === 'group' && item.items?.includes(itemId)) {
          sourceGroupId = item.id;
          break;
        }
      }
      
      if (!draggedItem) {
        console.warn(`Item ${itemId} not found for repositioning`);
        return state;
      }
      
      console.log('Repositioning item:', { 
        itemId, 
        draggedItem: draggedItem.name, 
        targetId, 
        position, 
        groupId, 
        sourceGroupId 
      });
      
      // Create completely new state - atomic operation with deep cloning
      let updatedItems = items.map(item => ({ 
        ...item, 
        items: item.items ? [...item.items] : undefined 
      }));
      
      // STEP 1: Remove item from ALL current locations atomically
      if (sourceGroupId) {
        // Remove from source group
        updatedItems = updatedItems.map(item => 
          item.id === sourceGroupId 
            ? {
                ...item,
                items: item.items?.filter(id => id !== itemId) || [],
                isModified: panel === 'local' && item.sourceId ? true : item.isModified,
                lastUpdated: Date.now(),
              }
            : item
        );
      }
      
      // Add item to new location
      if (groupId) {
        // Check admin rule: prevent adding local items to linked groups
        const targetGroup = updatedItems.find(item => item.id === groupId);
        const { adminRules } = state;
        
        if (panel === 'local' && 
            targetGroup?.sourceId && // target group is linked
            !draggedItem.sourceId && // dragged item is local-only
            !adminRules.allowAddingLocal) {
          console.log('Admin rule violation: Cannot add local items to linked\'d groups');
          return state; // Prevent the operation
        }
        
        // Add to target group at specific position
        updatedItems = updatedItems.map(item => {
          if (item.id === groupId) {
            const currentItems = [...(item.items || [])];
            
            // If item is already in this group, remove it first (for repositioning within group)
            const currentIndex = currentItems.indexOf(itemId);
            if (currentIndex !== -1) {
              currentItems.splice(currentIndex, 1);
            }
            
            if (position === 'inside') {
              // Add at end of group
              currentItems.push(itemId);
            } else {
              // Find target position within group
              const targetIndex = currentItems.findIndex(id => id === targetId);
              if (targetIndex !== -1) {
                const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
                currentItems.splice(insertIndex, 0, itemId);
              } else {
                // Target not found in group, add at end
                currentItems.push(itemId);
              }
            }
            
            console.log(`Repositioned ${draggedItem.name} in group ${groupId} at position ${position} relative to ${targetId}`);
            
            return {
              ...item,
              items: currentItems,
              isModified: panel === 'local' && item.sourceId ? true : item.isModified,
              lastUpdated: Date.now(),
            };
          }
          return item;
        });
      } else {
        // Moving to top level - remove from main array first, then insert at correct position
        updatedItems = updatedItems.filter(item => item.id !== itemId);
        
        const targetIndex = updatedItems.findIndex(item => item.id === targetId);
        if (targetIndex !== -1) {
          const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
          updatedItems.splice(insertIndex, 0, draggedItem);
          console.log(`Added ${draggedItem.name} to top level at position ${insertIndex}`);
        } else {
          updatedItems.push(draggedItem);
          console.log(`Added ${draggedItem.name} to end of top level`);
        }
      }
      
      return {
        [`${panel}Items`]: updatedItems,
      };
    });
  },
  
  pullFromCDM: (itemIds) => {
    const { cdmItems, localItems, generateId } = get();
    
    let newLocalItems = [...localItems];
    
    // Separate deleted items (local items with sourceId but no matching CDM item)
    const deletedItems = localItems.filter(localItem => 
      localItem.sourceId && !cdmItems.some(cdmItem => cdmItem.id === localItem.sourceId)
    );
    
    const { adminRules } = get();
    
    // When replaceModifiedGroups is enabled, find children of linked groups that will be converted
    // These should be skipped during deleted item processing since they'll be preserved
    const childrenOfLinkedGroups = new Set<string>();
    if (adminRules.replaceModifiedGroups) {
      localItems.forEach(localItem => {
        if (localItem.type === 'group' && localItem.sourceId && localItem.items) {
          localItem.items.forEach(childId => childrenOfLinkedGroups.add(childId));
        }
      });
    }
    
    // Process deleted items first
    deletedItems.forEach(deletedItem => {
      // Skip children of linked groups when replaceModifiedGroups is enabled
      // They will be preserved when the group is converted to local
      if (childrenOfLinkedGroups.has(deletedItem.id)) {
        return;
      }
      
      if (itemIds.includes(deletedItem.id)) {
        // Convert to local-only (user checked the box)
        newLocalItems = newLocalItems.map(item =>
          item.id === deletedItem.id
            ? {
                ...item,
                sourceId: undefined,
                isLocal: true,
                isModified: false,
              }
            : item
        );
      } else {
        // Remove the item completely (user didn't check the box)
        newLocalItems = newLocalItems.filter(item => item.id !== deletedItem.id);
        
        // Also remove from any groups that contain it
        newLocalItems = newLocalItems.map(item => {
          if (item.type === 'group' && item.items?.includes(deletedItem.id)) {
            return {
              ...item,
              items: item.items.filter(id => id !== deletedItem.id),
              isModified: item.sourceId ? true : item.isModified,
              lastUpdated: Date.now(),
            };
          }
          return item;
        });
      }
    });
    
    // Filter out items that are children of selected groups to prevent duplication
    const filteredItemIds = itemIds.filter(itemId => {
      // Skip deleted items since we processed them above
      const isDeletedItem = deletedItems.some(deleted => deleted.id === itemId);
      if (isDeletedItem) return false;
      
      // Check if this item is a child of any selected group
      const isChildOfSelectedGroup = itemIds.some(selectedId => {
        const selectedItem = cdmItems.find(i => i.id === selectedId);
        return selectedItem?.type === 'group' && 
               selectedItem.items?.includes(itemId) && 
               selectedId !== itemId;
      });
      return !isChildOfSelectedGroup;
    });
    
    filteredItemIds.forEach(itemId => {
      // Check if this is a CDM item (new/update) or a local item (deleted)
      const cdmItem = cdmItems.find(i => i.id === itemId);
      const localItem = localItems.find(i => i.id === itemId);
      
      if (cdmItem) {
        // Handle CDM items (new or update)
        const existingLocal = localItems.find(i => i.sourceId === itemId);
        
        if (existingLocal) {
          // Update existing item
          if (cdmItem.type === 'group' && cdmItem.items) {
            // For groups, we need to map CDM item IDs to local item IDs
            const updatedGroupItems: string[] = [];
            
            cdmItem.items.forEach(cdmSubId => {
              const localSubItem = newLocalItems.find(i => i.sourceId === cdmSubId);
              if (localSubItem) {
                updatedGroupItems.push(localSubItem.id);
              }
            });
            
            // Check if group content has changed (different sub-items)
            const existingLocalSourceIds = (existingLocal.items || []).map(localId => {
              const localSubItem = newLocalItems.find(i => i.id === localId);
              return localSubItem?.sourceId || localId;
            });
            const cdmSubIds = cdmItem.items;
            const groupContentChanged = 
              existingLocalSourceIds.length !== cdmSubIds.length ||
              !cdmSubIds.every(id => existingLocalSourceIds.includes(id));
            
            if (groupContentChanged && adminRules.replaceModifiedGroups) {
              // Keep the existing local group contents as-is, just convert everything to local
              const existingChildIds = existingLocal.items || [];
              
              newLocalItems = newLocalItems.map(item => {
                if (item.id === existingLocal.id) {
                  return {
                    ...item,
                    sourceId: undefined,
                    isLocal: true,
                    isModified: false,
                    lastUpdated: Date.now(),
                    localOrder: undefined,
                  };
                }
                if (existingChildIds.includes(item.id)) {
                  return {
                    ...item,
                    sourceId: undefined,
                    isLocal: true,
                    isModified: false,
                    lastUpdated: Date.now(),
                  };
                }
                return item;
              });
            } else {
              newLocalItems = newLocalItems.map(item => 
                item.id === existingLocal.id 
                  ? {
                      ...item,
                      name: cdmItem.name,
                      items: updatedGroupItems,
                      lastUpdated: Date.now(),
                      isModified: false,
                      localOrder: undefined,
                    }
                  : item
              );
            }
          } else {
            // For non-group items
            newLocalItems = newLocalItems.map(item => 
              item.id === existingLocal.id 
                ? {
                    ...item,
                    name: cdmItem.name,
                    lastUpdated: Date.now(),
                    isModified: false,
                  }
                : item
            );
          }
        } else {
          // Create new linked item
          const linkedItem: DocRefItem = {
            ...cdmItem,
            id: generateId(),
            isLocal: false,
            sourceId: itemId,
            lastUpdated: Date.now(),
          };
          
          // Handle group merging
          if (cdmItem.type === 'group' && cdmItem.items) {
            const mergedItems: string[] = [];
            
            cdmItem.items.forEach(cdmSubId => {
              // Check if we already have a linked version of this sub-item
              const existingSubItem = newLocalItems.find(i => i.sourceId === cdmSubId);
              if (existingSubItem) {
                mergedItems.push(existingSubItem.id);
              } else {
                // Create linked sub-item if it doesn't exist
                const cdmSubItem = cdmItems.find(i => i.id === cdmSubId);
                if (cdmSubItem) {
                  const linkedSubItem: DocRefItem = {
                    ...cdmSubItem,
                    id: generateId(),
                    isLocal: false,
                    sourceId: cdmSubId,
                    lastUpdated: Date.now(),
                  };
                  newLocalItems.push(linkedSubItem);
                  mergedItems.push(linkedSubItem.id);
                }
              }
            });
            
            linkedItem.items = mergedItems;
          }
          
          newLocalItems.push(linkedItem);
        }
      }
    });
    
    set({ localItems: newLocalItems });
  },

  handleDeletedItem: (itemId, action) => {
    set(state => {
      let newLocalItems = [...state.localItems];
      
      if (action === 'make-local') {
        // Convert to local-only
        newLocalItems = newLocalItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                sourceId: undefined,
                isLocal: true,
                isModified: false,
              }
            : item
        );
      } else if (action === 'delete') {
        // Remove the item completely
        newLocalItems = newLocalItems.filter(item => item.id !== itemId);
        
        // Also remove from any groups that contain it
        newLocalItems = newLocalItems.map(item => {
          if (item.type === 'group' && item.items?.includes(itemId)) {
            return {
              ...item,
              items: item.items.filter(id => id !== itemId),
              isModified: item.sourceId ? true : item.isModified,
              lastUpdated: Date.now(),
            };
          }
          return item;
        });
      }
      
      return { localItems: newLocalItems };
    });
  },
  
  refreshFromCDM: () => {
    const { cdmItems } = get();
    
    set(state => ({
      localItems: state.localItems.map(localItem => {
        // Skip local-only items
        if (!localItem.sourceId) return localItem;
        
        // Find corresponding CDM item
        const cdmItem = cdmItems.find(i => i.id === localItem.sourceId);
        
        // If CDM item no longer exists, convert to local-only
        if (!cdmItem) {
          return {
            ...localItem,
            sourceId: undefined,
            isLocal: true,
            isModified: false,
          };
        }
        
        // Update from CDM while preserving local modifications
        return {
          ...localItem,
          name: cdmItem.name,
          items: localItem.localOrder || cdmItem.items,
          lastUpdated: Date.now(),
          isModified: Boolean(localItem.localOrder),
        };
      }),
    }));
  },
  
  setSelectedItems: (panel, itemIds) => {
    set({ [`selected${panel.charAt(0).toUpperCase() + panel.slice(1)}Items`]: itemIds });
  },
  
  toggleItemSelection: (panel, itemId) => {
    const currentSelection = get()[`selected${panel.charAt(0).toUpperCase() + panel.slice(1)}Items` as keyof DocRefStore] as string[];
    const newSelection = currentSelection.includes(itemId)
      ? currentSelection.filter(id => id !== itemId)
      : [...currentSelection, itemId];
    
    get().setSelectedItems(panel, newSelection);
  },
  
  clearSelection: (panel) => {
    if (panel) {
      get().setSelectedItems(panel, []);
    } else {
      set({
        selectedCdmItems: [],
        selectedLocalItems: [],
        selectedInspectorItems: [],
      });
    }
  },
  
  showContextMenu: (x, y, targetId, selectedIds) => {
    set({
      contextMenu: {
        visible: true,
        x,
        y,
        targetId,
        selectedIds,
      },
    });
  },
  
  hideContextMenu: () => {
    set({
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        targetId: null,
        selectedIds: [],
      },
    });
  },
  
  startDrag: (itemId, type, sourcePanel) => {
    set({
      dragState: {
        isDragging: true,
        draggedId: itemId,
        draggedType: type,
        sourcePanel,
        dropTargetId: null,
        dropPosition: null,
      },
    });
  },
  
  endDrag: () => {
    set({
      dragState: {
        isDragging: false,
        draggedId: null,
        draggedType: null,
        sourcePanel: null,
        dropTargetId: null,
        dropPosition: null,
      },
    });
  },

  setDropTarget: (id, type) => {
    set(state => ({
      dragState: {
        ...state.dragState,
        dropTargetId: id,
        dropPosition: type,
      },
    }));
  },
  
  updateAdminRules: (rules) => {
    set(state => ({
      adminRules: { ...state.adminRules, ...rules },
    }));
  },
  
  saveState: (name) => {
    const { cdmItems, localItems, adminRules, recentSaves } = get();
    
    const newSave: SavedState = {
      timestamp: Date.now(),
      name,
      cdmItems,
      localItems,
      adminRules,
    };
    
    const updatedSaves = [newSave, ...recentSaves.slice(0, 9)]; // Keep only 10 recent saves
    
    set({ recentSaves: updatedSaves });
    
    // Save to localStorage
    localStorage.setItem('docRefPrototype_recentSaves', JSON.stringify(updatedSaves));
  },
  
  loadState: (state) => {
    set({
      cdmItems: state.cdmItems,
      localItems: state.localItems,
      adminRules: state.adminRules,
    });
  },
  
  exportState: () => {
    const { cdmItems, localItems, adminRules } = get();
    return JSON.stringify({
      timestamp: Date.now(),
      name: `Export_${new Date().toISOString()}`,
      cdmItems,
      localItems,
      adminRules,
    }, null, 2);
  },
  
  importState: (jsonData) => {
    try {
      const state = JSON.parse(jsonData) as SavedState;
      get().loadState(state);
    } catch (error) {
      console.error('Failed to import state:', error);
    }
  },
  
  getItemById: (id, panel) => {
    const { cdmItems, localItems } = get();
    
    if (panel === 'cdm') {
      return cdmItems.find(i => i.id === id);
    } else if (panel === 'local') {
      return localItems.find(i => i.id === id);
    } else {
      return cdmItems.find(i => i.id === id) || localItems.find(i => i.id === id);
    }
  },
  
  getUpdateStatus: (localItem) => {
    if (!localItem.sourceId) return 'local-only';
    if (localItem.isModified) return 'modified';
    
    const { cdmItems, localItems } = get();
    const cdmItem = cdmItems.find(i => i.id === localItem.sourceId);
    
    if (!cdmItem) return 'update-available'; // CDM item was deleted, but keep badge until user accepts
    
    // Check timestamp updates
    const hasTimestampUpdate = cdmItem.lastUpdated && localItem.lastUpdated && 
                              cdmItem.lastUpdated > localItem.lastUpdated;
    
    // Check for group content changes (item ordering)
    let hasGroupContentChanges = false;
    if (cdmItem.type === 'group' && localItem.type === 'group' && cdmItem.items && localItem.items) {
      // Map local item IDs back to their CDM source IDs for comparison
      const localSourceIds = localItem.items.map(localId => {
        const localSubItem = localItems.find(i => i.id === localId);
        return localSubItem?.sourceId || localId;
      });
      
      hasGroupContentChanges = JSON.stringify(cdmItem.items) !== JSON.stringify(localSourceIds);
    }
    
    if (hasTimestampUpdate || hasGroupContentChanges) {
      return 'update-available';
    }
    
    return 'linked';
  },
  
  hasUpdatesAvailable: () => {
    const { cdmItems, localItems } = get();
    
    // Check for new items in CDM
    const hasNewItems = cdmItems.some(cdmItem => 
      !localItems.some(local => local.sourceId === cdmItem.id)
    );
    
    // Check for updated items (compare timestamps and group contents)
    const hasUpdatedItems = localItems.some(localItem => {
      if (!localItem.sourceId) return false;
      const cdmItem = cdmItems.find(i => i.id === localItem.sourceId);
      if (!cdmItem) return false;
      
      // Check timestamp updates
      const hasTimestampUpdate = cdmItem.lastUpdated && localItem.lastUpdated && 
                                cdmItem.lastUpdated > localItem.lastUpdated;
      
      // Check for group content changes (item ordering)
      let hasGroupContentChanges = false;
      if (cdmItem.type === 'group' && localItem.type === 'group' && cdmItem.items && localItem.items) {
        // Map local item IDs back to their CDM source IDs for comparison
        const localSourceIds = localItem.items.map(localId => {
          const localSubItem = localItems.find(i => i.id === localId);
          return localSubItem?.sourceId || localId;
        });
        
        hasGroupContentChanges = JSON.stringify(cdmItem.items) !== JSON.stringify(localSourceIds);
      }
      
      return hasTimestampUpdate || hasGroupContentChanges;
    });
    
    // Check for deleted items
    const hasDeletedItems = localItems.some(localItem => 
      localItem.sourceId && !cdmItems.some(cdmItem => cdmItem.id === localItem.sourceId)
    );
    
    return hasNewItems || hasUpdatedItems || hasDeletedItems;
  },
  
  generateId,
}));

// Initialize recent saves from localStorage
if (typeof window !== 'undefined') {
  const savedRecentSaves = localStorage.getItem('docRefPrototype_recentSaves');
  if (savedRecentSaves) {
    try {
      const recentSaves = JSON.parse(savedRecentSaves);
      useDocRefStore.setState({ recentSaves });
    } catch (error) {
      console.error('Failed to load recent saves:', error);
    }
  }
}
