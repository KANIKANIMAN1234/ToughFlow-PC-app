"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

import { usePermissions } from "@/hooks/usePermissions";

import { cn } from "@/lib/utils";

import {

  buildPcNavStructure,

  findActiveGroupId,

  type NavGroupDef,

  type NavItemDef,

} from "@/lib/permissions/nav";

import { AttendancePunchBar } from "@/components/attendance/AttendancePunchBar";
import { useEffect, useMemo, useState } from "react";



function NavLink({

  item,

  active,

  collapsed,

  indented,

}: {

  item: NavItemDef;

  active: boolean;

  collapsed: boolean;

  indented?: boolean;

}) {

  const Icon = item.icon;

  return (

    <Link

      href={item.href}

      title={collapsed ? item.label : undefined}

      className={cn(

        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body font-normal transition-colors",

        active

          ? "bg-apple-section text-apple-text"

          : "text-apple-glyph hover:bg-apple-section/70 hover:text-apple-text",

        collapsed && "justify-center px-2",

        indented && !collapsed && "ml-3 py-2 text-caption"

      )}

    >

      {Icon && (collapsed || !indented) && (
        <Icon className="h-5 w-5 shrink-0" />
      )}

      {!collapsed && item.label}

    </Link>

  );

}



function NavGroup({

  group,

  collapsed,

  open,

  onToggle,

  pathname,

}: {

  group: NavGroupDef;

  collapsed: boolean;

  open: boolean;

  onToggle: () => void;

  pathname: string;

}) {

  if (collapsed) {

    return (

      <div className="space-y-0.5 border-t border-surface-border pt-2">

        {group.children.map((item) => {

          const active =

            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (

            <NavLink

              key={item.href}

              item={item}

              active={active}

              collapsed={collapsed}

            />

          );

        })}

      </div>

    );

  }



  return (

    <div className="pt-1">

      <button

        type="button"

        onClick={onToggle}

        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-body font-medium text-apple-text transition-colors hover:bg-apple-section/70 focus-apple"

      >

        <span>{group.label}</span>

        <ChevronDown

          className={cn(

            "h-4 w-4 shrink-0 text-apple-glyph transition-transform duration-200",

            !open && "-rotate-90"

          )}

        />

      </button>

      {open && (

        <div className="ml-2 space-y-0.5 border-l border-surface-border pl-2">

          {group.children.map((item) => {

            const active =

              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (

              <NavLink

                key={item.href}

                item={item}

                active={active}

                collapsed={collapsed}

                indented

              />

            );

          })}

        </div>

      )}

    </div>

  );

}



export function AppShell({

  children,

  title,

  breadcrumbs,

}: {

  children: React.ReactNode;

  title: string;

  breadcrumbs?: string[];

}) {

  const pathname = usePathname();

  const { user, logout } = useAuth();

  const { accessMap, loading: permLoading } = usePermissions();

  const [collapsed, setCollapsed] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({

    customer: true,

    customer_mgmt: true,

    office: true,

  });



  const nav = useMemo(

    () =>

      permLoading

        ? buildPcNavStructure({})

        : buildPcNavStructure(accessMap),

    [permLoading, accessMap]

  );



  const flatItems = useMemo(

    () => [

      nav.home,

      ...nav.groups.flatMap((g) => g.children),

      ...(nav.settings ? [nav.settings] : []),

    ],

    [nav]

  );



  useEffect(() => {

    const activeGroupId = findActiveGroupId(pathname, nav.groups);

    if (activeGroupId) {

      setOpenGroups((prev) => ({ ...prev, [activeGroupId]: true }));

    }

  }, [pathname, nav.groups]);



  function toggleGroup(id: string) {

    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  }



  const homeActive =

    pathname === nav.home.href || pathname.startsWith(`${nav.home.href}/`);



  return (

    <div className="flex min-h-screen bg-surface">

      <aside

        className={cn(

          "fixed inset-y-0 left-0 z-20 flex flex-col border-r border-surface-border bg-white transition-all duration-200",

          collapsed ? "w-16" : "w-sidebar"

        )}

      >

        <div className="flex h-14 items-center justify-between border-b border-surface-border px-3">

          {!collapsed && (

            <>

              <span className="apple-heading text-body">ToughFlow</span>

              <span className="ml-2 rounded-pill bg-apple-section px-2 py-0.5 text-[10px] font-normal text-apple-glyph">

                PC

              </span>

            </>

          )}

          <button

            type="button"

            aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}

            onClick={() => setCollapsed((v) => !v)}

            className={cn(

              "rounded-lg p-2 text-apple-glyph hover:bg-apple-section hover:text-apple-text focus-apple",

              collapsed && "mx-auto"

            )}

          >

            {collapsed ? (

              <PanelLeftOpen className="h-5 w-5" />

            ) : (

              <PanelLeftClose className="h-5 w-5" />

            )}

          </button>

        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">

          {permLoading ? (

            <NavLink

              item={nav.home}

              active={homeActive}

              collapsed={collapsed}

            />

          ) : collapsed ? (

            flatItems.map((item) => {

              const active =

                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (

                <NavLink

                  key={item.href}

                  item={item}

                  active={active}

                  collapsed={collapsed}

                />

              );

            })

          ) : (

            <>

              <NavLink

                item={nav.home}

                active={homeActive}

                collapsed={collapsed}

              />

              {nav.groups.map((group) => (

                <NavGroup

                  key={group.id}

                  group={group}

                  collapsed={collapsed}

                  open={openGroups[group.id] ?? true}

                  onToggle={() => toggleGroup(group.id)}

                  pathname={pathname}

                />

              ))}

              {nav.settings && (

                <div className="border-t border-surface-border pt-2">

                  <NavLink

                    item={nav.settings}

                    active={

                      pathname === nav.settings.href ||

                      pathname.startsWith(`${nav.settings.href}/`)

                    }

                    collapsed={collapsed}

                  />

                </div>

              )}

            </>

          )}

        </nav>

        {!collapsed && (

          <div className="border-t border-surface-border p-4 text-nav-link">

            <p className="font-normal text-apple-text">{user?.name}</p>

            <p className="text-apple-glyph">{user?.tenantName}</p>

          </div>

        )}

      </aside>



      <div

        className={cn(

          "flex min-h-screen flex-1 flex-col transition-all duration-200",

          collapsed ? "ml-16" : "ml-sidebar"

        )}

      >

        <header className="glass-nav sticky top-0 z-10 flex h-14 items-center justify-between gap-4 px-6">

          <div className="min-w-0">

            {breadcrumbs && breadcrumbs.length > 0 && (

              <p className="text-nav-link text-apple-glyph">

                {breadcrumbs.join(" / ")}

              </p>

            )}

            <h1 className="apple-heading text-body">{title}</h1>

          </div>

          <div className="flex shrink-0 items-center gap-4">

            <AttendancePunchBar />

            <button

              type="button"

              onClick={() => logout()}

              className="text-caption text-apple-link hover:underline focus-apple"

            >

              ログアウト

            </button>

          </div>

        </header>

        <main className="mx-auto w-full max-w-content flex-1 p-6">{children}</main>

      </div>

    </div>

  );

}

