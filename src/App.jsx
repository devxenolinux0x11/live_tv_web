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
  AlertCircle
} from 'lucide-react'
import { githubService } from './githubService'
import './App.css'

function App() {
  const [channels, setChannels] = useState([])
  const [sha, setSha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModified, setIsModified] = useState(false)

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    streamUrl: '',
    Backupurl: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { channels, sha } = await githubService.fetchChannels()
      setChannels(channels)
      setSha(sha)
      setIsModified(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingChannel(null)
    setFormData({ name: '', streamUrl: '', Backupurl: '' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (channel) => {
    setEditingChannel(channel)
    setFormData({
      name: channel.name,
      streamUrl: channel.streamUrl,
      Backupurl: channel.Backupurl || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingChannel) {
      // Edit existing
      const updated = channels.map(c =>
        c.id === editingChannel.id ? { ...c, ...formData } : c
      )
      setChannels(updated)
    } else {
      // Add new
      const nextId = (Math.max(0, ...channels.map(c => parseInt(c.id))) + 1).toString()
      const newChannel = {
        id: nextId,
        ...formData,
        Backupurl: formData.Backupurl || null
      }
      setChannels([...channels, newChannel])
    }

    setIsModified(true)
    setIsModalOpen(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this channel?')) {
      setChannels(channels.filter(c => c.id !== id))
      setIsModified(true)
    }
  }

  const handlePush = async () => {
    setLoading(true)
    try {
      await githubService.updateChannels(channels, sha)
      await fetchData() // Refresh SHA and data
      alert('Successfully synced with GitHub!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <div className="ambient-bg">
        <div className="ambient-blob"></div>
        <div className="ambient-blob"></div>
      </div>

      <div className="main-content" style={{ padding: '3rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header section */}
        <div className="actions-bar">
          <div className="logo-container" style={{ fontSize: '1.4rem' }}>
            <Database size={28} style={{ color: 'var(--primary)' }} />
            <span>CHANNEL MANAGER</span>
          </div>

          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            {isModified ? (
              <span className="status-badge status-unsynced">Unsaved Changes</span>
            ) : (
              <span className="status-badge status-synced">Synced with GitHub</span>
            )}

            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
              <RefreshCcw size={18} className={loading ? 'rotate' : ''} />
              <span>Refresh</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handlePush}
              disabled={loading || !isModified}
              style={{ opacity: loading || !isModified ? 0.6 : 1 }}
            >
              <Upload size={18} />
              <span>Commit & Push</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid hsla(0, 100%, 50%, 0.2)', color: '#ff4757', padding: '1.2rem', borderRadius: '18px', marginBottom: '2.5rem', display: 'flex', gap: '0.8rem', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
            <AlertCircle size={22} />
            <span style={{ fontWeight: '500' }}>Error: {error}</span>
          </div>
        )}

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
              <Search style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
              <input
                type="text"
                placeholder="Search your channels..."
                className="form-input"
                style={{ paddingLeft: '3.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '0.8rem 1.8rem' }}>
              <PlusCircle size={22} />
              New Channel
            </button>
          </div>

          {loading && channels.length === 0 ? (
            <div className="loading-spinner"></div>
          ) : (
            <div className="grid-container">
              {filteredChannels.map(channel => (
                <div key={channel.id} className="channel-card">
                  <div className="card-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', letterSpacing: '2px' }}>ID: {channel.id}</span>
                    </div>
                    <h3 className="card-title">{channel.name}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      {channel.streamUrl}
                    </div>

                    <div className="card-actions">
                      <button className="btn-icon" onClick={() => handleOpenEdit(channel)} title="Edit Channel">
                        <Edit3 size={18} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(channel.id)} title="Delete Channel">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modal */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsModalOpen(false)}>
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
                  {editingChannel ? 'Edit Channel' : 'New Channel'}
                </h2>
                <button className="btn-icon" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none' }}>
                  <X size={26} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Channel Name</label>
                  <input
                    className="form-input"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Star Plus HD"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stream URL (M3U8/MPD)</label>
                  <input
                    className="form-input"
                    required
                    value={formData.streamUrl}
                    onChange={e => setFormData({ ...formData, streamUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Backup URL (Optional)</label>
                  <input
                    className="form-input"
                    value={formData.Backupurl}
                    onChange={e => setFormData({ ...formData, Backupurl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '3rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1.5, padding: '1rem' }}>
                    <Save size={20} />
                    {editingChannel ? 'Save Changes' : 'Confirm & Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
