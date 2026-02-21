const { createClient } = require('@supabase/supabase-js');

// Mock env vars from .env.local
const SUPABASE_URL = 'https://ijzxpnfiqwjlkhpbqjgk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqenhwbmZpcXdqbGtocGJxamdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1MzA2NiwiZXhwIjoyMDg0OTI5MDY2fQ.EMCtRdJYcZNWUHYOoePslLAlwh55EvABiojqBRX8QKw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runBenchmark() {
    console.log('Starting benchmark...');

    // 1. Setup: Get active event IDs to query
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const { data: events } = await supabase
        .from('common_code_detail')
        .select('id')
        .eq('code_group', 'LUCKY_DRAW_PRIZE')
        .eq('use_yn', 'Y')
        .lte('sta_ymd', today)
        .gte('end_ymd', today);

    const eventIds = events.map(e => e.id);
    console.log('Target event IDs:', eventIds);

    if (eventIds.length === 0) {
        console.log('No active events found. Cannot benchmark.');
        return;
    }

    // 2. Measure Old Way (Simulation)
    // Fetch ALL entries for these events to count them in JS
    console.time('Old Way (Fetch All Entries)');
    const { data: allEntries, error: oldError } = await supabase
        .from('lucky_draw_entries')
        .select('lucky_draw_id, entries_count')
        .in('lucky_draw_id', eventIds);

    if (oldError) console.error('Old Way Error:', oldError);

    // Simulate JS aggregation
    let entryCounts = {};
    for (const e of (allEntries || [])) {
        entryCounts[e.lucky_draw_id] = (entryCounts[e.lucky_draw_id] || 0) + (e.entries_count || 1);
    }
    console.timeEnd('Old Way (Fetch All Entries)');
    console.log(`Old Way Fetched ${allEntries?.length || 0} rows.`);

    // 3. Measure New Way (RPC)
    console.time('New Way (RPC Call)');
    const { data: rpcResult, error: newError } = await supabase
        .rpc('get_lucky_draw_events_v2');

    if (newError) console.error('New Way Error:', newError);
    console.timeEnd('New Way (RPC Call)');
    console.log(`New Way Returned ${rpcResult?.length || 0} events.`);

    // 4. Theoretical Analysis Output
    console.log('\n--- Analysis ---');
    console.log('Old Way Complexity: O(N) where N is total entries.');
    console.log('New Way Complexity: O(M) where M is number of events (DB uses index scan).');
}

runBenchmark();
