import React from 'react';
import {
  LayoutDashboard,
  Settings,
  Users,
  BarChart3,
  AlertTriangle,
  LogOut,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Sidebar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { id: 'analytics', icon: BarChart3, label: 'Analyses IA' },
    { id: 'settings', icon: Settings, label: 'Paramètres' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="sidebar glass" style={{
      width: '260px',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      marginRight: '0'
    }}>
      <div className="logo" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '2rem',
        paddingLeft: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'var(--primary)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000'
        }}>
          <BarChart3 size={20} />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>BeeZen</h1>
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: 'none',
              background: activeTab === item.id ? 'var(--primary-glow)' : 'transparent',
              color: activeTab === item.id ? 'var(--primary)' : 'var(--text-muted)',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '8px',
              transition: 'all 0.2s ease',
              textAlign: 'left'
            }}
            className="nav-item"
          >
            <item.icon size={20} />
            <span style={{ fontWeight: '500' }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--danger)',
            cursor: 'pointer'
          }}>
          <LogOut size={20} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
