import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Globe, Mail, Key, Loader2, Save } from 'lucide-react';
import { DatabaseService } from '../services/db';

const Settings = ({ onUpdate }) => {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newInst, setNewInst] = useState({ name: '', domain: '', email: '', token: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadInstances();
    }, []);

    const loadInstances = async () => {
        setLoading(true);
        const data = await DatabaseService.getInstances();
        setInstances(data);
        setLoading(false);
    };

    const handleAddInstance = async () => {
        if (newInst.name && newInst.domain) {
            setSaving(true);
            await DatabaseService.saveInstance(newInst);
            await loadInstances();
            if (onUpdate) onUpdate(); // Notification à l'App globale
            setNewInst({ name: '', domain: '', email: '', token: '' });
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Voulez-vous vraiment supprimer cette instance ?")) {
            await DatabaseService.deleteInstance(id);
            await loadInstances();
            if (onUpdate) onUpdate();
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Paramètres des instances</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Instances Actives</h3>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
                    ) : instances.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune instance configurée.</p>
                    ) : (
                        instances.map(inst => (
                            <div key={inst.id} className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ fontWeight: '700', color: 'var(--primary)' }}>{inst.name}</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{inst.domain}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(inst.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.5rem' }}>Ajouter une instance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nom de l'instance</label>
                            <input
                                value={newInst.name}
                                onChange={e => setNewInst({ ...newInst, name: e.target.value })}
                                placeholder="Ex: Support France"
                                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Domaine (Zendesk)</label>
                            <div style={{ position: 'relative' }}>
                                <Globe size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                                <input
                                    value={newInst.domain}
                                    onChange={e => setNewInst({ ...newInst, domain: e.target.value })}
                                    placeholder="nom.zendesk.com"
                                    style={{ width: '100%', padding: '10px 10px 10px 35px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email de connexion</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                                <input
                                    value={newInst.email}
                                    onChange={e => setNewInst({ ...newInst, email: e.target.value })}
                                    placeholder="admin@bee2link.fr"
                                    style={{ width: '100%', padding: '10px 10px 10px 35px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Clé Token API</label>
                            <div style={{ position: 'relative' }}>
                                <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    value={newInst.token}
                                    onChange={e => setNewInst({ ...newInst, token: e.target.value })}
                                    placeholder="Votre clé token"
                                    style={{ width: '100%', padding: '10px 10px 10px 35px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff' }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddInstance}
                            disabled={saving}
                            style={{
                                padding: '12px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '6px',
                                fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: '8px', marginTop: '1rem', opacity: saving ? 0.7 : 1
                            }}>
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {saving ? 'Enregistrement...' : 'Sauvegarder l\'instance'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
