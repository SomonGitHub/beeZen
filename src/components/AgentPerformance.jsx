import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';

const AgentPerformance = ({ tickets, users = [] }) => {
    // Création d'un dictionnaire ID -> Nom pour un accès rapide
    const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.name;
        return acc;
    }, {});

    // Agrégation des tickets par Agent
    const agentData = tickets.reduce((acc, ticket) => {
        const id = ticket.assignee_id || 'Non assigné';
        if (!acc[id]) {
            acc[id] = {
                id,
                name: userMap[id] || (id === 'Non assigné' ? 'Non assigné' : `Agent ${id}`),
                solved: 0
            };
        }
        // On compte comme "résolu" si le statut est 'solved' ou 'closed'
        if (ticket.status === 'solved' || ticket.status === 'closed') {
            acc[id].solved += 1;
        }
        return acc;
    }, {});

    const chartData = Object.values(agentData)
        .sort((a, b) => b.solved - a.solved)
        .slice(0, 10); // On peut en afficher un peu plus si on a de la place

    if (tickets.length === 0) return null;

    return (
        <div style={{ marginTop: '3rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} color="var(--primary)" /> Performance des Agents (Tickets Résolus)
            </h3>

            <div className="glass" style={{ padding: '2rem', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ left: 100, right: 40, top: 20, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-muted)" fontSize={12} title="Tickets Résolus" />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="var(--text-main)"
                            fontSize={12}
                            width={150}
                            tick={{ fill: 'var(--text-main)' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            contentStyle={{
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                            }}
                        />
                        <Bar dataKey="solved" name="Résolus" radius={[0, 4, 4, 0]} barSize={25}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'rgba(255,183,0,0.6)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AgentPerformance;
