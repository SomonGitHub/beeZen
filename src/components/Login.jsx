import React, { useState } from 'react';
import { Mail, Lock, BarChart3, ChevronRight, Loader2, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        const domain = email.split('@')[1];
        if (domain !== 'bee2link.fr' && domain !== 'bee2linkgroup.io') {
            setError('Accès restreint aux emails @bee2link.fr ou @bee2linkgroup.io');
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                setMessage('Inscription réussie ! Vérifiez vos emails pour confirmer votre compte.');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            }
        } catch (err) {
            setError(err.message === 'Invalid login credentials'
                ? 'Identifiants invalides ou compte non créé.'
                : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e293b, #0c0e12)'
        }}>
            <div className="glass" style={{
                padding: '3rem',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'var(--primary)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    margin: '0 auto 1.5rem'
                }}>
                    <BarChart3 size={32} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--primary)' }}>BeeZen</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    {isSignUp ? "Créer un compte Bee2link" : "Analyse intelligente Zendesk"}
                </p>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Email Professionnel</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                required
                                placeholder="nom@bee2link.fr"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                        </div>
                    </div>

                    {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
                    {message && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>{message}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'var(--primary)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: loading ? 0.7 : 1,
                            marginBottom: '1rem'
                        }}>
                        {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
                        {!loading && <ChevronRight size={18} />}
                    </button>
                </form>

                <button
                    onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%'
                    }}>
                    {isSignUp ? <LogIn size={16} /> : <UserPlus size={16} />}
                    {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
                </button>
            </div>
        </div>
    );
};

export default Login;
