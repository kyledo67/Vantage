import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getSettings, updateSetting } from '../services/dashboard.js'
import { Skeleton } from '../components/dashboard/atoms.jsx'
import { Panel, PanelEmpty, PanelError, SectionHeader } from '../components/dashboard/states.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useVerification } from '../context/VerificationContext.jsx'
import { VERIFICATION_STATUS } from '../services/verification.js'

const VERIFICATION_LABEL = {
  [VERIFICATION_STATUS.VERIFIED]: 'Verified',
  [VERIFICATION_STATUS.PENDING]: 'Pending',
  [VERIFICATION_STATUS.NOT_STARTED]: 'Required',
  [VERIFICATION_STATUS.DECLINED]: 'Declined',
}

/** Only ever green when the backend itself reports "verified" — every other
 *  state, including a failed status fetch, reads as neutral text. */
function VerificationSection() {
  const { status, country } = useVerification()
  const isVerified = status === VERIFICATION_STATUS.VERIFIED
  const label = status === 'error' ? 'Unavailable' : (VERIFICATION_LABEL[status] ?? 'Unavailable')

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-lg font-semibold text-vantage-text">Verification</h2>
      <Panel className="p-6">
        <dl className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-base text-vantage-text">Status</dt>
            <dd
              className={`flex items-center gap-2 text-base font-medium ${
                isVerified ? 'text-vantage-positive' : 'text-vantage-textDim'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${isVerified ? 'bg-vantage-positive' : 'bg-vantage-borderLight'}`}
              />
              {label}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-base text-vantage-text">Country</dt>
            {/* Only ever a country the backend itself confirmed — never the
                locally-selected one from onboarding, since that's not a
                backend-verified fact (see VerificationContext). */}
            <dd className="text-base text-vantage-textDim">
              {country ? `${country.flag} ${country.name}` : 'Not confirmed'}
            </dd>
          </div>
        </dl>
        {!isVerified && status !== 'error' && (
          <Link
            to={
              status === VERIFICATION_STATUS.PENDING
                ? '/verify/pending'
                : status === VERIFICATION_STATUS.DECLINED
                  ? '/verify/declined'
                  : '/verify'
            }
            className="mt-5 flex min-h-[48px] w-fit items-center rounded-full bg-vantage-accent px-6 text-sm font-semibold text-vantage-ctaText transition-opacity hover:opacity-90"
          >
            {status === VERIFICATION_STATUS.PENDING ? 'Check status' : 'Start verification'}
          </Link>
        )}
      </Panel>
    </section>
  )
}

const controlClass =
  'h-14 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-5 text-base text-vantage-text focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent'

/** Field rendering is driven by the backend's `type`, so new preferences
 *  can be added server-side without touching this file. */
function SettingField({ field, onChange, saving }) {
  const [value, setValue] = useState(field.value ?? '')

  const commit = (next) => {
    setValue(next)
    onChange(field.id, next)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-5 border-b border-vantage-border/60 min-h-[100px] px-5 py-5 last:border-b-0">
      <div className="min-w-0 flex-1">
        {field.label && <p className="text-base text-vantage-text">{field.label}</p>}
        {field.description && (
          <p className="mt-0.5 text-sm text-vantage-textDim">{field.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {saving && <span className="text-xs text-vantage-textDim">Saving…</span>}

        {field.type === 'toggle' && (
          <label className="flex items-center gap-2.5">
            <span className="sr-only">{field.label}</span>
            <input
              type="checkbox"
              checked={Boolean(value)}
              disabled={field.readOnly}
              onChange={(e) => commit(e.target.checked)}
              className="h-5 w-5 accent-[#CE63E9]"
            />
          </label>
        )}

        {field.type === 'select' && (
          <label>
            <span className="sr-only">{field.label}</span>
            <select
              value={value}
              disabled={field.readOnly}
              onChange={(e) => commit(e.target.value)}
              className={controlClass}
            >
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {(field.type === 'text' || field.type === 'email') && (
          <label>
            <span className="sr-only">{field.label}</span>
            <input
              type={field.type}
              value={value}
              readOnly={field.readOnly}
              onChange={(e) => setValue(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              className={`${controlClass} w-56`}
            />
          </label>
        )}

        {field.type === 'action' && (
          <button
            type="button"
            onClick={() => onChange(field.id, true)}
            className="flex min-h-[56px] items-center rounded-full border border-vantage-border px-5 text-sm font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent"
          >
            {field.actionLabel || 'Manage'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const settings = useAsync(getSettings, [])
  const { logout } = useAuth()
  const [savingId, setSavingId] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const handleChange = useCallback(async (fieldId, value) => {
    setSavingId(fieldId)
    setSaveError(null)
    try {
      await updateSetting(fieldId, value)
    } catch (err) {
      setSaveError(err?.message || 'That change could not be saved.')
    } finally {
      setSavingId(null)
    }
  }, [])

  const sections = settings.data?.sections ?? []

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8">
      <SectionHeader title="Settings" description="Your account, notifications, and preferences." />

      <VerificationSection />

      {saveError && (
        <p className="rounded-lg border border-vantage-danger/40 bg-vantage-danger/10 px-5 py-4 text-sm text-vantage-text">
          {saveError}
        </p>
      )}

      {/* Placeholders until account data arrives — never invented values. */}
      {(settings.status === 'loading' || settings.status === 'idle') && (
        <div className="flex flex-col gap-5" aria-busy="true">
          <span className="sr-only" aria-live="polite">
            Loading account…
          </span>
          {[0, 1, 2].map((s) => (
            <Panel key={s} className="p-5">
              <Skeleton className="h-3 w-32" />
              <div className="mt-5 flex flex-col gap-4">
                {[0, 1, 2].map((f) => (
                  <div key={f} className="flex items-center justify-between gap-5">
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-2.5 w-40" />
                      <Skeleton className="h-2.5 w-56" />
                    </div>
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {settings.status === 'error' && (
        <Panel>
          <PanelError
            title="Couldn't load your settings"
            description="Your preferences are unavailable right now."
            onRetry={settings.refetch}
          />
        </Panel>
      )}

      {settings.status === 'success' && sections.length === 0 && (
        <Panel>
          <PanelEmpty
            title="No settings available"
            description="Account preferences will appear here once the service provides them."
          />
        </Panel>
      )}

      {settings.status === 'success' &&
        sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-2.5">
            <div>
              {section.title && (
                <h2 className="text-lg font-semibold text-vantage-text">{section.title}</h2>
              )}
              {section.description && (
                <p className="mt-0.5 text-sm text-vantage-textDim">{section.description}</p>
              )}
            </div>
            <Panel>
              {(section.fields ?? []).map((field) => (
                <SettingField
                  key={field.id}
                  field={field}
                  onChange={handleChange}
                  saving={savingId === field.id}
                />
              ))}
            </Panel>
          </section>
        ))}

      {/* Sign-out is local session state, so it works regardless of the API. */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg font-semibold text-vantage-text">Session</h2>
        <Panel className="flex flex-wrap items-center justify-between gap-5 p-6">
          <p className="text-base text-vantage-textDim">Sign out of Vantage on this device.</p>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-[56px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-text transition-colors hover:border-vantage-danger hover:text-vantage-danger"
          >
            Sign out
          </button>
        </Panel>
      </section>
    </div>
  )
}
