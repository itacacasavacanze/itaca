import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request: Request) {
    const start = Date.now();

    try {
        // Lightweight query: fetch exactly 1 row from your existing `prices` table.
        // This is enough to wake the DB and confirm it's responsive.
        const { data, error } = await supabase
            .from('prices')
            .select('date')  // only one lightweight column
            .limit(1);

        if (error) throw error;

        const latencyMs = Date.now() - start;

        return new Response(JSON.stringify({
            status: 'ok',
            db: 'connected',
            latencyMs,
            timestamp: new Date().toISOString(),
        }), {
            status: 200,
            headers: {
                'content-type': 'application/json',
                // No caching — each hit must reach the DB
                'Cache-Control': 'no-store',
            },
        });

    } catch (err: any) {
        const latencyMs = Date.now() - start;
        return new Response(JSON.stringify({
            status: 'error',
            db: 'unreachable',
            message: err.message,
            latencyMs,
            timestamp: new Date().toISOString(),
        }), {
            status: 503,
            headers: {
                'content-type': 'application/json',
                'Cache-Control': 'no-store',
            },
        });
    }
}

export const config = {
    runtime: 'edge',
};