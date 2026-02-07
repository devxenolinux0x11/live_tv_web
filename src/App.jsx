import { useState, useEffect } from 'react'
import {
  Tv,
  Plus,
  Trash2,
  Edit3,
  Save,
  RefreshCcw,
  Upload,
  X,
  PlusCircle,
  Database,
  Search,
  AlertCircle,
  Shield,
  LayoutGrid
} from 'lucide-react'
import { githubService } from './githubService'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('channels') // 'channels' or 'vpn'

  // Channels State
  const [channels, setChannels] = useState([])
  const [channelsSha, setChannelsSha] = useState(null)
  const [channelsModified, setChannelsModified] = useState(false)

  // VPN State
  const [vpnConfigs, setVpnConfigs] = useState([])
  const [vpnSha, setVpnSha] = useState(null)
  const [vpnModified, setVpnModified] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [channelFormData, setChannelFormData] = useState({
    name: '',
    streamUrl: '',
    Backupurl: ''
  })
  const [vpnFormData, setVpnFormData] = useState({
    rawConfig: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const chResult = await githubService.fetchChannels()
      setChannels(Array.isArray(chResult.channels) ? chResult.channels : [])
      setChannelsSha(chResult.sha)
      setChannelsModified(false)

      const vpnResult = await githubService.fetchVpnConfigs()
      setVpnConfigs(Array.isArray(vpnResult.configs) ? vpnResult.configs : [])
      setVpnSha(vpnResult.sha)
      setVpnModified(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const parseWireguard = (text) => {
    const lines = text.split('\n')
    const result = {
      interface: {},
      peer: {},
      version: 1,
      last_updated: new Date().toISOString().split('T')[0]
    }

    let currentSection = null
    let peerName = 'Unnamed VPN'

    lines.forEach(line => {
      const cleanLine = line.trim()
      if (!cleanLine) return

      // Extract Name from comment inside [Peer] section or just before it
      if (cleanLine.startsWith('#')) {
        const comment = cleanLine.substring(1).trim()
        if (comment && !comment.includes('Key for') && !comment.includes('Bouncing') && !comment.includes('NAT-PMP') && !comment.includes('VPN Accelerator')) {
          peerName = comment
        }
        return
      }

      if (cleanLine.toLowerCase() === '[interface]') {
        currentSection = 'interface'
        return
      }
      if (cleanLine.toLowerCase() === '[peer]') {
        currentSection = 'peer'
        result.peer.name = peerName
        return
      }

      const [key, ...valueParts] = cleanLine.split('=')
      if (!key || valueParts.length === 0) return

      const k = key.trim().toLowerCase().replace(/\s+/g, '_')
      const v = valueParts.join('=').trim()

      if (currentSection === 'interface') {
        if (k === 'privatekey') result.interface.private_key = v
        else if (k === 'address') result.interface.address = v
        else if (k === 'dns') result.interface.dns = v
      } else if (currentSection === 'peer') {
        if (k === 'publickey') result.peer.public_key = v
        else if (k === 'allowedips') result.peer.allowed_ips = v
        else if (k === 'endpoint') result.peer.endpoint = v
        else if (k === 'persistentkeepalive') result.peer.persistent_keepalive = parseInt(v)
      }
    })

    return result
  }

  const generateRawFromStructured = (structured) => {
    if (!structured || !structured.interface) return ''
    return `[Interface]
PrivateKey = ${structured.interface.private_key || ''}
Address = ${structured.interface.address || ''}
DNS = ${structured.interface.dns || ''}

[Peer]
# ${structured.peer?.name || 'VPN Config'}
PublicKey = ${structured.peer?.public_key || ''}
AllowedIPs = ${structured.peer?.allowed_ips || ''}
Endpoint = ${structured.peer?.endpoint || ''}
PersistentKeepalive = ${structured.peer?.persistent_keepalive || 25}`
  }

  const handleOpenAdd = () => {
    setEditingItem(null)
    if (activeTab === 'channels') {
      setChannelFormData({ name: '', streamUrl: '', Backupurl: '' })
    } else {
      setVpnFormData({ rawConfig: '' })
    }
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    if (activeTab === 'channels') {
      setChannelFormData({
        name: item.name,
        streamUrl: item.streamUrl,
        Backupurl: item.Backupurl || ''
      })
    } else {
      setVpnFormData({
        rawConfig: generateRawFromStructured(item)
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (activeTab === 'channels') {
      if (editingItem) {
        setChannels(channels.map(c => c.id === editingItem.id ? { ...c, ...channelFormData } : c))
      } else {
        const nextId = (Math.max(0, ...channels.map(c => parseInt(c.id))) + 1).toString()
        setChannels([...channels, { id: nextId, ...channelFormData, Backupurl: channelFormData.Backupurl || null }])
      }
      setChannelsModified(true)
    } else {
      try {
        const structured = parseWireguard(vpnFormData.rawConfig)
        if (editingItem) {
          setVpnConfigs(vpnConfigs.map(v => v.id === editingItem.id ? { ...structured, id: editingItem.id } : v))
        } else {
          const nextId = (Math.max(0, ...vpnConfigs.map(v => parseInt(v.id || 0))) + 1).toString()
          setVpnConfigs([...vpnConfigs, { ...structured, id: nextId }])
        }
        setVpnModified(true)
      } catch (err) {
        alert('Failed to parse WireGuard configuration. Please check the format.')
        return
      }
    }

    setIsModalOpen(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      if (activeTab === 'channels') {
        setChannels(channels.filter(c => c.id !== id))
        setChannelsModified(true)
      } else {
        setVpnConfigs(vpnConfigs.filter(v => v.id !== id))
        setVpnModified(true)
      }
    }
  }

  const handlePush = async () => {
    setLoading(true)
    try {
      if (activeTab === 'channels') {
        await githubService.updateChannels(channels, channelsSha)
      } else {
        await githubService.updateVpnConfigs(vpnConfigs, vpnSha)
      }
      await fetchData()
      alert('Successfully synced with GitHub!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = (activeTab === 'channels' ? channels : vpnConfigs).filter(item => {
    const name = activeTab === 'channels' ? item.name : (item.peer?.name || 'Unnamed')
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const isCurrentTabModified = activeTab === 'channels' ? channelsModified : vpnModified

  return (
    <>
      <div className="ambient-bg">
        <div className="ambient-blob"></div>
        <div className="ambient-blob"></div>
      </div>

      <aside className="sidebar">
        <div className="logo-container">
          <Tv size={28} />
          <span>LIVETV ADMIN</span>
        </div>

        <nav className="nav-links">
          <div
            className={`nav-item ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            <LayoutGrid size={20} />
            <span>Channels</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'vpn' ? 'active' : ''}`}
            onClick={() => setActiveTab('vpn')}
          >
            <Shield size={20} />
            <span>VPN Manager</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Database size={16} />
            <span>GitHub Sync</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="actions-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {activeTab === 'channels' ? 'Channel Management' : 'VPN Configuration'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            {isCurrentTabModified ? (
              <span className="status-badge status-unsynced">Unsaved Changes</span>
            ) : (
              <span className="status-badge status-synced">Synced</span>
            )}

            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
              <RefreshCcw size={18} className={loading ? 'rotate' : ''} />
              <span>Refresh</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handlePush}
              disabled={loading || !isCurrentTabModified}
              style={{ opacity: loading || !isCurrentTabModified ? 0.6 : 1 }}
            >
              <Upload size={18} />
              <span>Sync to GitHub</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={22} />
            <span>Error: {error}</span>
          </div>
        )}

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
              <Search style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                className="form-input"
                style={{ paddingLeft: '3.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '0.8rem 1.8rem' }}>
              <PlusCircle size={22} />
              {activeTab === 'channels' ? 'New Channel' : 'New VPN Config'}
            </button>
          </div>

          {loading && (activeTab === 'channels' ? channels.length === 0 : vpnConfigs.length === 0) ? (
            <div className="loading-spinner"></div>
          ) : (
            <div className="grid-container">
              {filteredItems.map(item => (
                <div key={item.id} className="channel-card">
                  <div className="card-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', letterSpacing: '2px' }}>ID: {item.id}</span>
                    </div>
                    <h3 className="card-title">{activeTab === 'channels' ? item.name : (item.peer?.name || 'Unnamed')}</h3>
                    <div className="card-subtitle">
                      {activeTab === 'channels' ? item.streamUrl : (item.peer?.endpoint || 'No Endpoint')}
                    </div>

                    <div className="card-actions">
                      <button className="btn-icon" onClick={() => handleOpenEdit(item)} title="Edit">
                        <Edit3 size={18} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {isModalOpen && (
          <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsModalOpen(false)}>
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                  {editingItem ? 'Edit Item' : 'New Item'}
                </h2>
                <button className="btn-icon" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none' }}>
                  <X size={26} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {activeTab === 'channels' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Channel Name</label>
                      <input
                        className="form-input"
                        required
                        value={channelFormData.name}
                        onChange={e => setChannelFormData({ ...channelFormData, name: e.target.value })}
                        placeholder="e.g. Star Plus HD"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Stream URL</label>
                      <input
                        className="form-input"
                        required
                        value={channelFormData.streamUrl}
                        onChange={e => setChannelFormData({ ...channelFormData, streamUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Backup URL (Optional)</label>
                      <input
                        className="form-input"
                        value={channelFormData.Backupurl}
                        onChange={e => setChannelFormData({ ...channelFormData, Backupurl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">WireGuard Configuration (Paste completely)</label>
                      <textarea
                        className="form-input"
                        required
                        rows={15}
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem', resize: 'vertical' }}
                        value={vpnFormData.rawConfig}
                        onChange={e => setVpnFormData({ ...vpnFormData, rawConfig: e.target.value })}
                        placeholder="[Interface]
PrivateKey = ...
Address = ...
DNS = ...

[Peer]
# SG-FREE#3
PublicKey = ...
AllowedIPs = ...
Endpoint = ..."
                      />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Tip: Include a comment line starting with # below [Peer] to set the name.
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '3rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1.5, padding: '1rem' }}>
                    <Save size={20} />
                    {editingItem ? 'Save Changes' : 'Confirm & Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default App
