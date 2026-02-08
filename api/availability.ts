import { createClient } from '@supabase/supabase-js';
// Using fetch from node-fetch is not needed in Vercel Edge/Serverless (native fetch available)
// But for type safety we might import types
// @ts-ignore
import ICAL from 'ical.js';

// Initialize Supabase client
// These environment variables will be available in Vercel.
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const CALENDAR_URLS = {
    'deluxe': 'https://ical.booking.com/v1/export?t=6a508e72-47b8-441e-ab73-221ae38f7f5b',
    'suite': 'https://ical.booking.com/v1/export?t=434277a1-8068-4518-b3d6-4699fcb96435'
};

// Start handler
export default async function handler(request: Request) {
    try {
        const url = new URL(request.url);
        const startParam = url.searchParams.get('start');
        const endParam = url.searchParams.get('end');

        // 1. Fetch Prices from DB
        const { data: prices, error } = await supabase
            .from('prices')
            .select('*');

        if (error) throw error;

        const priceMap = new Map(prices?.map((p: any) => [p.date, p]));

        // 2. Fetch Availability from Booking.com
        const calendarIds = Object.keys(CALENDAR_URLS) as Array<keyof typeof CALENDAR_URLS>;
        const bookedDatesPerCalendar: Record<string, Set<string>> = {};

        await Promise.all(calendarIds.map(async (id) => {
            try {
                bookedDatesPerCalendar[id] = new Set<string>();
                const res = await fetch(CALENDAR_URLS[id]);
                if (!res.ok) throw new Error(`Failed to fetch ${id}`);
                const text = await res.text();

                const jcalData = ICAL.parse(text);
                const comp = new ICAL.Component(jcalData);
                const vevents = comp.getAllSubcomponents('vevent');

                vevents.forEach((vevent: any) => {
                    const event = new ICAL.Event(vevent);
                    const startDate = event.startDate.toJSDate();
                    const endDate = event.endDate.toJSDate();

                    // Loop through days
                    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                        bookedDatesPerCalendar[id].add(d.toISOString().split('T')[0]);
                    }
                });

            } catch (err) {
                console.error(`Error fetching calendar ${id}:`, err);
            }
        }));

        // 3. Generate Result
        const startDate = startParam ? new Date(startParam) : new Date();
        // Default range: 2 years roughly
        const endDate = endParam ? new Date(endParam) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000 * 2);

        const result = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const priceData = priceMap.get(dateStr);

            const isDeluxeBooked = bookedDatesPerCalendar['deluxe']?.has(dateStr) ?? false;
            const isSuiteBooked = bookedDatesPerCalendar['suite']?.has(dateStr) ?? false;

            // Available if AT LEAST ONE is free
            let isAvailable = !isDeluxeBooked || !isSuiteBooked;

            // Manual Block Override
            if (priceData?.is_blocked) {
                isAvailable = false;
            }

            let finalPrice = 100;
            const day = d.getDay();
            const isWeekend = (day === 5 || day === 6); // Friday, Saturday

            if (priceData?.price) {
                finalPrice = priceData.price;
            } else {
                if (isWeekend) finalPrice = 120;
            }

            result.push({
                date: dateStr,
                available: isAvailable,
                websitePrice: finalPrice,
                isWeekend
            });
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                'content-type': 'application/json',
                'Cache-Control': 's-maxage=60, stale-while-revalidate',
            },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}

export const config = {
    runtime: 'edge',
};
