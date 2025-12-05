export type MoatType =
    | 'switching_costs'
    | 'network_effects'
    | 'brand'
    | 'scale_economies'
    | 'regulation'
    | 'niche_dominance'
    | 'none';

export type TamPenetration = 'low' | 'medium' | 'high';

export interface AntigravityResult {
    aiStatus: 'STRONG_PASS' | 'SOFT_PASS' | 'MONITOR_ONLY' | 'AVOID';
    aiTier: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Not Interesting' | 'Disqualified';
    aiConviction: number; // 0-100
    thesisSummary: string;
    bullCase: string; // Bullet points as text
    bearCase: string; // Bullet points as text
    keyDrivers: string[];
    warnings: string[]; // Legacy, kept for compatibility but populated from warningFlags
    timeHorizonYears: number;
    multiBaggerPotential: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    positionSizingHint: 'NONE' | 'SMALL' | 'CORE' | 'AGGRESSIVE';
    notesForUI: string;

    // New Fields
    primaryMoatType: MoatType;
    moatScore: number; // 0-10
    tamCategory: 'small' | 'medium' | 'large' | 'huge';
    tamPenetration: TamPenetration;
    founderLed: boolean;
    insiderOwnership: number | null; // 0-1 or null if unknown
    warningFlags: string[]; // Short risk bullets
    positiveCatalysts: string[]; // Short catalyst bullets

    // Summaries for UI (Populated by Analyzer)
    warningSummary?: string | null;
    catalystSummary?: string | null;
    error?: string | null;
}

// Legacy interfaces kept for compatibility if needed, but AntigravityReport is now AntigravityResult
export type AntigravityReport = AntigravityResult;
