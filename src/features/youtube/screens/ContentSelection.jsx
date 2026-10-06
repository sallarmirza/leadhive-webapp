import { useEffect, useState } from 'react'
import { Check, Files, ImageIcon } from 'lucide-react'
import { ConnectionRequired, EmptyState, Panel, PanelHeader, ResourceStatus, ScreenHeading, StepActions } from '../DemoUI'
import { useYoutubeResource } from '../hooks'

export function ContentSelection({ controller: c, navigate }) {
  const channelId = c.channel?.id
  const [refresh, setRefresh] = useState(0)
  const [descriptions, setDescriptions] = useState({})

  const resource = useYoutubeResource(
    channelId ? '/selection-videos/' + encodeURIComponent(channelId) + '?limit=5' : null,
    refresh,
  )

  const videos = Array.isArray(resource.data)
    ? resource.data
        .map(v => ({
          video_id: v.youtube_video_id,
          title: v.title || 'Untitled video',
          thumbnail: v.youtube_video_id
            ? `https://i.ytimg.com/vi/${v.youtube_video_id}/mqdefault.jpg`
            : '',
          description: v.description || '',
          description_required: Boolean(v.description_required),
        }))
        .filter(v => v.video_id)
    : []

  const allSelected =
    videos.length > 0 && videos.every(video => c.selection.includes(video.video_id))

  // Seed the checkbox selection and the description drafts from the backend.
  useEffect(() => {
    if (!Array.isArray(resource.data)) return
    const preselected = resource.data
      .filter(v => v.selected)
      .map(v => v.youtube_video_id)
    c.setSelection(preselected)

    // Pre-fill descriptions for videos the user has already saved with their own text.
    const seeded = {}
    resource.data.forEach(v => {
      if (v.description) seeded[v.youtube_video_id] = v.description
    })
    setDescriptions(seeded)
  }, [resource.data])

  function toggle(id) {
    c.setSelection(current =>
      current.includes(id) ? current.filter(value => value !== id) : [...current, id]
    )
  }

  function updateDescription(id, value) {
    setDescriptions(current => ({ ...current, [id]: value }))
  }

  // Block save if any selected video still needs a description and doesn't have one.
  const missingDescriptions = c.selection.filter(id => {
    const video = videos.find(v => v.video_id === id)
    if (!video || !video.description_required) return false
    return !(descriptions[id] || '').trim()
  })
  const canSave = missingDescriptions.length === 0

  return (
    <section className="yi-content-library">
      <div className="td-heading-with-action">
        <ScreenHeading eyebrow="Video Library" title="Select monitored videos">
          Choose the YouTube videos LeadHive should track, analyze, and reply to.
        </ScreenHeading>
        {c.channel && (
          <div className="yi-library-selection">
            <label className="td-select-all">
              <input
                type="checkbox"
                disabled={!videos.length}
                checked={allSelected}
                onChange={() => c.setSelection(allSelected ? [] : videos.map(video => video.video_id))}
              />
              Select All
            </label>
            <span className="yi-selection-count">
              <strong>{c.selection.length}</strong> of {videos.length} selected
            </span>
          </div>
        )}
      </div>

      {!c.channel ? (
        <ConnectionRequired />
      ) : (
        <>
          <ResourceStatus
            loading={resource.loading}
            error={resource.error}
            retry={() => setRefresh(n => n + 1)}
          />

          <Panel className="yi-library-shell">
            <PanelHeader title="Channel uploads">
              {videos.length} {videos.length === 1 ? 'video' : 'videos'} available from {c.channel.title}
            </PanelHeader>

            {videos.length > 0 && (
              <div className="yi-video-grid">
                {videos.map(video => {
                  const selected = c.selection.includes(video.video_id)
                  const needsDescription = selected && video.description_required
                  return (
                    <div className={'yi-video-card ' + (selected ? 'is-selected' : '')} key={video.video_id}>
                      <label className="yi-video-card-main">
                        <input
                          className="yi-video-checkbox"
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggle(video.video_id)}
                          aria-label={'Select ' + video.title}
                        />
                        <span className="yi-video-thumbnail">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt="" loading="lazy" />
                          ) : (
                            <span className="yi-thumbnail-empty">
                              <ImageIcon size={22} />
                              <small>No thumbnail</small>
                            </span>
                          )}
                          <span className="yi-video-selection-mark">
                            <Check size={14} />
                          </span>
                        </span>
                        <span className="yi-video-card-body">
                          <strong>{video.title}</strong>
                          <small>{selected ? 'Monitored' : 'Click to monitor'}</small>
                        </span>
                      </label>

                      {needsDescription && (
                        <div className="yi-video-description">
                          <label>
                            <span>This video has no description on YouTube. Add one so LeadHive can use it for context.</span>
                            <textarea
                              rows={3}
                              maxLength={800}
                              value={descriptions[video.video_id] || ''}
                              onChange={e => updateDescription(video.video_id, e.target.value)}
                              placeholder="Describe what this video is about..."
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!videos.length && !resource.loading && !resource.error && (
              <EmptyState icon={<Files size={24} />} title="No channel content found.">
                Ensure your connected YouTube channel has public videos uploaded.
              </EmptyState>
            )}
          </Panel>

          {missingDescriptions.length > 0 && (
            <p className="td-error" role="alert">
              {missingDescriptions.length} selected video{missingDescriptions.length === 1 ? '' : 's'} still need a description before saving.
            </p>
          )}

          <StepActions
            back={() => navigate('persona')}
            busy={c.busy}
            disabled={resource.loading || Boolean(resource.error) || !canSave}
            next={async () => {
              const payload = c.selection.map(id => ({
                youtube_video_id: id,
                description: descriptions[id] || '',
              }))
              if (await c.mutate('/selection', { videos: payload })) navigate('dashboard')
            }}
            label="Save & Open Dashboard"
          />
        </>
      )}
    </section>
  )
}