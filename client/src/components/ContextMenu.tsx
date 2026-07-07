import { useDocRefStore } from "../store/useDocRefStore";
import { useEffect } from "react";
import { Edit, Trash2, Layers, Unlink } from "lucide-react";

export function ContextMenu() {
  const { 
    contextMenu, 
    hideContextMenu, 
    renameItem, 
    deleteItem, 
    createGroup, 
    ungroupItems,
    getItemById,
    cdmItems,
    localItems,
    adminRules
  } = useDocRefStore();

  const getPanelForItem = (item: any) => {
    // Check if item exists in CDM panel
    const inCdm = cdmItems.some(cdmItem => cdmItem.id === item.id);
    // Check if item exists in Local panel
    const inLocal = localItems.some(localItem => localItem.id === item.id);
    
    if (inLocal) return 'local';
    if (inCdm) return 'cdm';
    
    // Fallback to isLocal property
    return item.isLocal ? 'local' : 'cdm';
  };

  const canDeleteItems = (itemIds: string[]) => {
    // Check if all selected items can be deleted
    for (const itemId of itemIds) {
      const item = getItemById(itemId);
      if (!item) continue;
      
      const panel = getPanelForItem(item);
      
      // In local panel, check for linked items within linked groups
      if (panel === 'local' && item.sourceId) {
        // This is a linked item, check if it's in a linked group
        const parentGroup = localItems.find(localItem => 
          localItem.type === 'group' && 
          localItem.items?.includes(itemId) && 
          localItem.sourceId // Group is also linked
        );
        
        if (parentGroup && !adminRules.allowDeletion) {
          return false; // Cannot delete linked items within linked groups
        }
      }
    }
    return true;
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        hideContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.visible, hideContextMenu]);

  const handleRename = () => {
    if (!contextMenu.targetId) return;
    
    const item = getItemById(contextMenu.targetId);
    if (!item) return;

    const panel = getPanelForItem(item);
    const newName = prompt('Enter new name:', item.name);
    
    if (newName && newName.trim()) {
      renameItem(panel, contextMenu.targetId, newName.trim());
    }
    
    hideContextMenu();
  };

  const handleDelete = () => {
    // Determine which items to delete
    const itemsToDelete = contextMenu.selectedIds.length > 0 
      ? contextMenu.selectedIds 
      : contextMenu.targetId ? [contextMenu.targetId] : [];
    
    if (itemsToDelete.length === 0) return;
    
    // Check if deletion is allowed for all items
    if (!canDeleteItems(itemsToDelete)) return;
    
    // Delete all selected items
    itemsToDelete.forEach(itemId => {
      const item = getItemById(itemId);
      if (item) {
        const panel = getPanelForItem(item);
        deleteItem(panel, itemId);
      }
    });
    
    hideContextMenu();
  };

  const handleCreateGroup = () => {
    if (contextMenu.selectedIds.length === 0) return;
    
    // Filter out groups - only include entity items
    const settingsSetIds = contextMenu.selectedIds.filter(id => {
      const item = getItemById(id);
      return item && item.type === 'entity';
    });
    
    if (settingsSetIds.length === 0) return;
    
    const firstItem = getItemById(settingsSetIds[0]);
    if (!firstItem) return;

    const panel = getPanelForItem(firstItem);
    createGroup(panel, settingsSetIds, 'Group');
    
    hideContextMenu();
  };

  const handleUngroup = () => {
    if (!contextMenu.targetId) return;
    
    const item = getItemById(contextMenu.targetId);
    if (!item || item.type !== 'group') return;

    const panel = getPanelForItem(item);
    ungroupItems(panel, contextMenu.targetId);
    hideContextMenu();
  };

  if (!contextMenu.visible) return null;

  const item = contextMenu.targetId ? getItemById(contextMenu.targetId) : null;
  const isGroup = item?.type === 'group';
  
  // Count only entity items for group creation
  const settingsSetCount = contextMenu.selectedIds.filter(id => {
    const item = getItemById(id);
    return item && item.type === 'entity';
  }).length;
  
  const canCreateGroup = settingsSetCount > 1 || (settingsSetCount === 1 && !isGroup);
  
  // Determine which items would be deleted and check if deletion is allowed
  const itemsToDelete = contextMenu.selectedIds.length > 0 
    ? contextMenu.selectedIds 
    : contextMenu.targetId ? [contextMenu.targetId] : [];
  
  const canDelete = itemsToDelete.length > 0 && canDeleteItems(itemsToDelete);
  
  // Determine delete label based on selection
  const deleteLabel = contextMenu.selectedIds.length > 1 
    ? `Delete ${contextMenu.selectedIds.length} items`
    : 'Delete';

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 context-menu"
      style={{
        left: contextMenu.x,
        top: contextMenu.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center"
        onClick={handleRename}
      >
        <Edit className="w-4 h-4 mr-2" />
        Rename
      </div>
      
      <div 
        className={`px-3 py-2 text-sm flex items-center ${
          canDelete 
            ? 'text-gray-700 hover:bg-gray-100 cursor-pointer' 
            : 'text-gray-400 cursor-not-allowed'
        }`}
        onClick={canDelete ? handleDelete : undefined}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        {deleteLabel}
      </div>
      
      <div className="border-t border-gray-200 my-1"></div>
      
      {canCreateGroup && (
        <div 
          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center"
          onClick={handleCreateGroup}
        >
          <Layers className="w-4 h-4 mr-2" />
          Create Group {settingsSetCount > 1 ? `(${settingsSetCount} items)` : ''}
        </div>
      )}
      
      {isGroup && (
        <div 
          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center"
          onClick={handleUngroup}
        >
          <Unlink className="w-4 h-4 mr-2" />
          Ungroup
        </div>
      )}
    </div>
  );
}
