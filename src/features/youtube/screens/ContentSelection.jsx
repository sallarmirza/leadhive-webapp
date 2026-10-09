import { useMemo, useState } from 'react'
import { ArrowRight, Check, Files, ImageIcon, Info, Play, Search } from 'lucide-react'
import { ConnectionRequired, EmptyState, ResourceStatus } from '../DemoUI'
import { useYoutubeResource } from '../hooks'

const MAX_DESCRIPTION_LENGTH = 500

export function ContentSelection({ controller: c, navigate }) {
  const channelId = c.channel?.id
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [selectionOverride, setSelectionOverride] = useState()
  const [descriptionOverrides, setDescriptionOverrides] = useState({})

  const resource = useYoutubeResource(
    channelId ? '/selection-videos/' + encodeURIComponent(channelId) + '?limit=5' : null,
    refresh,
  )

  const videos = useMemo(() => (Array.isArray(resource.data)
    ? resource.data
        .map(video => ({
          video_id: video.youtube_video_id,
          title: video.title || 'Untitled video',
          thumbnail: video.youtube_video_id
            ? `https://i.ytimg.com/vi/${video.youtube_video_id}/mqdefault.jpg`
            : '',
          description: video.description || '',
        }))
        .filter(video => video.video_id)
    : []), [resource.data])

  const serverSelectedId = useMemo(
    () => Array.isArray(resource.data)
      ? resource.data.find(video => video.selected)?.youtube_video_id || null
      : null,
    [resource.data],
  )
  const serverDescriptions = useMemo(() => Object.fromEntries(
    videos.map(video => [video.video_id, video.description]),
  ), [videos])

  const requestedVideoId = selectionOverride === undefined
    ? serverSelectedId
    : selectionOverride
  const selectedVideoId = videos.some(video => video.video_id === requestedVideoId)
    ? requestedVideoId
    : null
  const selectedVideo = videos.find(video => video.video_id === selectedVideoId) || null
  const descriptions = { ...serverDescriptions, ...descriptionOverrides }
  const normalizedSearch = search.trim().toLowerCase()
  const filteredVideos = normalizedSearch
    ? videos.filter(video =>
        `${video.title} ${descriptions[video.video_id] || ''}`
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : videos

  function selectVideo(videoId) {
    setSelectionOverride(videoId)
    c.setSelection([videoId])
  }

  function updateDescription(videoId, value) {
    setDescriptionOverrides(current => ({
      ...current,
      [videoId]: value.slice(0, MAX_DESCRIPTION_LENGTH),
    }))
  }

  function refreshData() {
    setSelectionOverride(undefined)
    setDescriptionOverrides({})
    setRefresh(value => value + 1)
  }

  async function proceed() {
    if (!selectedVideoId) return
    const payload = [{
      youtube_video_id: selectedVideoId,
      description: descriptions[selectedVideoId] || '',
    }]
    if (await c.mutate('/selection', { videos: payload })) navigate('command-center')
  }

  return (
    <section className="yi-content-library">
      <header className="yi-library-heading">
        <p className="td-eyebrow">Video Library</p>
        <h1 tabIndex={-1}>Choose <span>one video</span> to monitor</h1>
        <p>Select a YouTube video that LeadHive should track, analyze, and reply to.</p>
      </header>

      {!c.channel ? (
        <ConnectionRequired />
      ) : (
        <>
          <aside className="yi-library-guidance">
            <span className="yi-library-guidance-icon" aria-hidden="true"><Info size={18} /></span>
            <div>
              <strong>Only one video can be selected</strong>
              <p>You can monitor one video at a time. Choose the video that best represents your engagement goal.</p>
            </div>
          </aside>

          <div className="yi-library-toolbar">
            <label className="yi-library-search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search videos</span>
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search videos by title, keywords, or tags..."
                disabled={resource.loading}
              />
            </label>
            <span className={'yi-library-count' + (selectedVideo ? ' is-selected' : '')}>
              {selectedVideo ? '1 video selected' : '0 videos selected'}
            </span>
          </div>

          <ResourceStatus
            loading={resource.loading}
            error={resource.error}
            retry={refreshData}
          />

          {filteredVideos.length > 0 && (
            <div className="yi-video-grid">
              {filteredVideos.map(video => {
                const selected = selectedVideoId === video.video_id
                const description = descriptions[video.video_id] || ''
                return (
                  <article
                    className={'yi-video-card' + (selected ? ' is-selected' : '')}
                    key={video.video_id}
                    onClick={() => selectVideo(video.video_id)}
                  >
                    <div className="yi-video-thumbnail">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt="" loading="lazy" />
                      ) : (
                        <span className="yi-thumbnail-empty">
                          <ImageIcon size={22} />
                          <small>No thumbnail</small>
                        </span>
                      )}
                      <label className="yi-video-radio" onClick={event => event.stopPropagation()}>
                        <input
                          type="radio"
                          name="monitored-video"
                          checked={selected}
                          onChange={() => selectVideo(video.video_id)}
                          aria-label={`Select ${video.title}`}
                        />
                        <span aria-hidden="true"><Check size={14} /></span>
                      </label>
                      <span className="yi-youtube-badge"><Play size={12} fill="currentColor" /> YouTube</span>
                      {selected && <span className="yi-selected-badge"><Check size={13} /> Selected</span>}
                    </div>

                    <div className="yi-video-card-body">
                      <h2>{video.title}</h2>
                      <div className="yi-video-description" onClick={event => event.stopPropagation()}>
                        <label htmlFor={`video-description-${video.video_id}`}>
                          Video description <span>(optional)</span>
                        </label>
                        <textarea
                          id={`video-description-${video.video_id}`}
                          rows={3}
                          maxLength={MAX_DESCRIPTION_LENGTH}
                          value={description}
                          onChange={event => updateDescription(video.video_id, event.target.value)}
                          disabled={!selected}
                          placeholder="Describe what this video is about..."
                        />
                        <div className="yi-description-meta">
                          <small>The description helps LeadHive understand the video context for AI-generated engagement.</small>
                          <span>{description.length} / {MAX_DESCRIPTION_LENGTH}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!videos.length && !resource.loading && !resource.error && (
            <EmptyState icon={<Files size={24} />} title="No channel content found.">
              Ensure your connected YouTube channel has public videos uploaded.
            </EmptyState>
          )}

          {videos.length > 0 && !filteredVideos.length && !resource.loading && (
            <EmptyState icon={<Search size={24} />} title="No videos match your search.">
              Try a different title or keyword.
            </EmptyState>
          )}

          <div className="yi-library-action-bar">
            <div className="yi-library-action-summary">
              {selectedVideo?.thumbnail && <img src={selectedVideo.thumbnail} alt="" />}
              <div>
                <strong>{selectedVideo ? '1 video selected' : 'No video selected'}</strong>
                <p>LeadHive will monitor this video for comments, analyze them, and help you reply.</p>
              </div>
            </div>
            <div className="yi-library-actions">
              <button type="button" className="td-button td-button-quiet" onClick={() => navigate('persona')}>
                Cancel
              </button>
              <button
                type="button"
                className="button td-button td-button-primary"
                disabled={!selectedVideoId || c.busy}
                onClick={proceed}
              >
                {c.busy ? 'Saving...' : 'Proceed to Monitor'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}