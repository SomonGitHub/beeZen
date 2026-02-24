import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Globe, Calendar, ChevronDown, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ZendeskService } from '../services/zendesk';
import AgentPerformance from './AgentPerformance';

const Dashboard = ({ instances, activeInstanceId, setActiveInstanceId, tickets, users, refreshing, onRefresh, error }) => {
    const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
    const [timeFilter, setTimeFilter] = useState('today'); // 'today', '7d', '30d'

    useEffect(() => {
        if (tickets.length > 0) {
            setLastUpdate(new Date().toLocaleTimeString());
        }
    }, [tickets]);

    // Calcul des périodes (Actuelle vs Précédente)
    const getPeriods = () => {
        const now = new Date();
        const nowUnix = Math.floor(now.getTime() / 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        const secondsSinceMidnight = nowUnix - todayStart;

        let current = { start: 0, end: nowUnix };
        let previous = { start: 0, end: 0 };

        if (timeFilter === 'today') {
            current.start = todayStart;
            const isMonday = now.getDay() === 1;
            const daysToSubtract = isMonday ? 3 : 1;
            previous.start = todayStart - (86400 * daysToSubtract);
            // Comparaison à heure égale (Like-for-Like)
            previous.end = previous.start + secondsSinceMidnight;
        } else if (timeFilter === '7d') {
            current.start = todayStart - (86400 * 7);
            previous.start = current.start - (86400 * 7);
            previous.end = current.start + secondsSinceMidnight;
        } else {
            current.start = todayStart - (86400 * 30);
            previous.start = current.start - (86400 * 30);
            previous.end = current.start + secondsSinceMidnight;
        }
        return { current, previous };
    };

    const { current, previous } = getPeriods();

    // Nettoyage et filtrage des tickets (Exclude deleted & spam technically if possible)
    const cleanTickets = (list) => list.filter(t => t.status !== 'deleted' && t.status !== 'spam');

    const currentTickets = cleanTickets(tickets.filter(t => {
        const ts = new Date(t.created_at).getTime() / 1000;
        return ts >= current.start && ts <= current.end;
    }));

    const previousTickets = cleanTickets(tickets.filter(t => {
        const ts = new Date(t.created_at).getTime() / 1000;
        return ts >= previous.start && ts <= previous.end;
    }));

    // Agrégation pour les KPIs
    const aggregateData = (ticketList) => {
        let channels = {};
        let brands = {};
        let pending = 0;
        let hold = 0;
        ticketList.forEach(t => {
            const chan = t.channel || t.via?.channel || 'autre';
            const brand = t.brand_name || 'Inconnu';
            channels[chan] = (channels[chan] || 0) + 1;
            brands[brand] = (brands[brand] || 0) + 1;

            if (t.status === 'pending') pending++;
            if (t.status === 'hold') hold++;
        });
        return { total: ticketList.length, channels, brands, pending, hold };
    };

    const currentStats = aggregateData(currentTickets);
    const previousStats = aggregateData(previousTickets);

    const chartMetrics = ZendeskService.aggregateMetrics(currentTickets);
    const chartData = Object.keys(chartMetrics).map(key => ({ name: key, volume: chartMetrics[key] }));

    if (instances.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>Bienvenue sur B2L Support Dashboard</h2>
                <div className="glass" style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
                    <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '1.5rem' }} />
                    <h3 style={{ marginBottom: '1rem' }}>Aucune instance Zendesk configurée</h3>
                </div>
            </div>
        );
    }

    const renderEvolution = (curr, prev) => {
        if (!prev || prev === 0) return null;
        const percent = ((curr - prev) / prev) * 100;
        if (Math.abs(percent) < 1) return null;

        const isIncrease = percent > 0;
        const color = isIncrease ? 'var(--danger)' : '#22c55e';
        const Icon = isIncrease ? TrendingUp : TrendingDown;

        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: color, fontSize: '0.75rem', fontWeight: '700', marginTop: '4px' }}>
                <Icon size={12} />
                {isIncrease ? '+' : ''}{percent.toFixed(0)}%
                <span style={{ opacity: 0.8, marginLeft: '4px', fontWeight: '400', fontSize: '0.7rem' }}>({prev})</span>
            </div>
        );
    };

    const instance = instances.find(i => i.id === activeInstanceId) || instances[0];

    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Tableau de Bord : {instance?.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Mise à jour : {lastUpdate} {refreshing && "(Sync en cours...)"} | Fuseau : Local (Navigateur)
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        <Calendar size={16} color="var(--primary)" />
                        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: '600', outline: 'none', cursor: 'pointer', paddingRight: '20px', appearance: 'none' }}>
                            <option value="today" style={{ background: '#1e293b' }}>Aujourd'hui</option>
                            <option value="7d" style={{ background: '#1e293b' }}>7 derniers jours</option>
                            <option value="30d" style={{ background: '#1e293b' }}>30 derniers jours</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                    </div>
                    <button style={{ padding: '8px 16px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onRefresh} disabled={refreshing}>
                        <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} /> Actualiser
                    </button>
                </div>
            </header>

            {/* Tabs de sélection d'instance */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)' }}>
                {instances.map(inst => (
                    <button key={inst.id} onClick={() => setActiveInstanceId(inst.id)} style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: activeInstanceId === inst.id ? '2px solid var(--primary)' : '2px solid transparent', color: activeInstanceId === inst.id ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: activeInstanceId === inst.id ? '600' : '400' }}>
                        {inst.name}
                    </button>
                ))}
            </div>

            {/* Dynamic KPIs Display */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                    <div className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Total Créés</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '800' }}>{currentStats.total}</p>
                        {renderEvolution(currentStats.total, previousStats.total)}
                    </div>
                    {Object.entries(currentStats.channels).map(([chan, count]) => (
                        <div key={chan} className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '2px solid var(--secondary)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Canal: {chan}</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--secondary)' }}>{count}</p>
                            {renderEvolution(count, previousStats.channels[chan] || 0)}
                        </div>
                    ))}
                    {Object.entries(currentStats.brands).map(([brand, count]) => (
                        <div key={brand} className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '2px solid var(--primary)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Marque: {brand}</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>{count}</p>
                            {renderEvolution(count, previousStats.brands[brand] || 0)}
                        </div>
                    ))}
                </div>

                {/* Deuxième ligne de KPIs pour les statuts critique */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <div className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '2px solid var(--warning)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>En Attente (Client)</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--warning)' }}>{currentStats.pending}</p>
                        {renderEvolution(currentStats.pending, previousStats.pending)}
                    </div>
                    <div className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '2px solid #8b5cf6' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>En Pause (Interne)</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '800', color: '#8b5cf6' }}>{currentStats.hold}</p>
                        {renderEvolution(currentStats.hold, previousStats.hold)}
                    </div>
                </div>
            </div>

            {/* Graphique de répartition */}
            <div className="glass" style={{ padding: '1.5rem', height: '350px', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                    Répartition des thèmes ({timeFilter === 'today' ? "Aujourd'hui" : timeFilter === '7d' ? "7j" : "30j"})
                </h3>
                {currentTickets.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="volume" stroke="var(--primary)" fillOpacity={1} fill="url(#colorReal)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        {refreshing ? "Récupération des données..." : "Aucune donnée sur cette période."}
                    </div>
                )}
            </div>

            <AgentPerformance tickets={currentTickets} users={users} />

            {/* Table de vérification pour "Aujourd'hui" */}
            <div className="glass" style={{ padding: '1.5rem', marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Détail des tickets (Audit de données)</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Affichage des tickets identifiés pour cette période</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>ID</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Sujet</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Marque</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Canal</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Statut</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Créé à (H:min)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTickets.slice(0, 50).map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '10px 12px' }}>
                                        <a href={`https://${instance.domain}/agent/tickets/${t.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            #{t.id} <ExternalLink size={12} />
                                        </a>
                                    </td>
                                    <td style={{ padding: '10px 12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                                    <td style={{ padding: '10px 12px' }}>{t.brand_name}</td>
                                    <td style={{ padding: '10px 12px' }}>{t.via?.channel}</td>
                                    <td style={{ padding: '10px 12px' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {currentTickets.length > 50 && (
                        <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            (+ {currentTickets.length - 50} autres tickets...)
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
