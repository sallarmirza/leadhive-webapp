import { ArrowRight, Check, Link2 } from 'lucide-react'
import { youtubeAuthUrl } from '../api'
import { ConnectButton, EmptyState, Panel, PanelHeader, ScreenHeading, StatusBadge, StepActions } from '../DemoUI'

export function ChannelSetup({ controller: c, navigate }) {
  const channels = c.session?.channels || []
  const connectionFailed = new URLSearchParams(window.location.search).has('connection')

  return (
    <section className="yi-channel-setup">
      <div className="td-heading-with-action">
        <ScreenHeading eyebrow="Channel Setup" title="Connect your YouTube workspace">
          Authorize YouTube, choose the channel LeadHive should manage, and keep the workspace tied to verified channel data.
        </ScreenHeading>
        {channels.length > 0 && (
          <a href={youtubeAuthUrl('/auth/youtube/login')} className="td-button td-button-secondary yi-connect-another">
            <Link2 size={15} /> Connect another account
          </a>
        )}
      </div>

      {connectionFailed && (
        <p className="td-error" role="alert">
          The connection could not be completed. Try connecting again.
        </p>
      )}

      <div className="yi-channel-onboarding">
        <aside className="yi-channel-intro" aria-label="YouTube connection onboarding">
          <span className="yi-channel-intro-badge">
            <Link2 size={15} /> Google OAuth connection
          </span>
          <h2>Bring your channel into the LeadHive command layer.</h2>
          <p>
            LeadHive uses the connected channel to read uploads, load performance metrics, and prepare AI engagement from your configured brand persona.
          </p>
          {!channels.length && <ConnectButton />}

          <div className="yi-channel-steps">
            <div className="yi-channel-step">
              <span>1</span>
              <div>
                <strong>Authorize YouTube</strong>
                <small>Use the verified OAuth flow to grant LeadHive channel access.</small>
              </div>
            </div>
            <div className="yi-channel-step">
              <span>2</span>
              <div>
                <strong>Select the operating channel</strong>
                <small>Pick the account LeadHive should analyze and manage.</small>
              </div>
            </div>
            <div className="yi-channel-step">
              <span>3</span>
              <div>
                <strong>Configure AI engagement</strong>
                <small>Move into persona setup with channel context already attached.</small>
              </div>
            </div>
          </div>
        </aside>

        <Panel className="yi-channel-panel">
          <PanelHeader title="Connected channels">
            {channels.length
              ? `${channels.length} ${channels.length === 1 ? 'channel' : 'channels'} available`
              : 'Connect a channel to begin'}
          </PanelHeader>
          <div className="yi-account-list">
            {channels.length ? (
              channels.map(channel => {
                const selected = c.session?.selected === channel.id
                return (
                  <article className={'yi-channel-row ' + (selected ? 'is-selected' : '')} key={channel.id}>
                    <div className="yi-account-avatar">
                      {channel.thumbnail ? (
                        <img className="yi-channel-avatar" src={channel.thumbnail} alt="" />
                      ) : (
                        <Link2 size={20} />
                      )}
                    </div>
                    <div className="yi-account-details">
                      <StatusBadge tone={selected ? 'accent' : 'success'}>
                        {selected ? 'Selected channel' : 'Connected'}
                      </StatusBadge>
                      <h3>{channel.title}</h3>
                      <p>YouTube channel</p>
                    </div>
                    {selected && (
                      <span className="yi-row-check" aria-label="Selected">
                        <Check size={16} />
                      </span>
                    )}
                    <button
                      disabled={c.busy}
                      className="td-button td-button-secondary yi-account-select"
                      onClick={async () => {
                        if (await c.chooseChannel(channel.id)) navigate('persona')
                      }}
                    >
                      Select <ArrowRight size={15} />
                    </button>
                  </article>
                )
              })
            ) : (
              <EmptyState icon={<Link2 size={24} />} title="No channel connected yet." action={<ConnectButton />}>
                Your connected channels will appear here after authentication.
              </EmptyState>
            )}
          </div>
        </Panel>
      </div>

      <StepActions
        back={() => navigate('platform')}
        next={() => navigate('persona')}
        disabled={!c.channel}
      />
    </section>
  )
}