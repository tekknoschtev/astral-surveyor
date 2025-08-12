# Save/Load System Planning Document

This document captures planning discussions for implementing a comprehensive save/load system in Astral Surveyor.

## Current State Analysis

### Already Persisted ✅
- **Distance traveled** (lifetime total) - via `astralSurveyor_gameData` in localStorage
- **Audio settings** (mute state) - via `astralSurveyor_audioSettings` in localStorage

### Not Persisted (Lost on Refresh) ❌
- **Discoveries** - The `DiscoveryLogbook` has `getDiscoveries()` and `loadDiscoveries()` methods but they're not connected to persistence
- **Current position** - Player returns to starting coordinates 
- **Universe seed** - Different universe generated each time
- **Session distance** - Only lifetime distance persists
- **Game progress/achievements** - No achievement system exists yet

## Core Save/Load Features

### 1. Game State Persistence
- Expand existing `astralSurveyor_gameData` localStorage to include:
  - Current player position (x, y coordinates)
  - Universe seed (for consistent world regeneration)
  - Session distance traveled
  - Timestamp of last save

### 2. Discovery System Integration  
- Connect `DiscoveryLogbook.getDiscoveries()` to save system
- Auto-save discoveries on each new discovery
- Load discoveries on game start using existing `loadDiscoveries()` method

### 3. Enhanced Features That Pair Well with Save/Load

#### Achievement System
- Simple achievement tracking (distances traveled, objects discovered, rare finds)
- Persistent achievement progress and unlock states
- UI indicator for new achievements

#### Multiple Save Slots
- Allow 3-5 named save slots for different exploration sessions
- Save slot management UI (New Game, Load Game, Delete Save)
- Each slot stores complete game state independently

#### Auto-Save & Manual Save
- Auto-save every 30 seconds or after significant events (discoveries, distance milestones)
- Manual save option (keyboard shortcut + menu option)
- Save state indicator in UI

#### Continue Game Feature  
- "Continue" button on main menu for most recent save
- Resume at exact position with all progress intact

## Save File Sharing & Portability Options

### Option 1: Export/Import Save Files (Simplest)
- Save game state as JSON and allow users to download/upload save files
- Users could share save files via email, Discord, etc.
- Works across any browser/device
- No server infrastructure needed
- Fits the game's offline-first philosophy

### Option 2: URL-Based Save States (Clever)
- Extend the existing seed/coordinates URL system to include compressed save data
- Generate shareable URLs that contain the entire game state
- Example: `?seed=12345&x=1000&y=2000&discoveries=compressed_data&distance=50000`
- Could use URL-safe base64 encoding for discovery data
- Limited by URL length but discoveries could be summarized

### Option 3: Browser-Based File API (Modern)
- Use the File System Access API for local file management
- Allow users to save/load .astral files to their chosen location
- Works like traditional PC games (save files in Documents folder)
- Cross-device via cloud storage (Dropbox, Google Drive, etc.)

### Option 4: Simple Cloud Storage (Future Enhancement)
- Optional anonymous cloud saves (no accounts needed)
- Generate unique save codes (like "GALAXY-DAWN-7392")
- Users share codes to let others load their exploration progress
- Could use free services like Firebase or simple server storage

## Discovery Sharing Ideas

Since Astral Surveyor focuses on **discovery and wonder**, sharing could emphasize that:

### Discovery Journals
- Export discovery lists as readable text/markdown files
- "My Journey Through the Cosmos" - a shareable exploration log
- Include screenshots or coordinates of interesting finds

### Universe Bookmarks  
- Share specific locations with custom names
- "Check out this amazing binary system I found: `?seed=12345&x=1000&y=2000&bookmark=binary_giants`"
- Community-driven location sharing

### Exploration Challenges
- "Can you find all 10 planet types in this universe?"
- Share universe seeds with specific discovery goals

## Implementation Strategy

### Phase 1: Core Save/Load (Essential)
1. Create centralized `SaveManager` class
2. Expand game data structure to include position, seed, discoveries
3. Connect discovery logbook to persistence
4. Add auto-save on discoveries and position changes

### Phase 2: Enhanced UX (Quality of Life)  
1. Add save slot management UI
2. Implement achievement system with basic achievements
3. Add manual save/load controls
4. Create "Continue Game" main menu option

### Phase 3: Polish (Nice to Have)
1. Save state visual indicators  
2. Import/export save files for backup
3. Statistics dashboard (total time played, distances, etc.)
4. Achievement notifications and UI

## Technical Considerations

### Data Structure
```typescript
interface SaveData {
  version: number;
  timestamp: number;
  playerPosition: { x: number; y: number; };
  universeSeed: number;
  distances: {
    session: number;
    lifetime: number;
  };
  discoveries: DiscoveryEntry[];
  achievements?: Achievement[];
  settings: {
    audio: AudioSettings;
  };
}
```

### Storage Strategy
- **Local Storage**: Quick access for auto-save
- **File Download/Upload**: User-controlled backups and sharing
- **URL Encoding**: Lightweight sharing for specific sessions

## Alignment with Game Philosophy

This save/load approach maintains the game's core values:
- **Peaceful exploration** - No pressure mechanics in save system
- **Wonder and discovery** - Preserves and celebrates exploration progress  
- **Browser-focused** - Works offline, respects privacy
- **Simplicity** - Clean interfaces that don't overwhelm the experience

---

*This document serves as a reference for future development consideration of save/load functionality.*