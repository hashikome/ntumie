import { type CommentThreads, type CommentView, maxCommentLength } from "@ntumie/types";
import type { ReactNode } from "react";
import { AppForm } from "./app-form";
import { Avatar } from "./avatar";
import { CommentCounter } from "./comment-counter";
import { CommentFocus } from "./comment-focus";
import { ComposerCancel } from "./composer-cancel";
import { FormNotice } from "./form-notice";
import { ShortTime } from "./local-time";
import { Person } from "./primitives";

// The discussion beside a collection. Everything is a native form posting to
// /forms/comment-*, so it works without JavaScript; the API decides every
// permission and the forms return here with a notice and an anchor.
function ActionForm({
  action,
  id,
  returnTo,
  children,
  className,
}: {
  action: string;
  id: string;
  returnTo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppForm action={`/forms/${action}`} method="post" className={className}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {children}
    </AppForm>
  );
}

function Composer({
  collectionId,
  parentId,
  returnTo,
  label,
  placeholder,
}: {
  collectionId: string;
  parentId?: string;
  returnTo: string;
  label: string;
  placeholder: string;
}) {
  const field = `comment-body-${parentId ?? "new"}`;
  return (
    <ActionForm
      action="comment-post"
      id={collectionId}
      returnTo={returnTo}
      className="comment-form"
    >
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <label htmlFor={field} className="sr-only">
        {label}
      </label>
      <textarea
        id={field}
        name="body"
        required
        maxLength={maxCommentLength}
        rows={parentId ? 2 : 3}
        placeholder={placeholder}
      />
      <button type="submit" className="button primary">
        {parentId ? "Reply" : "Post"}
      </button>
    </ActionForm>
  );
}

export type DiscussionSection = { id: string; title: string };

function Comment({
  comment,
  collectionId,
  returnTo,
  canReply,
}: {
  comment: CommentView;
  collectionId: string;
  returnTo: string;
  canReply: boolean;
}) {
  const scope = comment.section ?? comment.item;
  // Readers only need to know the reply comes from someone who maintains the
  // collection; owner and editors are all contributors to them.
  const role = comment.author?.role ? "Contributor" : null;
  const live = comment.state === "visible";
  return (
    <article
      className={`comment${comment.accepted ? " accepted" : ""}${live ? "" : " muted"}`}
      id={`comment-${comment.id}`}
    >
      <header className="comment-head">
        {comment.author && <Avatar userId={comment.author.userId} />}
        {comment.author ? (
          <Person person={comment.author} />
        ) : (
          <span className="comment-author">Former member</span>
        )}
        {role && <span className="comment-role">{role}</span>}
        {comment.accepted && <span className="comment-answer">Answer</span>}
        {/* The comment's age sits with its author ("5d"). */}
        <span className="comment-time">
          <ShortTime at={comment.createdAt} />
          {comment.editedAt && " · edited"}
        </span>
      </header>
      {!comment.parentId && scope?.title && (
        <p className="comment-scope">
          On{" "}
          <a href={comment.section ? `#section-${comment.section.id}` : `#item-${scope.id}`}>
            {scope.title}
          </a>
        </p>
      )}
      {comment.body !== null && comment.state !== "deleted" ? (
        <p className="comment-body">{comment.body}</p>
      ) : (
        <p className="comment-body comment-gone">
          {comment.state === "deleted" ? "This comment was deleted." : "Hidden by a contributor."}
        </p>
      )}
      {comment.state === "hidden" && comment.body !== null && (
        <p className="comment-note">Hidden from readers. Only contributors see it.</p>
      )}
      <div className="comment-actions">
        {canReply && !comment.parentId && comment.state !== "deleted" && (
          <details className="comment-more">
            <summary className="text-button">Reply</summary>
            <Composer
              collectionId={collectionId}
              parentId={comment.id}
              returnTo={returnTo}
              label="Your reply"
              placeholder={`Reply to ${comment.author?.username ?? "this comment"}`}
            />
          </details>
        )}
        {comment.canEdit && (
          <details className="comment-more">
            <summary className="text-button">Edit</summary>
            <ActionForm
              action="comment-edit"
              id={comment.id}
              returnTo={returnTo}
              className="comment-form"
            >
              <input type="hidden" name="version" value={comment.version} />
              <label htmlFor={`comment-edit-${comment.id}`} className="sr-only">
                Edit comment
              </label>
              <textarea
                id={`comment-edit-${comment.id}`}
                name="body"
                required
                maxLength={maxCommentLength}
                rows={3}
                defaultValue={comment.body ?? ""}
              />
              <button type="submit" className="button primary">
                Save
              </button>
            </ActionForm>
          </details>
        )}
        {comment.canEdit && (
          <details className="comment-more">
            <summary className="text-button">Delete</summary>
            <ActionForm action="comment-delete" id={comment.id} returnTo={returnTo}>
              <p className="comment-confirm">Delete this comment?</p>
              <button type="submit" className="button danger">
                Delete comment
              </button>
            </ActionForm>
          </details>
        )}
        {comment.canModerate && comment.parentId && live && (
          <ActionForm
            action={comment.accepted ? "comment-unaccept" : "comment-accept"}
            id={comment.id}
            returnTo={returnTo}
          >
            <button type="submit" className="text-button">
              {comment.accepted ? "Unmark answer" : "Mark as answer"}
            </button>
          </ActionForm>
        )}
        {/* Moderation is for others' comments; authors delete their own. */}
        {comment.canModerate && !comment.canEdit && comment.state !== "deleted" && (
          <ActionForm
            action={comment.state === "hidden" ? "comment-show" : "comment-hide"}
            id={comment.id}
            returnTo={returnTo}
          >
            <button type="submit" className="text-button">
              {comment.state === "hidden" ? "Show" : "Hide"}
            </button>
          </ActionForm>
        )}
      </div>
    </article>
  );
}

