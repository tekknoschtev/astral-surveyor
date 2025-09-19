// BlackHoleWarnings - Handles black hole proximity warning system
// Extracted from DiscoveryManager for focused responsibility

import { DiscoveryDisplay } from '../ui/ui.js';

// Black hole warning tracking interface
interface BlackHoleWarning {
    time: number;
    level: number;
}

export class BlackHoleWarnings {
    private lastBlackHoleWarnings = new Map<string, BlackHoleWarning>();
    private readonly warningCooldown = 5; // 5 seconds between warnings for same black hole

    constructor(private discoveryDisplay: DiscoveryDisplay) {}

    /**
     * Display black hole proximity warnings with cooldown management
     */
    displayBlackHoleWarning(
        message: string,
        warningLevel: number,
        isPastEventHorizon: boolean,
        blackHoleId: string
    ): void {
        const currentTime = Date.now() / 1000; // Convert to seconds
        const lastWarning = this.lastBlackHoleWarnings.get(blackHoleId);

        // Check if we should show warning (different level or enough time passed)
        const shouldShowWarning = !lastWarning ||
                                 lastWarning.level !== warningLevel ||
                                 (currentTime - lastWarning.time) >= this.warningCooldown;

        if (shouldShowWarning) {
            // Display proximity warning with appropriate urgency indicators
            if (isPastEventHorizon) {
                // Critical warning - past event horizon
                this.discoveryDisplay.addNotification(`🚨 CRITICAL: ${message}`);
            } else if (warningLevel >= 2) {
                // High danger warning
                this.discoveryDisplay.addNotification(`🔥 DANGER: ${message}`);
            } else {
                // Caution level warning
                this.discoveryDisplay.addNotification(`⚠️ CAUTION: ${message}`);
            }

            // Update warning tracking
            this.lastBlackHoleWarnings.set(blackHoleId, {
                time: currentTime,
                level: warningLevel
            });
        }
    }

    /**
     * Clear all warning history (for save/load or reset)
     */
    clearWarnings(): void {
        this.lastBlackHoleWarnings.clear();
    }
}