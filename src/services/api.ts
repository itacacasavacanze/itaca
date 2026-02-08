import { supabase } from '@/lib/supabase';

// In production (Vercel), /api is handled by Vercel Functions
// In development, we need to proxy /api to the Vercel dev server or just mock it.
// Ideally, use `vercel dev` to run both frontend and backend functions locally.
const API_URL = '/api';

export const api = {
    // Auth (using Supabase)
    login: async (credentials: any) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.username, // Assuming username is email for Supabase
            password: credentials.password,
        });
        if (error) throw error;
        return data;
    },

    logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    getSession: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    // Prices (using Supabase directly)
    getPrices: async () => {
        const { data, error } = await supabase
            .from('prices')
            .select('*');

        if (error) throw new Error(error.message);
        return data;
    },

    updatePrices: async (pricesData: any[]) => {
        const { data, error } = await supabase
            .from('prices')
            .upsert(pricesData);

        if (error) throw new Error(error.message);
        return data;
    },

    // Availability (calling our new Vercel Function)
    getAvailability: async (start?: string, end?: string) => {
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);

        const res = await fetch(`${API_URL}/availability?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch availability');
        return res.json();
    }
};