export function Comments({
  collectionId,
  threads,
  returnTo,
  signedIn,
  notice,
  olderHref,
  commentCursor,
  composerOpen = false,
  sections = [],
  attached,
  answeredOnly = false,
  owner = false,
}: {
  collectionId: string;
  threads: CommentThreads | null;
  returnTo: string;
  signedIn: boolean;
  notice?: string;
  olderHref?: string;
  commentCursor?: string;
  composerOpen?: boolean;
  /** The collection's sections, for "About". */
  sections?: DiscussionSection[];
  /** An item attached from its Discuss action, with the section it sits in. */
  attached?: { id: string; title: string; sectionId?: string };
  answeredOnly?: boolean;
  /** The collection's editor sees an empty discussion described for them. */
  owner?: boolean;
}) {
  const join = returnTo.includes("?") ? "&" : "?";
  return (
    <section className="comments" id="comments" aria-labelledby="comments-title">
      <CommentFocus />
      <header className="comments-heading">
        <h2 id="comments-title">Discussion</h2>
        {threads && threads.total > 0 && (
          <nav className="comment-filter" aria-label="Show">
            <a href={`${returnTo}#comments`} aria-current={answeredOnly ? undefined : "true"}>
              All <span>{threads.total}</span>
            </a>
            <a
              href={`${returnTo}${join}answered=1#comments`}
              aria-current={answeredOnly ? "true" : undefined}
            >
              Answered <span>{threads.answered}</span>
            </a>
          </nav>
        )}
      </header>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: The desktop discussion scrolls independently and needs keyboard focus for scrolling. */}
      <section className="comments-body" aria-label="Discussion comments" tabIndex={0}>
        {notice && <FormNotice code={notice} />}
        {!threads ? (
          <p className="comments-state">The discussion couldn't load. Reload to try again.</p>
        ) : !threads.enabled ? (
          <p className="comments-state">Comments are turned off for this collection.</p>
        ) : threads.canComment &&
          // The owner's empty discussion is only its explanation (board);
          // Discuss on a link still opens the box.
          !(owner && threads.total === 0 && !composerOpen && !attached) ? (
          <details className="comment-compose" id="comment-composer" open={composerOpen}>
            <summary>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 5h16v11H9l-5 4z" />
              </svg>
              Ask a question or add what you know
            </summary>
            <QuestionComposer
              collectionId={collectionId}
              returnTo={returnTo}
              sections={sections}
              attached={attached}
            />
          </details>
        ) : threads.canComment ? null : signedIn ? (
          <p className="comments-state">
            Comments are paused while this collection is under review.
          </p>
        ) : (
          <p className="comments-state">
            <a
              href={`/sign-in?returnTo=${encodeURIComponent(`${returnTo}${returnTo.includes("?") ? "&" : "?"}compose=comment#comment-composer`)}`}
            >
              Sign in to join the discussion
            </a>
          </p>
        )}
        {threads && threads.comments.length > 0 && (
          <ol className="comment-list">
            {threads.comments.map((comment) => (
              <li key={comment.id}>
                <Comment
                  comment={comment}
                  collectionId={collectionId}
                  returnTo={returnTo}
                  canReply={threads.canComment}
                />
                {comment.replies.length > 0 && (
                  <ol className="comment-replies">
                    {comment.replies.map((reply) => (
                      <li key={reply.id}>
                        <Comment
                          comment={reply}
                          collectionId={collectionId}
                          returnTo={returnTo}
                          canReply={false}
                        />
                      </li>
                    ))}
                  </ol>
                )}
                {comment.repliesNextCursor && (
                  <a
                    className="button comments-older"
                    href={`${returnTo}${returnTo.includes("?") ? "&" : "?"}${new URLSearchParams({ ...(commentCursor ? { cc: commentCursor } : {}), rt: comment.id, rc: comment.repliesNextCursor })}#comment-${comment.id}`}
                  >
                    More replies
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
        {threads?.enabled && threads.comments.length === 0 && (
          <p className="comments-empty">
            {answeredOnly
              ? "No answered questions yet."
              : owner
                ? "No questions yet. Once people read your collection, they can ask and add what they know here."
                : "No comments yet. Questions about these links are welcome."}
          </p>
        )}
        {olderHref && (
          <a className="button comments-older" href={olderHref}>
            Older comments
          </a>
        )}
      </section>
    </section>
  );
}

// A new question: about the whole guide or a section (following the section in
// view until chosen), optionally with the item it came from attached.
function QuestionComposer({
  collectionId,
  returnTo,
  sections,
  attached,
}: {
  collectionId: string;
  returnTo: string;
  sections: DiscussionSection[];
  attached?: { id: string; title: string; sectionId?: string };
}) {
  const field = "comment-body-new";
  const join = returnTo.includes("?") ? "&" : "?";
  return (
    <ActionForm
      action="comment-post"
      id={collectionId}
      returnTo={returnTo}
      className="comment-form"
    >
      {attached && (
        <div className="comment-attached">
          <input type="hidden" name="itemId" value={attached.id} />
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </svg>
          <b>{attached.title}</b>
          <a href={`${returnTo}${join}compose=comment#comment-composer`}>
            <span className="sr-only">Remove the attached item</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </a>
        </div>
      )}
      <label htmlFor={field} className="sr-only">
        Add to the discussion
      </label>
      <textarea
        id={field}
        name="body"
        required
        maxLength={maxCommentLength}
        rows={4}
        placeholder={
          attached
            ? "What would you like to ask or add about this link?"
            : "Ask a question or add what you know"
        }
      />
      <div className="comment-bar">
        {sections.length > 0 && (
          <label className="comment-about">
            About
            {/* Keyed by the attached item: Discuss on another link reuses this
                form, and a mounted select ignores a new defaultValue. */}
            <select
              key={attached?.id ?? "guide"}
              name="sectionId"
              aria-label="What this comment is about"
              defaultValue={attached?.sectionId ?? ""}
              data-follows-section={attached ? undefined : ""}
            >
              <option value="">The whole guide</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <CommentCounter fieldId={field} />
      </div>
      <div className="comment-buttons">
        <ComposerCancel href={`${returnTo}#comments`} />
        <button type="submit" className="button primary">
          Post
        </button>
      </div>
    </ActionForm>
  );
}
