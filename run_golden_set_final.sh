#!/bin/bash
# Install tsx if not present (local)
if [ ! -f "node_modules/.bin/tsx" ]; then
    npm install tsx --no-save
fi

# Run the script with output redirection
# We use node loader because sometimes npx tsx has issues in this specific environment
# But let's try npx tsx first as it's standard
npx tsx scripts/runGoldenSet.ts > golden_set_output_final.txt 2>&1
