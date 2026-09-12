import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useAsync } from '../hooks/useAsync.js'
import {
  createAlert,
  deleteAlert,
  getAlertConfig,
  getAlerts,
  setAlertPaused,
  setDeliveryChannel,
} from '../services/dashboard.js'
import { StatusIndicator } from '../components/dashboard/atoms.jsx'
import {
  DataPanel,
  Panel,
  PanelEmpty,
  SectionHeader,
} from '../components/dashboard/states.jsx'

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'history', label: 'History' },
]

function AlertRow({ alert, onTogglePause, onDelete, paused, busy }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border-b border-vantage-border/60 px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        {alert.title && (
          <p className="truncate text-sm font-medium text-vantage-text">{alert.title}</p>
        )}
        {alert.subtitle && (
          <p className="truncate text-xs text-vantage-textDim">{alert.subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <StatusIndicator status={alert.status} />
        <button
          type="button"
          onClick={() => onTogglePause(alert.id, !paused)}
          disabled={busy}
          className="rounded border border-vantage-border px-2 py-1 text-vantage-textDim transition-colors hover:border-vantage-accent hover:text-vantage-accent disabled:opacity-50"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(alert.id)}
          disabled={busy}
          className="rounded border border-vantage-border px-2 py-1 text-vantage-textDim transition-colors hover:border-vantage-danger hover:text-vantage-danger disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  )
}

/** Rule types come from the backend; without them creation stays disabled. */
function NewAlertForm({ config, onCreated, onCancel }) {
  const ruleTypes = config?.ruleTypes ?? []
  const [ruleType, setRuleType] = useState(ruleTypes[0]?.id ?? '')
  const [threshold, setThreshold] = useState('')
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const selected = ruleTypes.find((r) => r.id === ruleType)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createAlert({ ruleType, threshold, target })
      onCreated()
    } catch (err) {
      setError(err?.message || 'Could not create this alert.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-b border-vantage-border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-vantage-alert">Condition</span>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value)}
            className="h-10 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-3 text-xs text-vantage-text focus:border-vantage-accent focus:outline-none"
          >
            {ruleTypes.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-vantage-alert">
            {selected?.valueLabel || 'Threshold'}
          </span>
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={selected?.unit || ''}
            className="h-10 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-3 text-xs text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-vantage-alert">Applies to</span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Market, player, or event"
            className="h-10 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-3 text-xs text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="text-xs text-vantage-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !ruleType}
          className="rounded-full bg-vantage-accent px-4 py-1.5 text-xs font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create alert'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-vantage-border px-4 py-1.5 text-xs text-vantage-textDim hover:text-vantage-text"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function AlertsPage() {
  const alerts = useAsync(getAlerts, [])
  const config = useAsync(getAlertConfig, [])
  const [tab, setTab] = useState('active')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const handleTogglePause = useCallback(
    async (id, paused) => {
      setBusyId(id)
      try {
        await setAlertPaused(id, paused)
        await alerts.refetch()
      } finally {
        setBusyId(null)
      }
    },
    [alerts]
  )

  const handleDelete = useCallback(
    async (id) => {
      setBusyId(id)
      try {
        await deleteAlert(id)
        await alerts.refetch()
      } finally {
        setBusyId(null)
      }
    },
    [alerts]
  )

  const handleChannel = useCallback(
    async (channelId, enabled) => {
      await setDeliveryChannel(channelId, enabled)
      await alerts.refetch()
    },
    [alerts]
  )

  const data = alerts.data
  const lists = { active: data?.active ?? [], paused: data?.paused ?? [], history: data?.history ?? [] }
  const current = lists[tab]
  const channels = data?.delivery?.channels ?? []
  const canCreate = config.status === 'success' && (config.data?.ruleTypes?.length ?? 0) > 0

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-6">
      <SectionHeader
        title="Alerts"
        description="Get notified when a market crosses a threshold you care about."
        actions={
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreating((v) => !v)}
            disabled={!canCreate}
            title={canCreate ? undefined : 'Alert options are unavailable right now'}
            className="rounded-full bg-vantage-accent px-4 py-2 text-xs font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-vantage-border disabled:text-vantage-textDim"
          >
            New alert
          </motion.button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-3">
          <div role="tablist" aria-label="Alert state" className="flex gap-2">
            {TABS.map((t) => (
              <motion.button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={() => setTab(t.id)}
                className={`rounded-lg border px-3.5 py-2 text-xs transition-colors ${
                  tab === t.id
                    ? 'border-vantage-accent/50 bg-vantage-raised font-medium text-vantage-alert'
                    : 'border-vantage-border bg-vantage-surface text-vantage-textDim hover:text-vantage-text'
                }`}
              >
                {t.label}
                {alerts.status === 'success' && lists[t.id].length > 0 && (
                  <span className="ml-1.5 text-[10px] text-vantage-textDim">
                    {lists[t.id].length}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          <Panel>
            {creating && canCreate && (
              <NewAlertForm
                config={config.data}
                onCancel={() => setCreating(false)}
                onCreated={() => {
                  setCreating(false)
                  alerts.refetch()
                }}
              />
            )}

            <DataPanel
              status={alerts.status}
              isEmpty={current.length === 0}
              onRetry={alerts.refetch}
              empty={
                <PanelEmpty
                  title={
                    tab === 'history' ? 'No alert activity yet' : `No ${tab} alerts`
                  }
                  description={
                    tab === 'history'
                      ? 'Triggered alerts will be recorded here.'
                      : 'Create an alert to be notified when a market meets your condition.'
                  }
                />
              }
            >
              <ul>
                {tab === 'history'
                  ? current.map((event) => (
                      <li
                        key={event.id}
                        className="flex flex-wrap items-center justify-between gap-4 border-b border-vantage-border/60 px-4 py-3.5 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          {event.title && (
                            <p className="truncate text-sm text-vantage-text">{event.title}</p>
                          )}
                          {event.description && (
                            <p className="truncate text-xs text-vantage-textDim">
                              {event.description}
                            </p>
                          )}
                        </div>
                        {event.at && (
                          <time
                            dateTime={event.at}
                            className="text-xs text-vantage-textDim"
                          >
                            {new Date(event.at).toLocaleString()}
                          </time>
                        )}
                      </li>
                    ))
                  : current.map((alert) => (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        paused={tab === 'paused'}
                        busy={busyId === alert.id}
                        onTogglePause={handleTogglePause}
                        onDelete={handleDelete}
                      />
                    ))}
              </ul>
            </DataPanel>
          </Panel>
        </div>

        {/* Delivery preferences render only when the backend lists channels. */}
        {alerts.status === 'success' && channels.length > 0 && (
          <Panel className="p-4">
            <h2 className="text-sm font-semibold text-vantage-text">Delivery</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {channels.map((channel) => (
                <li key={channel.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-vantage-text">{channel.label}</p>
                    {channel.description && (
                      <p className="text-[11px] text-vantage-textDim">{channel.description}</p>
                    )}
                  </div>
                  <label className="flex flex-shrink-0 items-center gap-2">
                    <span className="sr-only">{channel.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(channel.enabled)}
                      onChange={(e) => handleChannel(channel.id, e.target.checked)}
                      className="h-4 w-4 accent-[#CE63E9]"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}
