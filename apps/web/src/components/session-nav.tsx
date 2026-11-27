import type { SessionView } from "@ntumie/types";
import { AccountMenu } from "./account-menu";
import { SaveLinkButton } from "./save-link-button";
export function SessionNav({ session }: { session: SessionView | null }) {
  if (!session)
    return (
      <div className="session-nav">
        <a className="nav-link" href="/sign-in">
          Sign in
        </a>
        <a className="button primary nav-button nav-start" href="/start">
          Start a collection
        </a>
      </div>
    );
  return (
    <div className="session-nav">
      <SaveLinkButton />
      <AccountMenu
        userId={session.userId}
        hubId={session.hubId}
        username={session.username}
        name={session.name}
        email={session.email}
        canManage={session.operator || !!session.hubId}
        unreadNotifications={session.unreadNotifications}
      />
    </div>
  );
}
