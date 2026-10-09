import { useState } from 'react'
import { Building2, Sparkles } from 'lucide-react'
import { ConnectionRequired, Panel, PanelHeader, ScreenHeading, StatusBadge, StepActions } from '../DemoUI'

const MIN_PERSONA_LENGTH = 250

export function PersonaSetup({ controller: c, navigate }) {
  const [touched, setTouched] = useState({ services: false, ai_rules: false })
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const update = (key, value) => c.setProfile({ ...c.profile, [key]: value })
  const servicesLength = c.profile.services.trim().length
  const directivesLength = c.profile.ai_rules.trim().length
  const servicesValid = servicesLength >= MIN_PERSONA_LENGTH
  const directivesValid = directivesLength >= MIN_PERSONA_LENGTH
  const personaValid = servicesValid && directivesValid
  const showServicesError =
    !servicesValid && Boolean(c.profile.services) && (touched.services || submitAttempted)
  const showDirectivesError =
    !directivesValid && Boolean(c.profile.ai_rules) && (touched.ai_rules || submitAttempted)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitAttempted(true)
    if (!personaValid) return
    if (await c.mutate('/profile', c.profile)) navigate('content')
  }

  return (
    <section className="yi-persona-setup">
      <ScreenHeading eyebrow="AI Persona" title="Configure your AI persona">
        Define how LeadHive should represent your business in YouTube comment replies.
      </ScreenHeading>

      {!c.channel ? (
        <ConnectionRequired />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="yi-persona-workspace">
            <Panel className="yi-persona-form">
              <PanelHeader
                title="Persona identity & directives"
                action={<StatusBadge tone="accent">{c.channel.title}</StatusBadge>}
              >
                Set the communication style, core offerings, and behavioral guardrails for AI engagement.
              </PanelHeader>

              <div className="yi-persona-fields">
                <label>
                  <span>Business / Brand Name</span>
                  <span className="yi-field-control">
                    <Building2 size={15} aria-hidden="true" />
                    <input
                      required
                      maxLength={250}
                      value={c.profile.business_name}
                      onChange={e => update('business_name', e.target.value)}
                      placeholder="e.g. Acme Studio"
                    />
                  </span>
                </label>

                <label className="yi-field-wide">
                  <span>Brand Tone</span>
                  <select
                    required
                    value={c.profile.brand_tone}
                    onChange={e => update('brand_tone', e.target.value)}
                  >
                    <option value="">Select a conversational tone</option>
                    <option value="Professional & Helpful">Professional &amp; Helpful</option>
                    <option value="Casual & Friendly">Casual &amp; Friendly</option>
                    <option value="Witty & Humorous">Witty &amp; Humorous</option>
                  </select>
                </label>

                <label className="yi-field-wide">
                  <span>Core Services &amp; Offerings</span>
                  <textarea
                    rows={4}
                    required
                    value={c.profile.services}
                    onChange={e => update('services', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, services: true }))}
                    aria-invalid={showServicesError}
                    aria-describedby="persona-services-meta"
                    placeholder="Briefly describe what your business does and key solutions offered..."
                  />
                  <span id="persona-services-meta" className="yi-field-validation">
                    <span className="yi-character-count">{servicesLength} / {MIN_PERSONA_LENGTH} characters</span>
                    {showServicesError && (
                      <span className="yi-validation-message" role="alert">
                        Please enter at least 250 characters describing your core services and offerings.
                      </span>
                    )}
                  </span>
                </label>

                <label className="yi-field-wide">
                  <span>Rules &amp; Response Directives</span>
                  <textarea
                    rows={4}
                    required
                    value={c.profile.ai_rules}
                    onChange={e => update('ai_rules', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, ai_rules: true }))}
                    aria-invalid={showDirectivesError}
                    aria-describedby="persona-directives-meta"
                    placeholder="E.g., Always direct pricing queries to the website; never make promises on timelines..."
                  />
                  <span id="persona-directives-meta" className="yi-field-validation">
                    <span className="yi-character-count">{directivesLength} / {MIN_PERSONA_LENGTH} characters</span>
                    {showDirectivesError && (
                      <span className="yi-validation-message" role="alert">
                        Please enter at least 250 characters describing your response rules and directives.
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </Panel>

            <aside className="td-panel yi-persona-preview" aria-label="AI persona live preview">
              <div className="yi-preview-header">
                <div>
                  <span className="td-panel-kicker">Live Preview</span>
                  <h2>Persona snapshot</h2>
                </div>
                <StatusBadge tone="accent">
                  {c.profile.business_name ? 'Active Draft' : 'Draft'}
                </StatusBadge>
              </div>

              <div className="yi-persona-core">
                <span className="yi-persona-core-mark">
                  <Sparkles size={20} />
                </span>
                <strong>{c.profile.business_name || 'Your Brand'}</strong>
                <small>{c.profile.brand_tone || 'Voice not selected'}</small>
              </div>

              <dl className="yi-preview-list">
                <div>
                  <dt>Channel</dt>
                  <dd>{c.channel.title}</dd>
                </div>
                <div>
                  <dt>Core Services</dt>
                  <dd>{c.profile.services || 'Describe what LeadHive represents.'}</dd>
                </div>
                <div>
                  <dt>Directives</dt>
                  <dd>{c.profile.ai_rules || 'No communication constraints specified.'}</dd>
                </div>
              </dl>
            </aside>
          </div>

          <StepActions
            back={() => navigate('channel')}
            submit
            busy={c.busy || c.loading}
            disabled={!personaValid}
            label="Save & Select Videos"
          />
        </form>
      )}
    </section>
  )
}