import { useDocRefStore } from "../store/useDocRefStore";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Download, ChevronRight, ChevronDown, Settings, Layers, AlertCircle } from "lucide-react";
import { useState } from "react";

export function DocRefInspector() {
  const { 
    cdmItems, 
    localItems,
    selectedInspectorItems, 
    toggleItemSelection,
    setSelectedItems,
    pullFromCDM,
    getUpdateStatus,
    handleDeletedItem
  } = useDocRefStore();

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [deletedItemDecisions, setDeletedItemDecisions] = useState<Record<string, 'make-local' | 'delete' | null>>({});

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleAcceptChanges = () => {
    // Process regular CDM items
    if (selectedInspectorItems.length > 0) {
      pullFromCDM(selectedInspectorItems);
      setSelectedItems('inspector', []);
    }
    
    // Process deleted item decisions
    Object.entries(deletedItemDecisions).forEach(([itemId, decision]) => {
      if (decision) {
        handleDeletedItem(itemId, decision);
      }
    });
    
    // Clear decisions after applying them
    setDeletedItemDecisions({});
  };

  const handleDeletedItemChoice = (itemId: string, choice: 'make-local' | 'delete') => {
    setDeletedItemDecisions(prev => ({
      ...prev,
      [itemId]: choice
    }));
  };

  const getItemStatus = (cdmItem: any) => {
    const linkedLocalItem = localItems.find(local => local.sourceId === cdmItem.id);
    
    if (!linkedLocalItem) {
      return { label: 'New', variant: 'secondary' as const, className: 'bg-green-100 text-green-800' };
    }
    
    // Check if CDM item has been updated (compare timestamps directly)
    if (cdmItem.lastUpdated && linkedLocalItem.lastUpdated && 
        cdmItem.lastUpdated > linkedLocalItem.lastUpdated) {
      return { label: 'Updated', variant: 'destructive' as const, className: 'bg-blue-100 text-blue-800' };
    }
    
    // For groups, also check if the item order has changed
    if (cdmItem.type === 'group' && linkedLocalItem.type === 'group') {
      const cdmOrder = cdmItem.items || [];
      
      // Build expected local order by mapping CDM order to corresponding local item IDs
      const expectedLocalOrder: string[] = [];
      
      cdmOrder.forEach((cdmId: string) => {
        const correspondingLocalItem = localItems.find(local => local.sourceId === cdmId);
        if (correspondingLocalItem) {
          expectedLocalOrder.push(correspondingLocalItem.id);
        }
      });
      
      // Get the current effective order of the local group
      // Use localOrder if it exists (indicating local modifications), otherwise use items
      const currentLocalOrder = linkedLocalItem.localOrder || linkedLocalItem.items || [];
      
      // Compare the expected order (based on current CDM) with current local order
      // If they differ, the CDM has been reordered and we should show "Updated"
      if (expectedLocalOrder.length !== currentLocalOrder.length || 
          !expectedLocalOrder.every((item: string, index: number) => item === currentLocalOrder[index])) {
        return { label: 'Updated', variant: 'destructive' as const, className: 'bg-blue-100 text-blue-800' };
      }
    }
    
    // Check if local item is modified
    if (linkedLocalItem.isModified) {
      return { label: 'Modified', variant: 'default' as const, className: 'bg-gray-100 text-gray-600' };
    }
    
    return { label: 'Linked', variant: 'default' as const, className: 'bg-gray-100 text-gray-600' };
  };

  const handleItemCheck = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems('inspector', [...selectedInspectorItems, itemId]);
    } else {
      setSelectedItems('inspector', selectedInspectorItems.filter(id => id !== itemId));
    }
  };

  const handleGroupCheck = (groupId: string, checked: boolean) => {
    const group = cdmItems.find(item => item.id === groupId);
    if (!group || group.type !== 'group') return;

    const groupItemIds = [groupId, ...(group.items || [])];
    
    if (checked) {
      const newSelected = [...selectedInspectorItems];
      groupItemIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedItems('inspector', newSelected);
    } else {
      setSelectedItems('inspector', 
        selectedInspectorItems.filter(id => !groupItemIds.includes(id))
      );
    }
  };

  const topLevelItems = cdmItems.filter(item => 
    !cdmItems.some(parent => parent.type === 'group' && parent.items?.includes(item.id))
  );

  // Get deleted items (local items with sourceId but no matching CDM item)
  const deletedItems = localItems.filter(localItem => 
    localItem.sourceId && !cdmItems.some(cdmItem => cdmItem.id === localItem.sourceId)
  );

  const selectedItemsCount = selectedInspectorItems.length;
  const newItemsCount = selectedInspectorItems.filter(id => 
    !localItems.some(local => local.sourceId === id)
  ).length;
  const updateItemsCount = selectedInspectorItems.filter(id => {
    const localItem = localItems.find(local => local.sourceId === id);
    return localItem && getUpdateStatus(localItem) === 'update-available';
  }).length;

  // Check if there are any CDM changes available
  const hasChangesAvailable = () => {
    // Check for new items in CDM
    const hasNewItems = cdmItems.some(cdmItem => 
      !localItems.some(local => local.sourceId === cdmItem.id)
    );
    
    // Check for updated items
    const hasUpdatedItems = localItems.some(localItem => 
      localItem.sourceId && getUpdateStatus(localItem) === 'update-available'
    );
    
    // Check for deleted items (local items with sourceId but no matching CDM item)
    const hasDeletedItems = localItems.some(localItem => 
      localItem.sourceId && !cdmItems.some(cdmItem => cdmItem.id === localItem.sourceId)
    );
    
    return hasNewItems || hasUpdatedItems || hasDeletedItems;
  };

  return (
    <div className="h-full">
      {/* Global CDM Changes Notification */}
      {hasChangesAvailable() && (
        <div className="bg-amber-50 border-b border-amber-200 p-3">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
            <span className="text-sm text-amber-800">CDM updates available</span>
          </div>
        </div>
      )}
      
      <div className="p-6 border-b border-panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Links Inspector</h2>
          <Button 
            size="sm" 
            onClick={handleAcceptChanges}
            disabled={selectedItemsCount === 0 && !Object.values(deletedItemDecisions).some(d => d)}
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Accept Changes
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          Select items to import or update from CDM
        </div>
      </div>

      {/* Tree View */}
      <div className="p-6 h-full overflow-y-auto">
        <div className="space-y-1">
          {topLevelItems.map((item) => {
            if (item.type === 'group') {
              const isExpanded = expandedGroups.includes(item.id);
              const isGroupSelected = selectedInspectorItems.includes(item.id);
              const groupStatus = getItemStatus(item);

              return (
                <div key={item.id} className="mb-2">
                  <div className="flex items-center p-2 hover:bg-gray-50 rounded group">
                    <Checkbox
                      checked={isGroupSelected}
                      onCheckedChange={(checked) => handleGroupCheck(item.id, checked as boolean)}
                      className="mr-2"
                    />
                    <button
                      onClick={() => toggleGroupExpansion(item.id)}
                      className="mr-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                    <Layers className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900 flex-1">{item.name}</span>
                    <Badge variant={groupStatus.variant} className={`text-xs ${groupStatus.className}`}>
                      {groupStatus.label}
                    </Badge>
                  </div>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {(item.items || []).map((childId) => {
                        const childItem = cdmItems.find(i => i.id === childId);
                        if (!childItem) return null;

                        const isChildSelected = selectedInspectorItems.includes(childId);
                        const childStatus = getItemStatus(childItem);

                        return (
                          <div key={childId} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              checked={isChildSelected}
                              onCheckedChange={(checked) => handleItemCheck(childId, checked as boolean)}
                              className="mr-2"
                            />
                            <Settings className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-700 flex-1">{childItem.name}</span>
                            <Badge variant={childStatus.variant} className={`text-xs ${childStatus.className}`}>
                              {childStatus.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              const isSelected = selectedInspectorItems.includes(item.id);
              const status = getItemStatus(item);

              return (
                <div key={item.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                    className="mr-2"
                  />
                  <Settings className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                  <Badge variant={status.variant} className={`text-xs ${status.className}`}>
                    {status.label}
                  </Badge>
                </div>
              );
            }
          })}
        </div>

        {/* Deleted Items Section */}
        {deletedItems.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Deleted in CDM</h3>
            <p className="text-xs text-gray-600 mb-4">These items were deleted from CDM. Choose what to do with each:</p>
            <div className="space-y-2">
              {deletedItems.map((item) => {
                const currentDecision = deletedItemDecisions[item.id];
                
                return (
                  <div key={item.id} className="flex items-center p-3 rounded border bg-red-50 border-red-200">
                    {item.type === 'group' ? (
                      <Layers className="w-4 h-4 text-red-500 mr-2" />
                    ) : (
                      <Settings className="w-4 h-4 text-red-500 mr-2" />
                    )}
                    <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={currentDecision === 'make-local' ? 'default' : 'outline'}
                        className={`text-xs px-3 py-1 ${
                          currentDecision === 'make-local' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                        onClick={() => handleDeletedItemChoice(item.id, 'make-local')}
                      >
                        Make Local
                      </Button>
                      <Button 
                        size="sm" 
                        variant={currentDecision === 'delete' ? 'default' : 'outline'}
                        className={`text-xs px-3 py-1 ${
                          currentDecision === 'delete' 
                            ? 'bg-red-600 text-white border-red-600' 
                            : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                        }`}
                        onClick={() => handleDeletedItemChoice(item.id, 'delete')}
                      >
                        Accept Deletion
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pull Summary */}
        {(selectedItemsCount > 0 || Object.values(deletedItemDecisions).some(d => d)) && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-medium text-blue-900 mb-2">Changes Summary</div>
            <div className="space-y-1 text-xs text-blue-800">
              {selectedItemsCount > 0 && (
                <>
                  <div>• {newItemsCount} new items to pull</div>
                  <div>• {updateItemsCount} items to update</div>
                </>
              )}
              {Object.values(deletedItemDecisions).filter(d => d === 'make-local').length > 0 && (
                <div>• {Object.values(deletedItemDecisions).filter(d => d === 'make-local').length} items to make local</div>
              )}
              {Object.values(deletedItemDecisions).filter(d => d === 'delete').length > 0 && (
                <div>• {Object.values(deletedItemDecisions).filter(d => d === 'delete').length} items to delete</div>
              )}
              <div>• 0 merge conflicts</div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
