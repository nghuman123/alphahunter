import { SqueezeSetup } from '../../src/types/scoring';

/**
 * Squeeze Setup Logic
 * Goal: Identify high-quality names that might have asymmetric short-squeeze setups.
 */

interface SqueezeInput {
    multiBaggerScore: number;
    shortInterestPct: number;
    daysToCover?: number;
}

export const computeSqueezeSetup = (input: SqueezeInput): SqueezeSetup => {
    const { multiBaggerScore, shortInterestPct, daysToCover = 0 } = input;
    const details: string[] = [];
    let squeezeScore: SqueezeSetup['squeezeScore'] = 'None';

    // Tiered conditions from STRATEGY_PRINCIPLES.md

    // 1. Strong Setup
    // MultiBaggerScore >= 75, SI >= 20%, DTC >= 5
    if (multiBaggerScore >= 75 && shortInterestPct >= 20 && daysToCover >= 5) {
        squeezeScore = 'Strong';
        details.push('Strong Squeeze Setup: High Quality (Score >= 75) + High Short Interest (>= 20%) + High DTC (>= 5)');
    }
    // 2. Moderate Setup
    // MultiBaggerScore >= 65, SI >= 15%, DTC >= 3
    else if (multiBaggerScore >= 65 && shortInterestPct >= 15 && daysToCover >= 3) {
        squeezeScore = 'Moderate';
        details.push('Moderate Squeeze Setup: Good Quality (Score >= 65) + Elevated Short Interest (>= 15%) + Moderate DTC (>= 3)');
    }
    // 3. Watch Setup
    // MultiBaggerScore >= 55, SI >= 10%
    else if (multiBaggerScore >= 55 && shortInterestPct >= 10) {
        squeezeScore = 'Watch';
        details.push('Watch Squeeze Setup: Decent Quality (Score >= 55) + Notable Short Interest (>= 10%)');
    }
    // 4. Warning / None
    else {
        if (shortInterestPct > 10 && multiBaggerScore < 55) {
            details.push('High Short Interest but Low Quality: Warning (Not a squeeze candidate)');
        } else {
            details.push('No significant squeeze setup detected');
        }
    }

    return {
        squeezeScore,
        details
    };
};
