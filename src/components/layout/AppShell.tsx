import { BrandLink, LotusMark } from "@/components/brand";
import { PageErrorBoundary } from "@/components/shared/error-boundary";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { initials, formatTimeAgo } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  ChevronRight,
  Compass,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Send,
  Sparkles,
  Trophy,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

type Role = "student" | "organization";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
  match?: string[];
};

const navByRole: Record<Role, NavItem[]> = {
  student: [
    { to: "/student", label: "Open problems", icon: Compass, end: true, match: ["/student/problems"] },
    { to: "/student/work", label: "My work", icon: FolderKanban, match: ["/student/work"] },
    { to: "/student/profile", label: "My profile", icon: UserRound },
  ],
  organization: [
    { to: "/org", label: "Overview", icon: LayoutDashboard, end: true },
    {
      to: "/org/problems",
      label: "Problems",
      icon: FileCheck2,
      match: ["/org/problems"],
    },
    {
      to: "/org/opportunities",
      label: "Opportunities",
      icon: Send,
    },
    { to: "/org/profile", label: "Company profile", icon: BriefcaseBusiness },
  ],
};

function useIsActive() {
  const location = useLocation();
  return (item: NavItem) => {
    if (item.end) return location.pathname === item.to;
    if (item.match?.some((prefix) => location.pathname.startsWith(prefix))) {
      return true;
    }
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
    );
  };
}

function roleLabel(role: Role) {
  return role === "student" ? "Student workspace" : "Startup workspace";
}

function NotificationIcon({ type }: { type: string }) {
  const className = "size-4";
  if (type === "team_invite") return <UserPlus className={className} />;
  if (type === "feedback_ready") return <Sparkles className={className} />;
  if (type === "shortlisted") return <Trophy className={className} />;
  if (type === "offer") return <BriefcaseBusiness className={className} />;
  if (type === "comment") return <MessageSquare className={className} />;
  if (type === "submission") return <FileCheck2 className={className} />;
  return <Bell className={className} />;
}

function NotificationButton() {
  const notifications = useQuery(api.notifications.list);
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const unread = notifications?.unread ?? 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full border border-transparent hover:border-border"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        onClick={() => setOpen(true)}
      >
        <Bell className="size-[1.05rem]" strokeWidth={1.7} />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/70 px-5 py-5 pr-12">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle className="font-display text-2xl">Notifications</SheetTitle>
                <SheetDescription>
                  {unread === 0
                    ? "You're all caught up."
                    : `${unread} unread update${unread === 1 ? "" : "s"}.`}
                </SheetDescription>
              </div>
              {unread > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => void markAllRead({})}
                >
                  <CheckCheck className="size-3.5" />
                  Mark read
                </Button>
              ) : null}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {notifications === undefined ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="skeleton-warm size-9 rounded-xl" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="skeleton-warm h-3 w-3/4 rounded-full" />
                      <div className="skeleton-warm h-3 w-1/2 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.items.length === 0 ? (
              <div className="flex flex-col items-center px-8 py-20 text-center">
                <LotusMark className="h-10 w-auto text-border" />
                <p className="mt-5 font-display text-xl font-semibold">A quiet inbox</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Team invites, feedback, shortlists, and offers will land here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {notifications.items.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => {
                        void markRead({ notificationId: item._id });
                        setOpen(false);
                        if (item.link) navigate(item.link);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/45",
                        !item.read && "bg-accent/20",
                      )}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-primary">
                        <NotificationIcon type={item.type} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span
                            className={cn(
                              "text-sm leading-5",
                              item.read ? "text-foreground/85" : "font-semibold",
                            )}
                          >
                            {item.title}
                          </span>
                          {!item.read ? (
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.body}
                        </span>
                        <span className="mt-1 block text-[0.7rem] text-muted-foreground/80">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border/70 px-5 py-3 text-center text-[0.7rem] text-muted-foreground">
            Notifications are generated by real events on Udbhava.
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const items = navByRole[role];
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-1" aria-label="Workspace">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
            )}
          >
            <item.icon
              className={cn(
                "size-[1.05rem] shrink-0",
                active ? "text-primary" : "text-muted-foreground",
              )}
              strokeWidth={active ? 2 : 1.7}
            />
            <span className="flex-1">{item.label}</span>
            {active ? (
              <span className="size-1.5 rounded-full bg-primary" />
            ) : (
              <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-40" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarBody({ role }: { role: Role }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-7 pt-7">
        <BrandLink />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-card/70 px-2.5 py-1">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {roleLabel(role)}
          </span>
        </div>
      </div>

      <div className="hairline h-px" />

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="px-3 pb-2 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
          {role === "student" ? "Your practice" : "Your company"}
        </p>
        <SidebarNav role={role} />
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-sidebar-border bg-accent/28 p-4">
          <div className="flex items-center gap-2">
            <LotusMark className="h-4 w-auto text-primary" />
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-primary">
              {role === "student" ? "Built for momentum" : "Built for signal"}
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-foreground/75">
            {role === "student"
              ? "Every problem caps at 50 solutions. Choose solo or a team once — then let the work speak."
              : "Review phase by phase, shortlist with a note, and turn good work into an offer."}
          </p>
        </div>
      </div>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-primary">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name || "Your account"}
            </p>
            <p className="truncate text-[0.7rem] text-muted-foreground">
              {user?.email || (user?.isAnonymous ? "Demo session" : "")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            className="rounded-full text-muted-foreground hover:text-primary"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <LogOut className="size-4" strokeWidth={1.7} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ role }: { role: Role }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pageLabel =
    role === "student"
      ? [["/student/work", "My work"], ["/student/profile", "Profile"]].find(
          ([prefix]) => location.pathname.startsWith(prefix),
        )?.[1] ?? "Discover"
      : [["/org/problems", "Problems"], ["/org/opportunities", "Opportunities"], ["/org/profile", "Company profile"]]
          .find(([prefix]) => location.pathname.startsWith(prefix))
          ?.[1] ?? "Overview";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody role={role} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/88 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-7">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" strokeWidth={1.7} />
            </Button>
            <div className="lg:hidden">
              <BrandLink />
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {roleLabel(role)}
              </p>
              <span className="size-1 rounded-full bg-border" />
              <p className="text-sm text-foreground/80">{pageLabel}</p>
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {user?.isAnonymous ? (
                <span className="hidden rounded-full border border-border bg-secondary px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-secondary-foreground sm:inline">
                  Demo data
                </span>
              ) : null}
              <NotificationButton />
              <NavLink
                to={role === "student" ? "/student/profile" : "/org/profile"}
                aria-label="Your profile"
                className="ml-1 flex size-9 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-primary transition-colors hover:border-primary/30"
              >
                {initials(user?.name)}
              </NavLink>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9 lg:py-10">
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[86%] gap-0 p-0 sm:max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Move around your Udbhava workspace.</SheetDescription>
          </SheetHeader>
          <div className="absolute right-3 top-3 z-10">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <SidebarBody role={role} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

