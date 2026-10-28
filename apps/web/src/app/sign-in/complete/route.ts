import { authenticatedFlow } from "../../../lib/authenticated-flow";
import { completeSignIn } from "../../../lib/complete-sign-in";
import { redirectResponse } from "../../../lib/form-server";

import { isDraftPath } from "../../../lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const flow = await authenticatedFlow();
  if (!flow) return redirectResponse("/sign-in?notice=expired");
  // Navigation finishes immediately. Replaying an interrupted write remains POST.
  if (flow.purpose === "resume" || flow.purpose === "confirm" || isDraftPath(flow.returnTo))
    return redirectResponse("/sign-in/resume");
  return completeSignIn(request, flow, { setCookies: [] });
}
