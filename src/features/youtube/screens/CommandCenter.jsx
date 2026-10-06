import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
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

  return { id: id || text.slice(0, 20), author, text, published, likes, replies }
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

function normalizeDraft(raw) {
  if (!raw || typeof raw !== 'object') return null

  const commentId = stringValue(raw.youtube_comment_id)
  if (!commentId) return null

  return {
    commentId,
    replyText: raw.ai_reply || '',
    isReplied: Boolean(raw.is_replied),
    skipped: Boolean(raw.skipped),
    error: raw.error || null,
  }
}

function normalizeDraftBatch(payload) {
  const list = Array.isArray(payload?.results) ? payload.results : []
  const map = {}
  for (const item of list) {
    const draft = normalizeDraft(item)
    if (draft) map[draft.commentId] = draft
  }
  return {
    drafts: map,
    nextOffset: Number(payload?.next_offset ?? 0) || 0,
    hasMore: Boolean(payload?.has_more),
  }
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleString()
}

// ─── Screen ────────────────────────────────────────────────────────────

export function CommandCenter({ controller: c, navigate }) {
  const channelId = c.channel?.id
  const [refresh, setRefresh] = useState(0)
  const [selectedVideoId, setSelectedVideoId] = useState(null)

  // AI state
  const [drafts, setDrafts] = useState({})          // { commentId: draft }
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [busyIds, setBusyIds] = useState({})        // { commentId: 'regenerate' | 'post' }
  const [actionError, setActionError] = useState('')

  // 1) Video list
  const videosResource = useYoutubeResource(
    channelId ? '/selection-videos/' + encodeURIComponent(channelId) + '?limit=5' : null,
    refresh,
  )

  const videos = Array.isArray(videosResource.data)
    ? videosResource.data
        .map(v => ({
          video_id: v.youtube_video_id,
          title: v.title || 'Untitled video',
          description: v.description || '',
          description_required: Boolean(v.description_required),
        }))
        .filter(v => v.video_id)
    : []

  useEffect(() => {
    if (videos.length === 0) return
    if (selectedVideoId && videos.some(v => v.video_id === selectedVideoId)) return
    setSelectedVideoId(videos[0].video_id)
  }, [videos, selectedVideoId])

  // Reset AI state when the selected video changes
  useEffect(() => {
    setDrafts({})
    setNextOffset(0)
    setHasMore(false)
    setActionError('')
    setBusyIds({})
  }, [selectedVideoId])

  // 2) Comments for the selected video
  const commentsResource = useYoutubeResource(
    channelId && selectedVideoId
      ? '/comments/' + encodeURIComponent(channelId) + '/' + encodeURIComponent(selectedVideoId)
      : null,
    refresh,
  )

  const comments = useMemo(
    () => normalizeComments(commentsResource.data),
    [commentsResource.data],
  )

  const selectedVideo = videos.find(v => v.video_id === selectedVideoId) || null

  // ─── AI actions ──────────────────────────────────────────────────────

  async function generateDrafts(append = false) {
    if (!channelId || !selectedVideoId) return
    setGenerating(true)
    setActionError('')
    try {
      const offset = append ? nextOffset : 0
      const result = await youtubeRequest(
        `/ai/${encodeURIComponent(channelId)}/${encodeURIComponent(selectedVideoId)}/generate-replies?offset=${offset}&limit=20`,
        { method: 'POST' },
      )
      const batch = normalizeDraftBatch(result)
      setDrafts(current => (append ? { ...current, ...batch.drafts } : batch.drafts))
      setNextOffset(batch.nextOffset)
      setHasMore(batch.hasMore)
    } catch (err) {
      setActionError(err?.message || 'Could not generate replies.')
    } finally {
      setGenerating(false)
    }
  }

  async function regenerateDraft(commentId) {
    if (!channelId || !selectedVideoId) return
    setBusyIds(current => ({ ...current, [commentId]: 'regenerate' }))
    setActionError('')
    try {
      const result = await youtubeRequest(
        `/ai/${encodeURIComponent(channelId)}/${encodeURIComponent(selectedVideoId)}/comments/${encodeURIComponent(commentId)}/regenerate-reply`,
        { method: 'POST' },
      )
      const fresh = normalizeDraft(result)
      if (fresh) setDrafts(current => ({ ...current, [fresh.commentId]: fresh }))
    } catch (err) {
      setActionError(err?.message || 'Could not regenerate the reply.')
    } finally {
      setBusyIds(current => {
        const next = { ...current }
        delete next[commentId]
        return next
      })
    }
  }

  async function postDraft(commentId) {
    if (!channelId || !selectedVideoId) return
    setBusyIds(current => ({ ...current, [commentId]: 'post' }))
    setActionError('')
    try {
      await youtubeRequest(
        `/ai/${encodeURIComponent(channelId)}/${encodeURIComponent(selectedVideoId)}/comments/${encodeURIComponent(commentId)}/post-reply`,
        { method: 'POST' },
      )
      setDrafts(current => {
        const next = { ...current }
        if (next[commentId]) {
          next[commentId] = { ...next[commentId], isReplied: true }
        }
        return next
      })
    } catch (err) {
      setActionError(err?.message || 'Could not post the reply.')
    } finally {
      setBusyIds(current => {
        const next = { ...current }
        delete next[commentId]
        return next
      })
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <section className="yi-command-center">
      <ScreenHeading eyebrow="Operations Console" title="AI Command Center">
        Review YouTube comments, generate AI reply drafts, and post responses live.
      </ScreenHeading>

      {!c.channel ? (
        <ConnectionRequired />
      ) : (
        <>
          {/* Video picker */}
          <Panel className="yi-comments-picker-panel">
            <PanelHeader
              title="Select a video"
              action={
                <button
                  className="td-button td-button-secondary"
                  onClick={() => setRefresh(n => n + 1)}
                  disabled={videosResource.loading}
                >
                  {videosResource.loading ? <LoaderCircle size={14} className="td-spin" /> : null}
                  Refresh
                </button>
              }
            >
              {videos.length
                ? 'Choose which monitored video you want to review comments for.'
                : 'No monitored videos yet. Select videos in the Video Library first.'}
            </PanelHeader>

            <ResourceStatus
              loading={videosResource.loading}
              error={videosResource.error}
              retry={() => setRefresh(n => n + 1)}
            />

            {videos.length > 0 && (
              <div className="yi-comments-picker">
                <label>
                  <span>Monitored video</span>
                  <select
                    value={selectedVideoId || ''}
                    onChange={e => setSelectedVideoId(e.target.value)}
                  >
                    {videos.map(v => (
                      <option key={v.video_id} value={v.video_id}>
                        {v.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </Panel>

          {selectedVideo && (
            <div className="yi-comments-workspace">
              {/* Video summary */}
              <Panel className="yi-comments-video">
                <PanelHeader
                  eyebrow="Video"
                  title={selectedVideo.title}
                  action={
                    <a
                      className="td-button td-button-secondary"
                      href={'https://www.youtube.com/watch?v=' + selectedVideo.video_id}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on YouTube <ArrowUpRight size={14} />
                    </a>
                  }
                >
                  <span className="yi-comments-video-id">{selectedVideo.video_id}</span>
                </PanelHeader>

                <div className="yi-comments-video-body">
                  <p className="yi-comments-description">
                    {selectedVideo.description || 'No description on YouTube.'}
                  </p>
                  {selectedVideo.description_required && (
                    <p className="td-error" role="status">
                      This video has no description. Add one in the Video Library before enabling AI replies.
                    </p>
                  )}
                </div>
              </Panel>

              {/* Comments + AI drafts */}
              <Panel className="yi-comments-list-panel">
                <PanelHeader
                  title="Comments"
                  action={
                    <div className="yi-comments-actions">
                      <StatusBadge tone={comments.length ? 'accent' : 'neutral'}>
                        {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                      </StatusBadge>
                      <button
                        className="td-button td-button-primary"
                        onClick={() => generateDrafts(false)}
                        disabled={generating || !comments.length || Boolean(commentsResource.error)}
                      >
                        {generating ? (
                          <LoaderCircle size={14} className="td-spin" />
                        ) : (
                          <Wand2 size={14} />
                        )}
                        {generating ? 'Generating…' : 'Generate AI Drafts'}
                      </button>
                    </div>
                  }
                >
                  {Object.keys(drafts).length
                    ? 'AI drafts ready. Review, regenerate, or post each reply.'
                    : 'Comments pulled directly from YouTube for this video.'}
                </PanelHeader>

                {actionError && (
                  <p className="td-error" role="alert">
                    {actionError}
                  </p>
                )}

                <ResourceStatus
                  loading={commentsResource.loading}
                  error={commentsResource.error}
                  retry={() => setRefresh(n => n + 1)}
                />

                {comments.length > 0 ? (
                  <div className="yi-comments-feed">
                    {comments.map(comment => {
                      const draft = drafts[comment.id] || null
                      const busy = busyIds[comment.id]
                      return (
                        <article className="yi-comment" key={comment.id}>
                          <header>
                            <strong>{comment.author}</strong>
                            {comment.published && <time>{formatTime(comment.published)}</time>}
                          </header>
                          <p className="yi-comment-text">{comment.text}</p>
                          {comment.likes > 0 && (
                            <span className="yi-comment-likes">{comment.likes} likes</span>
                          )}

                          {comment.replies.length > 0 && (
                            <div className="yi-comment-replies">
                              {comment.replies.map(reply => (
                                <div className="yi-comment-reply" key={reply.id}>
                                  <strong>{reply.author}</strong>
                                  <p>{reply.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {draft && (
                            <div className={'yi-comment-draft' + (draft.isReplied ? ' is-posted' : '')}>
                              <div className="yi-comment-draft-head">
                                <Sparkles size={14} />
                                <span>AI Draft</span>
                                {draft.isReplied && <StatusBadge tone="success">Posted</StatusBadge>}
                                {draft.skipped && <StatusBadge tone="warning">Skipped</StatusBadge>}
                              </div>

                              {draft.error ? (
                                <p className="td-error" role="alert">{draft.error}</p>
                              ) : (
                                <>
                                  <textarea
                                    className="yi-comment-draft-text"
                                    rows={3}
                                    maxLength={800}
                                    value={draft.replyText}
                                    onChange={e =>
                                      setDrafts(current => ({
                                        ...current,
                                        [comment.id]: { ...current[comment.id], replyText: e.target.value },
                                      }))
                                    }
                                    disabled={draft.isReplied || draft.skipped || !draft.replyText}
                                    placeholder={draft.skipped ? 'This comment was skipped.' : 'AI reply will appear here.'}
                                  />
                                  <div className="yi-comment-draft-actions">
                                    <button
                                      className="td-button td-button-secondary"
                                      onClick={() => regenerateDraft(comment.id)}
                                      disabled={Boolean(busy) || draft.isReplied}
                                    >
                                      {busy === 'regenerate' ? (
                                        <LoaderCircle size={14} className="td-spin" />
                                      ) : (
                                        <RefreshCw size={14} />
                                      )}
                                      Regenerate
                                    </button>
                                    <button
                                      className="td-button td-button-primary"
                                      onClick={() => postDraft(comment.id)}
                                      disabled={Boolean(busy) || draft.isReplied || !draft.replyText.trim()}
                                    >
                                      {busy === 'post' ? (
                                        <LoaderCircle size={14} className="td-spin" />
                                      ) : (
                                        <Send size={14} />
                                      )}
                                      {draft.isReplied ? 'Posted' : busy === 'post' ? 'Posting…' : 'Post Reply'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  !commentsResource.loading &&
                  !commentsResource.error && (
                    <EmptyState
                      icon={<MessageSquare size={24} />}
                      title="No comments on this video yet."
                    >
                      As viewers comment on YouTube, they will appear here.
                    </EmptyState>
                  )
                )}

                {hasMore && (
                  <div className="yi-comments-load-more">
                    <button
                      className="td-button td-button-secondary"
                      onClick={() => generateDrafts(true)}
                      disabled={generating}
                    >
                      {generating ? <LoaderCircle size={14} className="td-spin" /> : null}
                      Load more drafts
                    </button>
                  </div>
                )}
              </Panel>
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