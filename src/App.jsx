import React, { useState, useEffect } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Settings from './components/Settings'
import AIAnalytics from './components/AIAnalytics'
import { supabase } from './lib/supabase'
import { DatabaseService } from './services/db'
import { ZendeskService } from './services/zendesk'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Shared State
  const [instances, setInstances] = useState([])
  const [activeInstanceId, setActiveInstanceId] = useState(null)
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])
  const [agentStatuses, setAgentStatuses] = useState({ agent_availabilities: [] })
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 1. Charger les instances au démarrage
  useEffect(() => {
    const init = async () => {
      if (session) {
        const data = await DatabaseService.getInstances()
        setInstances(data)
        if (data.length > 0 && !activeInstanceId) {
          setActiveInstanceId(data[0].id)
        }
      }
    }
    init()
  }, [session])

  // 2. Charger les tickets UNIQUEMENT quand l'instance active change
  useEffect(() => {
    if (session && activeInstanceId) {
      handleRefresh()
      fetchPresence()
    }
  }, [activeInstanceId])

  // 3. Polling Présence Agents (60s)
  useEffect(() => {
    let interval;
    if (session && activeInstanceId) {
      interval = setInterval(() => {
        fetchPresence()
      }, 60000)
    }
    return () => clearInterval(interval)
  }, [session, activeInstanceId, instances])

  const fetchPresence = async () => {
    const instance = instances.find(i => i.id === activeInstanceId)
    if (!instance) return
    const data = await ZendeskService.fetchAgentStatuses(instance)
    console.log("Agent Presence Data:", data);
    if (data) {
      setAgentStatuses(data)
    }
  }

  // Fonction légère pour recharger les instances (utile pour Settings)
  const loadInstancesOnly = async () => {
    const data = await DatabaseService.getInstances()
    setInstances(data)
  }

  const handleRefresh = async () => {
    if (!activeInstanceId) return
    setRefreshing(true)
    setError(null)
    try {
      const instance = instances.find(i => i.id === activeInstanceId) || (await DatabaseService.getInstances()).find(i => i.id === activeInstanceId)
      if (!instance) return;

      const sixtyDaysAgo = Math.floor(Date.now() / 1000) - (86400 * 60)
      const { tickets: ticketData, users: userData } = await ZendeskService.fetchTickets(instance, sixtyDaysAgo)

      setTickets(ticketData)
      setUsers(userData)
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0e12', color: 'var(--primary)' }}>Chargement...</div>
  }

  if (!session) return <Login />

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={{ flex: 1, backgroundColor: 'transparent', height: '100vh', overflowY: 'auto' }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            instances={instances}
            activeInstanceId={activeInstanceId}
            setActiveInstanceId={setActiveInstanceId}
            tickets={tickets}
            users={users}
            agentStatuses={agentStatuses} // agentStatuses is now the raw object
            refreshing={refreshing}
            onRefresh={handleRefresh}
            error={error}
          />
        )}
        {activeTab === 'settings' && <Settings onUpdate={loadInstancesOnly} />}
        {activeTab === 'analytics' && <AIAnalytics tickets={tickets} />}
      </main>
    </div>
  )
}

export default App
