import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { User, TrendingUp, Clock } from 'lucide-react';

const data = [
    { name: 'Alice', solved: 45, frt: 12, rating: 4.8 },
    { name: 'Bob', solved: 38, frt: 15, rating: 4.5 },
    { name: 'Charlie', solved: 52, frt: 10, rating: 4.9 },
    { name: 'David', solved: 30, frt: 22, rating: 4.2 },
    { name: 'Eve', solved: 41, frt: 14, rating: 4.7 },
];

const AgentPerformance = () => {
    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Performance des Agents</h2>
                <p style={{ color: 'var(--text-muted)' }}>Comparaison de l'efficacité et de la satisfaction</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Chart */}
                <div className="glass" style={{ padding: '2rem', height: '400px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={18} color="var(--primary)" /> Tickets Résolus vs Temps de Réponse (min)
                    </h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" />
                            <YAxis stroke="var(--text-muted)" />
                            <Tooltip
                                contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar dataKey="solved" name="Tickets Résolus" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="frt" name="FRT (min)" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Performer Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', background: 'var(--primary-glow)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '2px solid var(--primary)' }}>
                            <User size={32} />
                        </div>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Charlie</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Meilleurs résultats de la semaine</p>
                        <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                            <div>
                                <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>52</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Résolus</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--success)' }}>4.9</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CSAT</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="var(--secondary)" /> Alertes Temps de Réponse
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--danger)', borderRadius: '4px' }}>
                                <p style={{ fontSize: '0.8125rem', fontWeight: '600' }}>David : FRT &gt; 20min</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Moyenne critique détectée</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentPerformance;
