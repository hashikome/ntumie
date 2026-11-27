import {
  applyDecorators,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  SetMetadata,
  UnauthorizedException,
  UseInterceptors,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { from, lastValueFrom } from "rxjs";
import { PrismaService } from "../database/prisma.service";
import type { AuthUser } from "./interfaces/auth-user.interface";

// Every authenticated write runs under the global authority lock, with its
// session rechecked inside it. A controller or route opts out in one way only:
// - "read-only": a POST that only reads (rendering an export), so slow work
//   never blocks other writes; the guard and policy still apply.
// - "after-parse": takes the lock only once bounded multipart parsing is done,
//   so a slow upload never holds it.
// - "owns-transaction": the service opens its own audited authority
//   transaction (operations), so it can commit evidence of a denial.
export type AuthorityMode = "lock" | "read-only" | "after-parse" | "owns-transaction";
const AUTHORITY_MODE = "authorityMode";

/** The session this request authenticated with, if it is still valid now. */
export function recheckSession(prisma: PrismaService, actor: AuthUser) {
  if (!actor.sessionId) return Promise.resolve(null);
  return prisma.session.findFirst({
    where: {
      id: actor.sessionId,
      userId: actor.userId,
      expiresAt: { gt: new Date() },
      user: { accountState: "active" },
    },
  });
}

function underLock(prisma: PrismaService, context: ExecutionContext, next: CallHandler) {
  const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
  if (!req.user || ["GET", "HEAD", "OPTIONS"].includes(req.method)) return next.handle();
  const actor = req.user;
  return from(
    prisma.withAuthority(async () => {
      // The guard ran before the lock. Recheck the actual session under it.
      if (!(await recheckSession(prisma, actor))) throw new UnauthorizedException();
      return lastValueFrom(next.handle());
    }),
  );
}

@Injectable()
export class AuthorityInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const mode =
      this.reflector.getAllAndOverride<AuthorityMode>(AUTHORITY_MODE, [
        context.getHandler(),
        context.getClass(),
      ]) ?? "lock";
    return mode === "lock" ? underLock(this.prisma, context, next) : next.handle();
  }
}

@Injectable()
class LockAfterParse implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    return underLock(this.prisma, context, next);
  }
}

/**
 * How a controller or route meets the authority lock (default "lock").
 * "after-parse" takes the parsing interceptors, which run before the lock.
 */
export function Authority(mode: AuthorityMode, ...parsers: Parameters<typeof UseInterceptors>) {
  const marked = SetMetadata(AUTHORITY_MODE, mode);
  if (mode !== "after-parse") return marked;
  return applyDecorators(marked, UseInterceptors(...parsers, LockAfterParse));
}
