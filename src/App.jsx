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

  // Load instances and tickets when session changes or tab switches
  useEffect(() => {
    if (session) {
      loadInstancesAndTickets()
    }
  }, [session])

  const loadInstancesAndTickets = async () => {
    setRefreshing(true)
    try {
      const data = await DatabaseService.getInstances()
      setInstances(data)

      if (data.length > 0) {
        const initialId = activeInstanceId || data[0].id
        if (!activeInstanceId) setActiveInstanceId(initialId)

        const instance = data.find(i => i.id === initialId) || data[0]
        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (86400 * 30)
        const { tickets: ticketData, users: userData } = await ZendeskService.fetchTickets(instance, thirtyDaysAgo)

        setTickets(ticketData)
        setUsers(userData)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    if (!activeInstanceId) return
    setRefreshing(true)
    try {
      const instance = instances.find(i => i.id === activeInstanceId)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (86400 * 30)
      const { tickets: ticketData, users: userData } = await ZendeskService.fetchTickets(instance, thirtyDaysAgo)

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
            refreshing={refreshing}
            onRefresh={handleRefresh}
            error={error}
          />
        )}
        {activeTab === 'settings' && <Settings onUpdate={loadInstancesAndTickets} />}
        {activeTab === 'analytics' && <AIAnalytics tickets={tickets} />}
      </main>
    </div>
  )
}

export default App
