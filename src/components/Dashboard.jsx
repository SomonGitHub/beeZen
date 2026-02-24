import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Globe, Calendar, ChevronDown, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ZendeskService } from '../services/zendesk';
import AgentPerformance from './AgentPerformance';

const Dashboard = ({ instances, activeInstanceId, setActiveInstanceId, tickets, users, agentStatuses, refreshing, onRefresh, error }) => {
    const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
    const [timeFilter, setTimeFilter] = useState('today'); // 'today', '7d', '30d'

    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const safeUsers = Array.isArray(users) ? users : [];

    useEffect(() => {
        if (safeTickets.length > 0) {
            setLastUpdate(new Date().toLocaleTimeString());
        }
    }, [safeTickets]);

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
    const cleanTickets = (list) => (Array.isArray(list) ? list : []).filter(t => t.status !== 'deleted' && t.status !== 'spam');

    const currentTickets = cleanTickets(safeTickets.filter(t => {
        const ts = new Date(t.created_at).getTime() / 1000;
        return ts >= current.start && ts <= current.end;
    }));

    const previousTickets = cleanTickets(safeTickets.filter(t => {
        const ts = new Date(t.created_at).getTime() / 1000;
        return ts >= previous.start && ts <= previous.end;
    }));

    // Agrégation pour les KPIs
    const aggregateData = (ticketList) => {
        let channels = {};
        let brands = {};
        let pending = 0;
        let hold = 0;
        let resolved = 0;
        let newCount = 0;
        let openCount = 0;
        (ticketList || []).forEach(t => {
            const chan = t.channel || t.via?.channel || 'autre';
            const brand = t.brand_name || 'Inconnu';
            channels[chan] = (channels[chan] || 0) + 1;
            brands[brand] = (brands[brand] || 0) + 1;

            if (t.status === 'pending') pending++;
            else if (t.status === 'hold') hold++;
            else if (t.status === 'solved' || t.status === 'closed') resolved++;
            else if (t.status === 'new') newCount++;
            else if (t.status === 'open') openCount++;
        });
        return { total: (ticketList || []).length, channels, brands, pending, hold, resolved, newCount, openCount };
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
        // Si prev n'est pas un nombre ou indéfini, on ne peut rien comparer
        if (typeof prev === 'undefined') return null;

        // Calcul du pourcentage (0% si curr == prev, Infinity si prev == 0)
        let percent = 0;
        let isNew = false;

        if (prev > 0) {
            percent = ((curr - prev) / prev) * 100;
        } else if (curr > 0) {
            isNew = true; // Passage de 0 à X
        } else if (curr === 0 && prev === 0) {
            percent = 0;
        }

        const isIncrease = percent > 0 || isNew;
        const isNeutral = percent === 0 && !isNew;

        // Couleurs : Rouge pour augmentation, Vert pour baisse (sur le volume de tickets)
        // Note: Pour "Résolus", l'augmentation est positive (verte), mais on garde la logique Volume = Rouge pour l'instant
        const color = isNeutral ? 'var(--text-muted)' : isIncrease ? 'var(--danger)' : '#22c55e';
        const Icon = isNeutral ? null : isIncrease ? TrendingUp : TrendingDown;

        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: color, fontSize: '0.75rem', fontWeight: '700', marginTop: '4px' }}>
                {Icon && <Icon size={12} />}
                {isNew ? "+New" : `${isIncrease ? '+' : ''}${percent.toFixed(0)}%`}
                <span style={{ opacity: 0.8, marginLeft: '4px', fontWeight: '400', fontSize: '0.7rem', color: 'var(--text-muted)' }}>({prev})</span>
            </div>
        );
    };

    const formatDuration = (timestamp) => {
        if (!timestamp) return '...';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '...';

        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 0) return 'Juste à l\'instant'; // Horloge désynchronisée ?

        if (diff < 60) return `${diff}s`;
        const mins = Math.floor(diff / 60);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ${mins % 60}m`;
        return '> 24h';
    };

    const getStatusColor = (status) => {
        if (!status) return '#94a3b8';
        const s = String(status).toLowerCase();

        // En ligne
        if (s === 'online' || s === 'en ligne') return '#22c55e'; // Vert

        // Transfert uniquement / Away
        if (s === 'away' || s === 'transfert uniquement' || s.includes('transfert')) return '#f59e0b'; // Orange

        // Hors ligne
        if (s === 'offline' || s === 'hors ligne') return '#ef4444'; // Rouge

        return '#94a3b8'; // Gris par défaut
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
                    <button style={{ padding: '8px 16px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={async () => {
                        setRefreshing(true);
                        try {
                            const instance = instances.find(i => i.id === activeInstanceId);
                            await ZendeskService.syncStaff(instance);
                            alert("Synchronisation du staff (Noms/Photos) terminée !");
                            onRefresh();
                        } catch (e) { alert(e.message); }
                        finally { setRefreshing(false); }
                    }} disabled={refreshing}>
                        <Users size={18} /> Sync Staff
                    </button>
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

            {/* Bandeau de Présence Agents */}
            <div className="glass" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', overflowX: 'auto', borderLeft: `4px solid ${(agentStatuses?.agent_availabilities?.length > 0) ? 'var(--primary)' : 'var(--text-muted)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid var(--border-glass)', paddingRight: '1.5rem' }}>
                    <div style={{ padding: '8px', background: 'var(--primary-glow)', borderRadius: '8px', color: 'var(--primary)' }}>
                        <Globe size={18} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agents</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                            {filteredAvailabilities.length} actif(s)
                            {agentStatuses?.agent_availabilities?.length > filteredAvailabilities.length && ` (+${agentStatuses.agent_availabilities.length - filteredAvailabilities.length} masqués)`}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {(() => {
                        const blacklistNames = ["Marie VERRIERE", "Florent HOGGAS", "Jean-stephane VETOIS"];
                        const blacklistIds = ["25403312878748", "366626732000"];

                        const filteredAvailabilities = (agentStatuses?.agent_availabilities || []).filter(avail => {
                            const agentId = String(avail?.attributes?.agent_id || avail?.agent_id || avail?.user_id);
                            const agent = safeUsers?.find(u => String(u.id) === agentId);
                            const name = agent ? agent.name : "";

                            return !blacklistIds.includes(agentId) && !blacklistNames.some(bn => name.toUpperCase().includes(bn.toUpperCase()));
                        });

                        if (filteredAvailabilities.length === 0) {
                            return (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    {refreshing ? "Recherche des agents..." : (typeof agentStatuses?.detail === 'string' ? agentStatuses.detail : (agentStatuses?.detail ? "Erreur API (Détail complexe)" : "Aucun agent en ligne"))}
                                </span>
                            );
                        }

                        return filteredAvailabilities.map(avail => {
                            const agentId = avail?.attributes?.agent_id || avail?.agent_id || avail?.user_id;
                            const statusKind = avail?.attributes?.agent_status || avail?.status_kind || avail?.status;
                            let statusName = avail?.attributes?.agent_status || avail?.status_name || statusKind;

                            if (typeof statusName === 'object' && statusName !== null) {
                                statusName = statusName.name || statusName.label || statusName.status_name || "Statut inconnu";
                            }

                            // Traduction vers le français pour les labels standards si nécessaire
                            const statusLower = String(statusName).toLowerCase();
                            let label = statusName;
                            if (statusLower === 'online' || statusLower.includes('en ligne')) label = "En ligne";
                            else if (statusLower === 'away' || statusLower.includes('absent')) label = "Absent";
                            else if (statusLower === 'offline' || statusLower.includes('hors ligne')) label = "Hors ligne";
                            else if (statusLower === 'transfers_only' || statusLower.includes('transfert')) label = "Transfert uniquement";

                            // Extraction de la date (Timestamp)
                            let updatedAt = avail?.attributes?.updated_at || avail?.updated_at || avail?.attributes?.created_at || avail?.created_at || avail?.timestamp;

                            // Si vraiment aucune date, on triche avec l'heure de la requête (mieux que "...")
                            if (!updatedAt) {
                                updatedAt = new Date().toISOString();
                            }

                            const agent = safeUsers?.find(u => String(u.id) === String(agentId));

                            return (
                                <div key={agentId || Math.random()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
                                    <div style={{ position: 'relative' }}>
                                        {(agent && agent.photo_url) ? (
                                            <img src={agent.photo_url} alt={agent.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '800' }}>
                                                {agent ? agent.name.charAt(0) : '?'}
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(label), border: '2px solid #0c0e12' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{agent ? agent.name : `Agent #${agentId}`}</span>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                            {label} • {formatDuration(updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    })()}
                </div>
            </div>

            {/* Dynamic KPIs Display */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {/* Colonne Gauche : Total */}
                    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
                        <div className="glass" style={{ padding: '0.75rem 1rem', textAlign: 'center', minWidth: '140px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Total Créés</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: '800' }}>{currentStats.total}</p>
                            {renderEvolution(currentStats.total, previousStats.total)}
                        </div>
                    </div>

                    {/* Groupe Canaux */}
                    <div style={{ flex: 1, minWidth: '300px', padding: '0.8rem', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginLeft: '4px' }}>Répartition par Canaux</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                            {Object.entries(currentStats.channels).map(([chan, count]) => (
                                <div key={chan} className="glass" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', borderBottom: '2px solid var(--secondary)' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginBottom: '0.2rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chan}</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--secondary)' }}>{count}</p>
                                    {renderEvolution(count, previousStats.channels[chan] || 0)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Groupe Marques */}
                    <div style={{ flex: 1, minWidth: '300px', padding: '0.8rem', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginLeft: '4px' }}>Répartition par Marques</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                            {Object.entries(currentStats.brands).map(([brand, count]) => (
                                <div key={brand} className="glass" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', borderBottom: '2px solid var(--primary)' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginBottom: '0.2rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand}</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>{count}</p>
                                    {renderEvolution(count, previousStats.brands[brand] || 0)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Deuxième ligne de KPIs pour les statuts critique */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <div className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '2px solid var(--secondary)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Nouveaux</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--secondary)' }}>{currentStats.newCount}</p>
                    </div>
                    <div className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '2px solid var(--accent)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Ouverts</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent)' }}>{currentStats.openCount}</p>
                        {renderEvolution(currentStats.openCount, previousStats.openCount)}
                    </div>
                    <div className="glass" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', borderBottom: '2px solid var(--success)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Résolus</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--success)' }}>{currentStats.resolved}</p>
                        {renderEvolution(currentStats.resolved, previousStats.resolved)}
                    </div>
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

            <AgentPerformance tickets={currentTickets} users={safeUsers} />

            {/* Table de vérification pour les tickets "Non assignés" */}
            <div className="glass" style={{ padding: '1.5rem', marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Détail des tickets "Non assignés" (Audit)</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tickets résolus ou fermés sans agent attribué</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {(() => {
                        const unassignedTickets = currentTickets.filter(t => !t.assignee_id);

                        if (unassignedTickets.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    Aucun ticket "Non assigné" identifié sur cette période.
                                </div>
                            );
                        }

                        return (
                            <>
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
                                        {unassignedTickets.slice(0, 50).map(t => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <a href={`https://${instance.domain}/agent/tickets/${t.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        #{t.id} <ExternalLink size={12} />
                                                    </a>
                                                </td>
                                                <td style={{ padding: '10px 12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                                                <td style={{ padding: '10px 12px' }}>{t.brand_name}</td>
                                                <td style={{ padding: '10px 12px' }}>{t.via?.channel}</td>
                                                <td style={{ padding: '10px 12px' }}>{t.status}</td>
                                                <td style={{ padding: '10px 12px' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {unassignedTickets.length > 50 && (
                                    <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        (+ {unassignedTickets.length - 50} autres tickets...)
                                    </p>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
