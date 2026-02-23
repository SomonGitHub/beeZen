import React, { useState, useEffect } from 'react';
import { Sparkles, Lightbulb, BookOpen, AlertCircle, Loader2, BrainCircuit } from 'lucide-react';
import { AIService } from '../services/ai';

const AIAnalytics = ({ tickets }) => {
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const runAnalysis = async () => {
        if (!tickets || tickets.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const result = await AIService.analyzeTickets(tickets);
            setAnalysis(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tickets.length > 0 && !analysis) {
            runAnalysis();
        }
    }, [tickets]);

    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles className="animate-pulse" color="var(--primary)" /> Intelligence Artificielle
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Analyse sémantique et suggestions basées sur vos tickets réels</p>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={loading || tickets.length === 0}
                    style={{
                        padding: '10px 20px', background: 'var(--primary)', color: '#000', border: 'none',
                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        opacity: loading ? 0.7 : 1
                    }}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                    {loading ? 'Analyse en cours...' : 'Relancer l\'IA'}
                </button>
            </header>

            {error && (
                <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}>
                    <h4 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px' }}><AlertCircle size={20} /> Erreur de configuration IA</h4>
                    <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>{error}</p>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                <div className="glass" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lightbulb size={20} color="var(--primary)" /> Insights de la semaine
                    </h3>
                    <div style={{ color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Loader2 className="animate-spin" style={{ marginBottom: '1rem' }} />
                                <p>ChatGPT analyse vos {tickets.length} tickets réels...</p>
                            </div>
                        ) : analysis ? (
                            analysis
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>Cliquez sur "Relancer l'IA" pour générer une analyse basée sur vos données.</p>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BookOpen size={18} color="var(--primary)" /> Articles suggérés
                        </h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Basé sur les problèmes récurrents détectés.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Ces suggestions seront idéalement extraites du JSON de l'IA plus tard */}
                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>Guide : Résoudre les erreurs de connexion API</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suggéré car détecté dans 15% des tickets.</p>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>FAQ : Mise à jour des identifiants Bee2link</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Réduit le volume de tickets "Mot de passe oublié".</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255, 193, 7, 0.05)', borderLeft: '4px solid var(--warning)' }}>
                        <h4 style={{ color: 'var(--warning)', fontWeight: '700', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Optimisation Token</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            Seuls les titres des tickets sont envoyés à l'IA pour minimiser le coût et le temps de réponse.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAnalytics;
