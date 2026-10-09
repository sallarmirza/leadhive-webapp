import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ImageIcon,
  Info,
  LoaderCircle,
  MessageSquare,
  Play,
  ThumbsUp,
  Wand2,
} from 'lucide-react'
import {
  ConnectionRequired,
  EmptyState,
  Panel,
  PanelHeader,
  ResourceStatus,
  ScreenHeading,
  StatusBadge,
  StepActions,
} from '../DemoUI'
import { useYoutubeResource } from '../hooks'
import { youtubeRequest } from '../api'

// ─── Defensive normalizers ─────────────────────────────────────────────

function pick(obj, ...keys) {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeComment(raw) {
  if (!raw || typeof raw !== 'object') return null

  const inner = raw.snippet?.topLevelComment?.snippet || raw.snippet || raw

  const id =
    stringValue(raw.youtube_comment_id) ||
    stringValue(raw.id) ||
    stringValue(raw.comment_id) ||
    stringValue(raw.commentId) ||
    stringValue(inner.id)

  const author =
    stringValue(pick(inner, 'author', 'authorDisplayName', 'author_name', 'authorName')) ||
    'Unknown'

  const text =
    stringValue(pick(inner, 'text', 'textDisplay', 'textOriginal', 'comment', 'comment_text', 'body')) ||
    ''

  const published =
    stringValue(pick(inner, 'published_at', 'publishedAt', 'timestamp', 'time', 'created_at')) ||
    ''

  const likes = Number(pick(inner, 'likes', 'likeCount', 'like_count') ?? 0) || 0

  const repliesRaw = raw.replies?.comments || raw.replies || inner.replies || []
  const replies = Array.isArray(repliesRaw)
    ? repliesRaw.map(normalizeComment).filter(Boolean)
    : []

  return {
    id: id || text.slice(0, 20),
    author,
    text,
    published,
    likes,
    replies,
    avatar: stringValue(pick(inner, 'authorProfileImageUrl', 'author_profile_image_url', 'avatar_url', 'avatar')) || '',
    aiReply: stringValue(raw.ai_reply) || '',
    isReplied: raw.is_replied === true,
  }
}

function normalizeComments(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.comments)
      ? payload.comments
      : Array.isArray(payload?.items)
        ? payload.items
        : []
  return list.map(normalizeComment).filter(Boolean)
}

function normalizeProfile(payload) {
  const source = payload?.profile || payload?.business_profile || payload?.data || payload
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null

  const hasProfileFields = ['business_name', 'brand_tone', 'services', 'ai_rules']
    .some(key => Object.prototype.hasOwnProperty.call(source, key))
  if (!hasProfileFields) return null

  return {
    business_name: source.business_name || '',
    brand_tone: source.brand_tone || '',
    services: source.services || '',
    ai_rules: source.ai_rules || '',
  }
}

function replySummary(payload) {
  const posted = Math.max(0, Number(payload?.posted) || 0)
  const failed = Math.max(0, Number(payload?.failed) || 0)
  const postedLabel = `${posted} ${posted === 1 ? 'reply' : 'replies'} posted successfully.`
  if (!failed) return postedLabel
  return `${postedLabel} ${failed} failed.`
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function MonitoredVideoCard({ video }) {
  return (
    <section className="yi-command-video-card" aria-labelledby="monitored-video-title">
      <div className="yi-command-video-thumbnail">
        <span className="yi-command-media-fallback" aria-hidden="true">
          <ImageIcon size={25} />
        </span>
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt=""
            onError={event => { event.currentTarget.style.display = 'none' }}
          />
        )}
        <span className="yi-command-youtube-tag"><Play size={12} fill="currentColor" /> YouTube</span>
      </div>

      <div className="yi-command-video-copy">
        <span className="yi-command-card-label">Monitored video</span>
        <h2 id="monitored-video-title">{video.title}</h2>
        <span className="yi-command-video-id">Video ID: {video.video_id}</span>
      </div>

      <a
        className="td-button td-button-secondary yi-command-open-video"
        href={'https://www.youtube.com/watch?v=' + video.video_id}
        target="_blank"
        rel="noreferrer"
      >
        Open on YouTube <ArrowUpRight size={15} />
      </a>
    </section>
  )
}

function VideoContextCard({ description, hasDescription }) {
  return (
    <section className="yi-command-context" aria-labelledby="video-context-title">
      <span className="yi-command-context-icon" aria-hidden="true"><Info size={18} /></span>
      <div>
        <h2 id="video-context-title">About this video</h2>
        <p>{description || 'No video context provided.'}</p>
        {!hasDescription && (
          <span className="yi-command-context-warning" role="status">
            Add a video description in Video Library before generating AI replies.
          </span>
        )}
      </div>
    </section>
  )
}

