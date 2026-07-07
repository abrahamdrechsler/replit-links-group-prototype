import { useDocRefStore } from "../store/useDocRefStore";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface AdminRulesPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminRulesPanel({ isCollapsed = false, onToggleCollapse }: AdminRulesPanelProps) {
  const { adminRules, updateAdminRules, recentSaves, loadState } = useDocRefStore();

  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col items-center justify-start bg-white border-r border-panel">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mt-4 p-1 h-7 w-7 hover:bg-gray-100"
          title="Expand Admin Panel"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="p-4 border-b border-panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Admin Rules</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1 h-6 w-6 hover:bg-gray-100"
            title="Collapse Admin Panel"
          >
            <ChevronLeft className="w-3 h-3 text-gray-600" />
          </Button>
        </div>
        
        {/* Toggle 1 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-700">Allow reordering within linked groups</span>
            <Switch
              checked={adminRules.allowReorderingWithinLinkedGroups}
              onCheckedChange={(checked) => updateAdminRules({ allowReorderingWithinLinkedGroups: checked })}
            />
          </div>
          <p className="text-xs text-gray-500">Default: ON</p>
        </div>

        {/* Toggle 2 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-700">Allow deletion within linked groups</span>
            <Switch
              checked={adminRules.allowDeletion}
              onCheckedChange={(checked) => updateAdminRules({ allowDeletion: checked })}
            />
          </div>
          <p className="text-xs text-gray-500">Default: OFF</p>
        </div>

        {/* Toggle 3 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-700">Allow adding local items to linked groups</span>
            <Switch
              checked={adminRules.allowAddingLocal}
              onCheckedChange={(checked) => updateAdminRules({ allowAddingLocal: checked })}
            />
          </div>
          <p className="text-xs text-gray-500">Default: OFF</p>
        </div>

        {/* Toggle 4 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-700">Replace modified groups with local groups</span>
            <Switch
              checked={adminRules.replaceModifiedGroups}
              onCheckedChange={(checked) => updateAdminRules({ replaceModifiedGroups: checked })}
            />
          </div>
          <p className="text-xs text-gray-500">Default: OFF. When on, updating a linked group that has changed will convert it to a local group.</p>
        </div>
      </div>

      {/* Recent Saves */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-900 mb-3">Recent Saves</h3>
        <div className="space-y-2">
          {recentSaves.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No recent saves
            </div>
          ) : (
            recentSaves.map((save) => (
              <div
                key={save.timestamp}
                className="text-xs text-gray-600 hover:text-primary cursor-pointer p-2 hover:bg-gray-50 rounded transition-colors"
                onClick={() => loadState(save)}
              >
                <div className="font-medium truncate">{save.name}</div>
                <div className="text-gray-500">
                  {new Date(save.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
