export interface DocRefItem {
  id: string;
  name: string;
  type: 'entity' | 'group';
  isLocal: boolean;
  sourceId?: string; // if linked from CDM
  items?: string[]; // for groups only - references to other item IDs
  localOrder?: string[]; // for modified groups - local ordering of items
  lastUpdated?: number; // timestamp for update detection
  isModified?: boolean; // true if local modifications exist
}

export interface AdminRules {
  allowReordering: boolean;
  allowDeletion: boolean;
  allowAddingLocal: boolean;
  allowReorderingWithinLinkedGroups: boolean;
  replaceModifiedGroups: boolean;
}

export interface SavedState {
  timestamp: number;
  name: string;
  cdmItems: DocRefItem[];
  localItems: DocRefItem[];
  adminRules: AdminRules;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
  selectedIds: string[];
}

export interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  draggedType: 'item' | 'group' | null;
  sourcePanel: 'cdm' | 'local' | null;
  dropTargetId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
}

export type UpdateStatus = 'linked' | 'modified' | 'update-available' | 'local-only';
