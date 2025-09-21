// DiscoveryStats - Handles discovery statistics and filtering
// Extracted from DiscoveryManager for focused responsibility

import { DiscoveryEntry } from './ObjectDiscovery.js';

// Discovery categories for filtering
export type DiscoveryCategory = 'all' | 'stellar' | 'planetary' | 'exotic' | 'rare' | 'notable';

// Discovery statistics interface
export interface DiscoveryStatistics {
    totalDiscoveries: number;
    byType: Record<string, number>;
    byRarity: Record<string, number>;
    byCategory: Record<DiscoveryCategory, number>;
    rareDiscoveryCount: number;
    notableDiscoveryCount: number;
    firstDiscoveryTimestamp?: number;
    lastDiscoveryTimestamp?: number;
}

// Discovery filter options
export interface DiscoveryFilter {
    category?: DiscoveryCategory;
    rarity?: 'common' | 'uncommon' | 'rare' | 'ultra-rare';
    objectType?: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    hasNotes?: boolean;
    dateRange?: {
        start: number;
        end: number;
    };
}

export class DiscoveryStats {
    /**
     * Filter discoveries based on provided criteria
     */
    filterDiscoveries(discoveries: DiscoveryEntry[], filter?: DiscoveryFilter): DiscoveryEntry[] {
        let filtered = [...discoveries];

        if (!filter) {
            return filtered.sort((a, b) => b.timestamp - a.timestamp);
        }

        // Apply filters
        if (filter.category && filter.category !== 'all') {
            filtered = filtered.filter(d => this.matchesCategory(d, filter.category!));
        }

        if (filter.rarity) {
            filtered = filtered.filter(d => d.rarity === filter.rarity);
        }

        if (filter.objectType) {
            filtered = filtered.filter(d => d.objectType === filter.objectType);
        }

        if (filter.hasNotes !== undefined) {
            filtered = filtered.filter(d => filter.hasNotes ? !!d.notes : !d.notes);
        }

        if (filter.dateRange) {
            filtered = filtered.filter(d =>
                d.timestamp >= filter.dateRange!.start &&
                d.timestamp <= filter.dateRange!.end
            );
        }

        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Generate discovery statistics
     */
    generateStatistics(discoveries: DiscoveryEntry[]): DiscoveryStatistics {
        const stats: DiscoveryStatistics = {
            totalDiscoveries: discoveries.length,
            byType: {},
            byRarity: {},
            byCategory: {
                all: discoveries.length,
                stellar: 0,
                planetary: 0,
                exotic: 0,
                rare: 0,
                notable: 0
            },
            rareDiscoveryCount: 0,
            notableDiscoveryCount: 0
        };

        if (discoveries.length > 0) {
            stats.firstDiscoveryTimestamp = Math.min(...discoveries.map(d => d.timestamp));
            stats.lastDiscoveryTimestamp = Math.max(...discoveries.map(d => d.timestamp));
        }

        // Calculate statistics
        for (const discovery of discoveries) {
            // By type
            stats.byType[discovery.type] = (stats.byType[discovery.type] || 0) + 1;

            // By rarity
            stats.byRarity[discovery.rarity] = (stats.byRarity[discovery.rarity] || 0) + 1;

            // By category
            const category = this.getDiscoveryCategory(discovery);
            if (category !== 'all') {
                stats.byCategory[category]++;
            }

            // Rare and notable counts
            if (discovery.rarity === 'rare' || discovery.rarity === 'ultra-rare') {
                stats.rareDiscoveryCount++;
            }

            if (discovery.metadata.isNotable) {
                stats.notableDiscoveryCount++;
            }
        }

        return stats;
    }

    /**
     * Check if a discovery matches a category
     */
    private matchesCategory(discovery: DiscoveryEntry, category: DiscoveryCategory): boolean {
        switch (category) {
            case 'all':
                return true;
            case 'stellar':
                return discovery.objectType === 'star';
            case 'planetary':
                return discovery.objectType === 'planet' || discovery.objectType === 'moon';
            case 'exotic':
                return discovery.objectType === 'nebula' || discovery.objectType === 'asteroids' ||
                       discovery.objectType === 'wormhole' || discovery.objectType === 'blackhole' ||
                       discovery.objectType === 'comet';
            case 'rare':
                return discovery.rarity === 'rare' || discovery.rarity === 'ultra-rare';
            case 'notable':
                return discovery.metadata.isNotable;
            default:
                return false;
        }
    }

    /**
     * Get the primary category for a discovery
     */
    private getDiscoveryCategory(discovery: DiscoveryEntry): DiscoveryCategory {
        if (discovery.metadata.isNotable) return 'notable';
        if (discovery.rarity === 'rare' || discovery.rarity === 'ultra-rare') return 'rare';
        if (discovery.objectType === 'star') return 'stellar';
        if (discovery.objectType === 'planet' || discovery.objectType === 'moon') return 'planetary';
        return 'exotic';
    }
}