function CommentSkeleton() {
  return (
    <div className="yi-command-skeletons" role="status" aria-label="Loading comments">
      {[0, 1, 2].map(item => (
        <div className="yi-command-skeleton" key={item}>
          <span className="yi-command-skeleton-avatar" />
          <div>
            <span className="yi-command-skeleton-line is-short" />
            <span className="yi-command-skeleton-line" />
            <span className="yi-command-skeleton-line is-medium" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading comments...</span>
    </div>
  )
}

function CommentCard({ comment }) {
  const initial = comment.author.trim().charAt(0).toUpperCase() || '?'

  return (
    <article className={'yi-command-comment' + (comment.isReplied ? ' is-replied' : '')}>
      <div className="yi-command-comment-main">
        <div className="yi-command-avatar">
          <span aria-hidden="true">{initial}</span>
          {comment.avatar && (
            <img
              src={comment.avatar}
              alt=""
              onError={event => { event.currentTarget.style.display = 'none' }}
            />
          )}
        </div>

        <div className="yi-command-comment-content">
          <header>
            <div>
              <strong>{comment.author}</strong>
              {comment.published && <time dateTime={comment.published}>{formatTime(comment.published)}</time>}
            </div>
            {comment.isReplied && <StatusBadge tone="success">Reply posted</StatusBadge>}
          </header>

          <p className="yi-command-comment-text">{comment.text}</p>

          {comment.likes > 0 && (
            <span className="yi-command-comment-likes"><ThumbsUp size={13} /> {comment.likes}</span>
          )}

          {comment.replies.length > 0 && (
            <div className="yi-command-thread-replies">
              {comment.replies.map(reply => (
                <div key={reply.id}>
                  <strong>{reply.author}</strong>
                  <p>{reply.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {comment.isReplied && (
        <aside className="yi-command-posted-reply" aria-label="Final posted reply">
          <span><CheckCircle2 size={15} /> Final posted reply</span>
          <p>{comment.aiReply || 'Reply posted on YouTube.'}</p>
        </aside>
      )}
    </article>
  )
}

// ─── Screen ────────────────────────────────────────────────────────────

export function CommandCenter({ controller: c, navigate }) {
  const channelId = c.channel?.id
  const [videosRefresh, setVideosRefresh] = useState(0)
  const [commentsRefresh, setCommentsRefresh] = useState(0)

  const postingRef = useRef(false)
  const [postingReplies, setPostingReplies] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  // 1) Video list
  const videosResource = useYoutubeResource(
    channelId ? '/selection-videos/' + encodeURIComponent(channelId) + '?limit=5' : null,
    videosRefresh,
  )
  const profileResource = useYoutubeResource(
    channelId ? '/business-profile/' + encodeURIComponent(channelId) : null,
    videosRefresh,
  )

  const videos = useMemo(() => (Array.isArray(videosResource.data)
    ? videosResource.data
        .map(v => ({
          video_id: v.youtube_video_id,
          channel_id: v.channel_id || channelId,
          title: v.title || 'Untitled video',
          description: v.description || '',
          thumbnail: v.thumbnail || v.thumbnail_url || (v.youtube_video_id
            ? `https://i.ytimg.com/vi/${v.youtube_video_id}/mqdefault.jpg`
            : ''),
          selected: Boolean(v.selected),
          description_required: Boolean(v.description_required),
        }))
        .filter(v => v.video_id)
    : []), [channelId, videosResource.data])

  // The persisted marker is authoritative after a refresh. The controller value
  // only bridges the interval between saving in Video Library and this refetch.
  const persistedSelectedVideo = videos.find(video => video.selected) || null
  const pendingSelectedVideoId = Array.isArray(c.selection) && c.selection.length === 1
    ? c.selection[0]
    : null
  const selectedVideo = persistedSelectedVideo ||
    videos.find(video => video.video_id === pendingSelectedVideoId) ||
    null
  const activeVideoId = selectedVideo?.video_id || null

  function resetAiState() {
    setActionMessage('')
    setActionError('')
  }

  function refreshData() {
    resetAiState()
    setVideosRefresh(n => n + 1)
  }

  function retryComments() {
    if (commentsResource.loading) return
    setCommentsRefresh(n => n + 1)
  }

  // 2) Comments for the selected video
  const commentsResource = useYoutubeResource(
    channelId && activeVideoId
      ? '/comments/' + encodeURIComponent(channelId) + '/' + encodeURIComponent(activeVideoId)
      : null,
    commentsRefresh,
  )

  const commentsData = commentsResource.data
  const comments = useMemo(() => normalizeComments(commentsData), [commentsData])
  const hasUnrepliedComments = comments.some(comment => !comment.isReplied)

  const effectiveDescription = selectedVideo?.description || ''
  const hasVideoDescription = Boolean(effectiveDescription.trim())
  const savedProfile = normalizeProfile(profileResource.data)
  const activeProfile = savedProfile || c.profile
  const hasPersonaContext = Boolean(
    activeProfile.business_name.trim() &&
    activeProfile.brand_tone.trim() &&
    activeProfile.services.trim() &&
    activeProfile.ai_rules.trim(),
  )
  const canGenerateAndPost =
    Boolean(selectedVideo) &&
    !commentsResource.loading &&
    !commentsResource.error &&
    comments.length > 0 &&
    hasUnrepliedComments &&
    hasVideoDescription &&
    hasPersonaContext &&
    !postingReplies

  // ─── AI actions ──────────────────────────────────────────────────────

  async function generateAndPostReplies() {
    if (!channelId || !activeVideoId || !canGenerateAndPost || postingRef.current) return
    postingRef.current = true
    setPostingReplies(true)
    setActionMessage('')
    setActionError('')
    try {
      const result = await youtubeRequest(
        `/ai/${encodeURIComponent(channelId)}/${encodeURIComponent(activeVideoId)}/generate-and-post-replies`,
        { method: 'POST' },
      )
      setActionMessage(replySummary(result))
      setCommentsRefresh(value => value + 1)
    } catch (err) {
      setActionError(err?.message || 'Could not generate and post replies. Please try again.')
    } finally {
      postingRef.current = false
      setPostingReplies(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <section className="yi-command-center">
      <ScreenHeading eyebrow="Operations Console" title="AI Command Center">
        Review YouTube comments and generate and post AI replies directly.
      </ScreenHeading>

      {!c.channel ? (
        <ConnectionRequired />
      ) : (
        <>
          <div className="yi-command-video-state">
            <ResourceStatus
              loading={videosResource.loading}
              error={videosResource.error}
              retry={refreshData}
            />

            {selectedVideo && <MonitoredVideoCard video={selectedVideo} />}

            {!videosResource.loading && !videosResource.error && !selectedVideo && (
              <Panel className="yi-command-selection-state">
                <EmptyState
                  icon={<MessageSquare size={24} />}
                  title="No monitored video selected."
                  action={
                    <button
                      className="td-button td-button-primary"
                      type="button"
                      onClick={() => navigate('content')}
                    >
                      Go to Video Library
                    </button>
                  }
                >
                  Select a video from Video Library first.
                </EmptyState>
              </Panel>
            )}
          </div>

          {selectedVideo && (
            <div className="yi-comments-workspace">
              <VideoContextCard description={effectiveDescription} hasDescription={hasVideoDescription} />

              {/* Comments + posted AI replies */}
              <Panel className="yi-command-comments-panel">
                <header className="yi-command-comments-header">
                  <div className="yi-command-comments-heading">
                    <span aria-hidden="true"><MessageSquare size={20} /></span>
                    <div>
                      <h2>Comments</h2>
                      <p>Comments pulled directly from YouTube for this video.</p>
                    </div>
                  </div>

                  <div className="yi-command-comments-actions">
                    <StatusBadge tone={comments.length ? 'accent' : 'neutral'}>
                      {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                    </StatusBadge>
                    <button
                      className="td-button td-button-primary"
                      onClick={generateAndPostReplies}
                      disabled={!canGenerateAndPost}
                    >
                      {postingReplies ? (
                        <LoaderCircle size={14} className="td-spin" />
                      ) : (
                        <Wand2 size={14} />
                      )}
                      {postingReplies ? 'Generating & Posting...' : 'Generate & Post Replies'}
                    </button>
                  </div>
                </header>

                {actionMessage && (
                  <div className="yi-command-result" role="status">
                    <CheckCircle2 size={17} />
                    <span>{actionMessage}</span>
                  </div>
                )}

                {actionError && (
                  <div className="yi-command-error" role="alert">
                    <AlertCircle size={18} />
                    <div><strong>Unable to post replies.</strong><p>{actionError}</p></div>
                  </div>
                )}

                {commentsResource.loading && <CommentSkeleton />}

                {commentsResource.error && (
                  <div className="yi-command-error yi-command-comments-error" role="alert">
                    <AlertCircle size={18} />
                    <div><strong>Unable to load comments.</strong><p>Please try again.</p></div>
                    <button
                      className="td-button td-button-secondary"
                      type="button"
                      disabled={commentsResource.loading}
                      onClick={retryComments}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {comments.length > 0 ? (
                  <div className="yi-command-comments-feed">
                    {comments.map(comment => <CommentCard comment={comment} key={comment.id} />)}
                  </div>
                ) : (
                  !commentsResource.loading &&
                  !commentsResource.error && (
                    <EmptyState
                      icon={<MessageSquare size={24} />}
                      title="No comments found for this video yet."
                    >
                      As viewers comment on YouTube, they will appear here.
                    </EmptyState>
                  )
                )}
              </Panel>
            </div>
          )}

          {selectedVideo && comments.length > 0 && !hasUnrepliedComments && !commentsResource.loading && (
            <div className="yi-command-all-replied" role="status">
              <CheckCircle2 size={19} />
              <strong>All comments have been replied to.</strong>
            </div>
          )}

          <StepActions
            back={() => navigate('content')}
            next={() => navigate('dashboard')}
            label="Return to Overview"
          />
        </>
      )}
    </section>
  )
}