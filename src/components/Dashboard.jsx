import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Globe, Calendar, ChevronDown } from 'lucide-react';
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

    // Filtrage des tickets en fonction de la période sélectionnée
    const getFilteredTickets = () => {
        const now = new Date();
        let startTime;

        if (timeFilter === 'today') {
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        } else if (timeFilter === '7d') {
            startTime = Math.floor(now.getTime() / 1000) - (86400 * 7);
        } else {
            startTime = Math.floor(now.getTime() / 1000) - (86400 * 30);
        }

        return tickets.filter(t => (new Date(t.created_at).getTime() / 1000) >= startTime);
    };

    const filteredTickets = getFilteredTickets();

    // Agrégation pour le graphique de thèmes basée sur les tickets filtrés
    const metrics = ZendeskService.aggregateMetrics(filteredTickets);
    const chartData = Object.keys(metrics).map(key => ({ name: key, volume: metrics[key] }));

    if (instances.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>Bienvenue sur BeeZen</h2>
                <div className="glass" style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
                    <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '1.5rem' }} />
                    <h3 style={{ marginBottom: '1rem' }}>Aucune instance Zendesk configurée</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Pour commencer à analyser vos tickets, vous devez ajouter une instance Zendesk dans les paramètres.
                    </p>
                </div>
            </div>
        );
    }

    const calculateFRT = (ticketList) => {
        const mailTickets = ticketList.filter(t => t.via?.channel === 'email' && t.metrics?.reply_time_in_minutes?.calendar);
        const avgMinutes = mailTickets.length > 0
            ? mailTickets.reduce((acc, t) => acc + t.metrics.reply_time_in_minutes.calendar, 0) / mailTickets.length
            : 0;
        return mailTickets.length > 0 ? `${(avgMinutes / 60).toFixed(1)}h` : '--';
    };

    // Calcul des groupements pour les KPIs
    let channelGroup = {};
    let brandGroup = {};
    filteredTickets.forEach(t => {
        const chan = t.via?.channel || 'autre';
        const brand = t.brand_name || 'Inconnu';
        channelGroup[chan] = (channelGroup[chan] || 0) + 1;
        brandGroup[brand] = (brandGroup[brand] || 0) + 1;
    });

    return (
        <div style={{ padding: '2rem' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Analyse de Performance</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Mise à jour : {lastUpdate} {refreshing && "(Sync en cours...)"}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Filtre de Période */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        <Calendar size={16} color="var(--primary)" />
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                outline: 'none',
                                cursor: 'pointer',
                                paddingRight: '20px',
                                appearance: 'none'
                            }}
                        >
                            <option value="today" style={{ background: '#1e293b' }}>Aujourd'hui</option>
                            <option value="7d" style={{ background: '#1e293b' }}>7 derniers jours</option>
                            <option value="30d" style={{ background: '#1e293b' }}>30 derniers jours</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                    </div>

                    <button style={{
                        padding: '8px 16px', background: 'var(--primary)', color: '#000', border: 'none',
                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                    }} onClick={onRefresh} disabled={refreshing}>
                        <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} /> Actualiser
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)' }}>
                {instances.map(inst => (
                    <button
                        key={inst.id}
                        onClick={() => setActiveInstanceId(inst.id)}
                        style={{
                            padding: '12px 24px', background: 'transparent', border: 'none',
                            borderBottom: activeInstanceId === inst.id ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeInstanceId === inst.id ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer', fontWeight: activeInstanceId === inst.id ? '600' : '400'
                        }}
                    >
                        {inst.name}
                    </button>
                ))}
            </div>

            {error === "CORS_BLOCKED" && (
                <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}>
                    <h4 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px' }}><Globe size={20} /> Erreur de Proxy (CORS)</h4>
                    <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                        Votre navigateur bloque la connexion directe. Vérifiez l'URL de votre <strong>VITE_WORKER_URL</strong> dans le fichier .env.
                    </p>
                </div>
            )}

            {/* Dynamic KPIs Display */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                    <div className="glass" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>Total Créés</p>
                        <p style={{ fontSize: '2.1rem', fontWeight: '800' }}>{filteredTickets.length}</p>
                    </div>

                    {Object.entries(channelGroup).map(([chan, count]) => (
                        <div key={chan} className="glass" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '2px solid var(--secondary)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>Canal: {chan}</p>
                            <p style={{ fontSize: '2.1rem', fontWeight: '800', color: 'var(--secondary)' }}>{count}</p>
                        </div>
                    ))}

                    {Object.entries(brandGroup).map(([brand, count]) => (
                        <div key={brand} className="glass" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '2px solid var(--primary)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>Marque: {brand}</p>
                            <p style={{ fontSize: '2.1rem', fontWeight: '800', color: 'var(--primary)' }}>{count}</p>
                        </div>
                    ))}

                    <div className="glass" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>FRT Mail (Moy)</p>
                        <p style={{ fontSize: '2.1rem', fontWeight: '800', color: 'var(--secondary)' }}>{calculateFRT(filteredTickets)}</p>
                    </div>
                </div>
            </div>

            {/* Graphique de répartition */}
            <div className="glass" style={{ padding: '1.5rem', height: '350px', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                    Répartition des thèmes ({timeFilter === 'today' ? "Aujourd'hui" : timeFilter === '7d' ? "7j" : "30j"})
                </h3>
                {filteredTickets.length > 0 ? (
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

            {/* Performance Agent basée sur les tickets filtrés */}
            <AgentPerformance tickets={filteredTickets} users={users} />
        </div>
    );
};

export default Dashboard;
