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
import { useToast } from '../motion/Toast.jsx'
import { PRESS_BUTTON } from '../motion/tokens.js'
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
    <li className="flex flex-wrap items-center justify-between gap-5 border-b border-vantage-border/60 min-h-[100px] px-5 py-5 last:border-b-0">
      <div className="min-w-0 flex-1">
        {alert.title && (
          <p className="truncate text-base font-medium text-vantage-text">{alert.title}</p>
        )}
        {alert.subtitle && (
          <p className="mt-0.5 truncate text-sm text-vantage-textDim">{alert.subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-5 text-sm">
        <StatusIndicator status={alert.status} />
        <button
          type="button"
          onClick={() => onTogglePause(alert.id, !paused)}
          disabled={busy}
          className="flex min-h-[52px] items-center rounded border border-vantage-border px-4 text-sm text-vantage-textDim transition-colors hover:border-vantage-accent hover:text-vantage-accent disabled:opacity-50"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(alert.id)}
          disabled={busy}
          className="flex min-h-[52px] items-center rounded border border-vantage-border px-4 text-sm text-vantage-textDim transition-colors hover:border-vantage-danger hover:text-vantage-danger disabled:opacity-50"
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-b border-vantage-border p-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-wide text-vantage-alert">
            Condition
          </span>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value)}
            className="h-14 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-5 text-base text-vantage-text focus:border-vantage-accent focus:outline-none"
          >
            {ruleTypes.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-wide text-vantage-alert">
            {selected?.valueLabel || 'Threshold'}
          </span>
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={selected?.unit || ''}
            className="h-14 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-5 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-wide text-vantage-alert">
            Applies to
          </span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Market, player, or event"
            className="h-14 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-5 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="text-sm text-vantage-danger">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving || !ruleType}
          className="flex min-h-[62px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create alert'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-[56px] items-center rounded-full border border-vantage-border px-6 text-base text-vantage-textDim hover:text-vantage-text"
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
  const { notify } = useToast()

  const handleTogglePause = useCallback(
    async (id, paused) => {
      setBusyId(id)
      try {
        await setAlertPaused(id, paused)
        await alerts.refetch()
        notify({ title: paused ? 'Alert paused' : 'Alert resumed' })
      } catch (err) {
        notify({
          title: "Couldn't update that alert",
          description: err?.message,
          tone: 'critical',
        })
      } finally {
        setBusyId(null)
      }
    },
    [alerts, notify]
  )

  const handleDelete = useCallback(
    async (id) => {
      setBusyId(id)
      try {
        await deleteAlert(id)
        await alerts.refetch()
        notify({ title: 'Alert deleted' })
      } catch (err) {
        notify({
          title: "Couldn't delete that alert",
          description: err?.message,
          tone: 'critical',
        })
      } finally {
        setBusyId(null)
      }
    },
    [alerts, notify]
  )

  const handleChannel = useCallback(
    async (channelId, enabled) => {
      try {
        await setDeliveryChannel(channelId, enabled)
        await alerts.refetch()
        notify({ title: enabled ? 'Delivery channel enabled' : 'Delivery channel disabled' })
      } catch (err) {
        notify({
          title: "Couldn't change delivery settings",
          description: err?.message,
          tone: 'critical',
        })
      }
    },
    [alerts, notify]
  )

  const data = alerts.data
  const lists = { active: data?.active ?? [], paused: data?.paused ?? [], history: data?.history ?? [] }
  const current = lists[tab]
  const channels = data?.delivery?.channels ?? []
  const canCreate = config.status === 'success' && (config.data?.ruleTypes?.length ?? 0) > 0

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8">
      <SectionHeader
        title="Alerts"
        description="Get notified when a market crosses a threshold you care about."
        actions={
          <motion.button
            type="button"
            whileTap={PRESS_BUTTON}
            onClick={() => setCreating((v) => !v)}
            disabled={!canCreate}
            title={canCreate ? undefined : 'Alert options are unavailable right now'}
            className="flex min-h-[62px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-vantage-border disabled:text-vantage-textDim"
          >
            New alert
          </motion.button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <div role="tablist" aria-label="Alert state" className="flex gap-2.5">
            {TABS.map((t) => (
              <motion.button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                whileTap={PRESS_BUTTON}
                onClick={() => setTab(t.id)}
                className={`flex min-h-[56px] items-center rounded-lg border px-5 text-sm transition-colors ${
                  tab === t.id
                    ? 'border-vantage-accent/50 bg-vantage-raised font-medium text-vantage-alert'
                    : 'border-vantage-border bg-vantage-surface text-vantage-textDim hover:text-vantage-text'
                }`}
              >
                {t.label}
                {alerts.status === 'success' && lists[t.id].length > 0 && (
                  <span className="ml-2 text-xs text-vantage-textDim">
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
                  notify({ title: 'Alert created', tone: 'positive' })
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
                        className="flex flex-wrap items-center justify-between gap-5 border-b border-vantage-border/60 min-h-[100px] px-5 py-5 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          {event.title && (
                            <p className="truncate text-base text-vantage-text">{event.title}</p>
                          )}
                          {event.description && (
                            <p className="mt-0.5 truncate text-sm text-vantage-textDim">
                              {event.description}
                            </p>
                          )}
                        </div>
                        {event.at && (
                          <time dateTime={event.at} className="text-xs text-vantage-textDim">
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
          <Panel className="p-6">
            <h2 className="text-lg font-semibold text-vantage-text">Delivery</h2>
            <ul className="mt-5 flex flex-col gap-5">
              {channels.map((channel) => (
                <li key={channel.id} className="flex min-h-[56px] items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-vantage-text">{channel.label}</p>
                    {channel.description && (
                      <p className="mt-0.5 text-sm text-vantage-textDim">{channel.description}</p>
                    )}
                  </div>
                  <label className="flex flex-shrink-0 items-center gap-2.5">
                    <span className="sr-only">{channel.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(channel.enabled)}
                      onChange={(e) => handleChannel(channel.id, e.target.checked)}
                      className="h-5 w-5 accent-[#CE63E9]"
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
