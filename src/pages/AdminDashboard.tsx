import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [prices, setPrices] = useState<any[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [price, setPrice] = useState('');
    const [modifier, setModifier] = useState('');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [isBlocked, setIsBlocked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const session = await api.getSession();
        if (!session) {
            navigate('/admin');
            return;
        }
        loadPrices();
    };

    const loadPrices = async () => {
        try {
            const data = await api.getPrices();
            // Sort by date descending
            data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setPrices(data);
        } catch (error) {
            toast.error('Failed to load prices');
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const updates = [];

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (daysOfWeek.includes(d.getDay())) {
                    const dateStr = d.toISOString().split('T')[0];
                    const isWeekend = d.getDay() === 5 || d.getDay() === 6;

                    updates.push({
                        date: dateStr,
                        price: Number(price),
                        is_weekend: isWeekend,
                        modifier: modifier || null,
                        is_blocked: isBlocked
                    });
                }
            }

            if (updates.length > 0) {
                await api.updatePrices(updates);
                toast.success(`Updated prices for ${updates.length} dates`);
                loadPrices();
            } else {
                toast.info('No dates selected (check days of week)');
            }
        } catch (error) {
            toast.error('Failed to update prices');
            console.error(error);
        }
    };

    const handleLogout = async () => {
        await api.logout();
        navigate('/admin');
    };

    const toggleDay = (day: number) => {
        setDaysOfWeek(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const toggleDayName = (e: any, index: number) => {
        e.preventDefault(); // Prevent form submission
        toggleDay(index);
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Bulk Update Prices</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Start Date</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                            </div>
                            <div>
                                <Label>End Date</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Price (€)</Label>
                                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} required={!isBlocked} disabled={isBlocked} />
                            </div>
                            <div>
                                <Label>Modifier (Optional, e.g. "High Season")</Label>
                                <Input type="text" value={modifier} onChange={e => setModifier(e.target.value)} disabled={isBlocked} />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isBlocked"
                                checked={isBlocked}
                                onCheckedChange={(checked) => setIsBlocked(checked as boolean)}
                            />
                            <Label htmlFor="isBlocked" className="text-destructive font-semibold">Block Dates (Mark as Unavailable)</Label>
                        </div>

                        <div>
                            <Label className="mb-2 block">Apply to Days</Label>
                            <div className="flex gap-4 flex-wrap">
                                {days.map((day, index) => (
                                    <div key={day} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`day-${index}`}
                                            checked={daysOfWeek.includes(index)}
                                            onCheckedChange={() => toggleDay(index)}
                                        />
                                        <label htmlFor={`day-${index}`}>{day}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button type="submit" variant={isBlocked ? "destructive" : "default"}>
                            {isBlocked ? "Block Dates" : "Update Prices"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Current Price Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Price</th>
                                    <th className="p-2">Status</th>
                                    <th className="p-2">Modifier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prices.slice(0, 50).map((p) => (
                                    <tr key={p.date} className="border-t">
                                        <td className="p-2">{p.date}</td>
                                        <td className="p-2">€{p.price}</td>
                                        <td className="p-2">
                                            {p.is_blocked ? (
                                                <span className="text-destructive font-bold">BLOCKED</span>
                                            ) : (
                                                <span className="text-green-600">Available</span>
                                            )}
                                        </td>
                                        <td className="p-2">{p.modifier || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {prices.length > 50 && <p className="text-sm text-gray-500 mt-2">Showing first 50 entries...</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
