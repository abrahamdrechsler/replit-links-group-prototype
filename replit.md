# Linked Files Prototype

## Overview

This is a React-based document reference prototype that simulates interactions between CDM (Content Delivery Management) and Local file systems. The application demonstrates complex linking, grouping, and modification rules with drag-and-drop functionality, real-time updates, and administrative controls.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend components:

**Frontend**: React with TypeScript, using Vite as the build tool
**Backend**: Express.js server with TypeScript
**Database**: PostgreSQL with Drizzle ORM (currently using in-memory storage for prototyping)
**UI Framework**: shadcn/ui components built on Radix UI primitives
**Styling**: Tailwind CSS with custom design tokens

## Key Components

### Frontend Architecture
- **Component-based UI**: Modular React components for file management, drag-and-drop interactions, and administrative controls
- **State Management**: Zustand store (`useDocRefStore`) for centralized application state
- **Drag & Drop**: @dnd-kit library for sophisticated drag-and-drop interactions between panels
- **UI Components**: shadcn/ui component library providing consistent design system

### Backend Architecture  
- **Express Server**: RESTful API server with middleware for logging and error handling
- **Storage Layer**: Abstracted storage interface (`IStorage`) with in-memory implementation for development
- **Route Registration**: Centralized route management system
- **Development Mode**: Vite integration for hot module replacement during development

### Core Data Models
- **DocRefItem**: Represents files and groups with linking relationships
- **AdminRules**: Configuration for user permissions and system behavior
- **DragState**: Manages drag-and-drop interaction state
- **ContextMenuState**: Handles right-click context menu interactions

## Data Flow

1. **CDM to Local Linking**: Users can pull items from CDM panel to Local panel, creating linked references
2. **Modification Tracking**: Local items track changes and maintain reference to original CDM sources
3. **Update Detection**: System compares timestamps to identify when CDM items have been updated
4. **State Persistence**: Application state can be exported/imported for testing different scenarios
5. **Real-time Updates**: UI reflects changes immediately through reactive state management
6. **Advanced Drag Operations**: Fully implemented drag-and-drop system supporting:
   - Precise positioning within groups (before/after specific items)
   - Moving items between groups and out of groups
   - Cross-panel operations (CDM to Local)
   - Intra-panel reordering with visual drop zone indicators
   - Atomic state updates preventing item duplication
   - Complete drag functionality for child items within groups

## External Dependencies

### Core Runtime Dependencies
- **React Ecosystem**: React 18 with modern hooks and concurrent features
- **UI Libraries**: Radix UI primitives for accessible components, Lucide React for icons
- **Drag & Drop**: @dnd-kit for accessible drag-and-drop interactions
- **Database**: Drizzle ORM with PostgreSQL adapter, Neon serverless database
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation

### Development Dependencies
- **Build Tools**: Vite for fast development and optimized builds
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast bundling for server-side code
- **PostCSS**: CSS processing with Tailwind CSS

## Deployment Strategy

The application uses a custom build process that handles both frontend and backend compilation:

**Build Process**:
1. Frontend builds to `dist/public` using Vite
2. Backend builds to `dist` using ESBuild
3. Custom build script reorganizes files for deployment
4. Static files moved to root `dist` directory for proper serving

**Deployment Configuration**:
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module configured
- **Static Deployment**: Files organized for static hosting with backend API
- **Environment**: Development and production configurations

**File Organization Post-Build**:
```
dist/
├── index.html          # Frontend entry point
├── index.js           # Backend server bundle  
└── assets/           # Frontend static assets
```

## Changelog

```
Changelog:
- June 24, 2025. Initial setup
- June 24, 2025. Completed advanced drag-and-drop functionality:
  * Fixed cross-panel vs intra-panel drag detection
  * Implemented precise positioning within groups (before/after specific items)
  * Enabled dragging child items within groups and between groups
  * Fixed item disappearing issues during group operations
  * Added comprehensive repositionItem method for all drag scenarios
  * Resolved item duplication issues with atomic state updates
  * Enabled full drag functionality for items within groups
  * Completed comprehensive drag system with precise drop zone positioning
- June 27, 2025. Fixed top-level drop zone positioning:
  * Resolved issue where items couldn't be dropped above first group in list
  * Removed confusing blue border from group headers during drag operations
  * Enhanced start drop zone with larger hit area and higher z-index priority
  * Implemented collision detection prioritization for start drop zone
  * All drag-and-drop functionality now working correctly including top positioning
- June 28, 2025. Completed intuitive arrow key navigation system:
  * Fixed text visibility issues during renaming (added proper text color)
  * Implemented smart visual positioning logic for moveItemUp and moveItemDown
  * Resolved "getting stuck" navigation issues requiring multiple key presses
  * Created symmetric up/down navigation that respects visual item ordering
  * Items now move smoothly between groups and top-level positions with single key presses
  * Navigation works consistently: items enter groups at logical positions and exit cleanly
  * Extended visual positioning logic to group movement, eliminating 4-press requirement
  * Complete arrow key navigation system working for all item types and positions
- June 30, 2025. Enhanced multi-select delete functionality:
  * Implemented multi-select delete via context menu - deletes all selected items
  * Added validation to grey out delete option when linked items within linked groups are selected
  * Enhanced delete label to show count when multiple items selected ("Delete 3 items")
  * Maintains existing admin rule enforcement for deletion restrictions
- June 30, 2025. Updated terminology throughout application:
  * Changed "settings sets" to "entities" throughout the codebase
  * Items within groups are now referred to as "sub entities"
  * Updated button labels to show "Add Entity" instead of "Add Settings Set"
  * Updated counter displays to show "Entities: X/10" instead of "Settings Sets: X/10"
- June 30, 2025. Renamed to "Linked Files Prototype" with updated terminology:
  * Changed application name from "Document Reference Prototype" to "Linked Files Prototype"
  * Updated "Doc Ref Inspector" to "Links Inspector"
  * Changed blue "Ref" tags to show "Link" instead
  * Updated "Ref - Mod" tags to show "Link - Mod"
  * Updated all comments from "doc-ref" terminology to "linked" terminology
  * Updated admin rules panel labels to use "linked" instead of "doc ref'd"
  * Updated validation logic and error messages to use "linked" terminology
  * Completed comprehensive terminology replacement throughout entire codebase
- February 11, 2026. Added "Replace Modified Groups with Local Groups" admin rule:
  * New toggle in admin rules panel (default: OFF)
  * When enabled, pulling updates for a linked group whose CDM content has changed converts the group and all its sub-entities to local items
  * The local group keeps its original contents unchanged (preserving the user's local file appearance)
  * All link badges are removed from the converted group and its children
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```