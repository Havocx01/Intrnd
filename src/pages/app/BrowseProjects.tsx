import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Building2, Compass, GraduationCap, LayoutGrid, List, Search, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MarketplaceProject, SOURCE_LABELS, sourceFromProject, useAppData } from "../../components/app/AppDataProvider";
import { AppButton } from "../../components/app/Button";
import { EmptyState } from "../../components/app/EmptyState";
import { MatchBandBadge } from "../../components/app/MatchBandBadge";
import { ProjectCard } from "../../components/app/ProjectCard";
import { ProjectPreviewModal } from "../../components/app/ProjectPreviewModal";
import { StatusBadge, statusToneFromBackend } from "../../components/app/StatusBadge";
import { hasFullRecommendationAccess } from "../../lib/auth";
import { isAddedApplicationStatus } from "../../lib/applicationStatus";
import { PRICING_ROUTE } from "../../lib/plans";
import { pickFreeStarterId } from "../../lib/recommendationAccess";
import { easeOutSoft } from "../../lib/motion";
import { type MatchBand } from "../../lib/recommendationScore";
import { useRecommendationImpression } from "../../hooks/useRecommendationImpression";

type SourceView = "recommended" | "ai" | "university" | "third-party";

const SOURCES: { id: SourceView; label: string; icon: typeof Compass }[] = [
  { id: "recommended", label: "All", icon: Target },
  { id: "ai", label: "Intrnd-created", icon: Compass },
  { id: "university", label: "Campus-style", icon: GraduationCap },
  { id: "third-party", label: "External catalog", icon: Building2 },
];

type RankedRecommendation = { id: string; rank: number; matchBand: MatchBand; reason: string; project: MarketplaceProject | null };

const TIMES = ["Any time", "Under 2 hours", "3–5 hours", "6–24 hours", "1–3 days", "1 week", "2–3 weeks", "4–6 weeks", "7+ weeks"] as const;
type TimeFilter = (typeof TIMES)[number];

const PAGE_SIZE = 9;

// Accept written numbers such as one semester or two weeks.
const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  a: 1,
  an: 1,
  "a few": 3,
};

type ParsedDuration = {
  // Hours and days mean calendar time; longer units mean part-time effort.
  hours: number;
  unit: "hour" | "day" | "week" | "month" | "semester" | "year";
};

function parseEstimatedTime(estimated: string | null | undefined): ParsedDuration | null {
  if (!estimated) return null;
  const text = estimated.toLowerCase().trim();
  if (!text) return null;

  const numericMatches = text.match(/\d+(?:\.\d+)?/g);
  let numbers: number[] = numericMatches
    ? numericMatches.map((value) => Number.parseFloat(value)).filter((value) => Number.isFinite(value))
    : [];

  if (numbers.length === 0) {
    for (const [word, value] of Object.entries(WORD_NUMBERS)) {
      if (new RegExp(`\\b${word}\\b`).test(text)) {
        numbers.push(value);
        break;
      }
    }
  }

  let unit: ParsedDuration["unit"] | null = null;
  let perUnitHours = 1;
  if (/semester/.test(text)) {
    unit = "semester";
    perUnitHours = 15 * 40; // About 15 weeks of part-time work.
    if (numbers.length === 0) numbers = [1];
  } else if (/year/.test(text)) {
    unit = "year";
    perUnitHours = 52 * 20;
    if (numbers.length === 0) numbers = [1];
  } else if (/month/.test(text)) {
    unit = "month";
    perUnitHours = 160;
  } else if (/week/.test(text)) {
    unit = "week";
    perUnitHours = 40;
  } else if (/day/.test(text)) {
    unit = "day";
    perUnitHours = 8;
  } else if (/hour|\bhrs?\b/.test(text)) {
    unit = "hour";
    perUnitHours = 1;
  }

  if (numbers.length === 0) return null;
  if (unit === null) {
    unit = "hour";
    perUnitHours = 1;
  }

  const avg = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  return { hours: avg * perUnitHours, unit };
}
function timeBucket(estimated: string | null): TimeFilter | null {
  const parsed = parseEstimatedTime(estimated);
  if (!parsed) return null;
  const { hours, unit } = parsed;

  // Treat 48 hours as two calendar days, not part-time work weeks.
  if (unit === "hour" || unit === "day") {
    if (hours <= 2) return "Under 2 hours";
    if (hours <= 5) return "3–5 hours";
    if (hours <= 24) return "6–24 hours";
    if (hours <= 72) return "1–3 days";
    // Longer hour estimates fall through to week-based buckets.
  }

  const weeks = hours / 40;
  if (weeks <= 0.25) return "6–24 hours";
  if (weeks <= 0.6) return "1–3 days";
  if (weeks <= 1.5) return "1 week";
  if (weeks <= 3) return "2–3 weeks";
  if (weeks <= 6) return "4–6 weeks";
  return "7+ weeks";
}

export default function BrowseProjects() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user, projects, projectsError, isInitialLoading, reload, applyToProject, appliedProjectIds, pendingApplyProjectId } =
    useAppData();
  const [previewProject, setPreviewProject] = useState<MarketplaceProject | null>(null);
  const filtersStickySentinelRef = useRef<HTMLDivElement>(null);
  const [filtersStuck, setFiltersStuck] = useState(false);

  useEffect(() => {
    const sentinel = filtersStickySentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setFiltersStuck(!entry.isIntersecting), { threshold: [1] });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const [source, setSource] = useState<SourceView>("recommended");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [time, setTime] = useState<TimeFilter>("Any time");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const recommendations = useMemo<RankedRecommendation[]>(
    () =>
      projects.map((project, index) => ({
        id: project.id,
        rank: project.recommendationRank ?? index + 1,
        matchBand: project.matchBand ?? "EXPLORATORY",
        reason: project.recommendationReason ?? "Recommended by Intrnd's explainable matching rules.",
        project,
      })),
    [projects],
  );
  const recommendationSectionRef = useRecommendationImpression("BROWSE", recommendations.length > 0);

  useEffect(() => {
    setPage(1);
  }, [source, search, category, time]);

  const timeCounts = useMemo<Record<TimeFilter, number>>(() => {
    const counts: Record<TimeFilter, number> = {
      "Any time": 0,
      "Under 2 hours": 0,
      "3–5 hours": 0,
      "6–24 hours": 0,
      "1–3 days": 0,
      "1 week": 0,
      "2–3 weeks": 0,
      "4–6 weeks": 0,
      "7+ weeks": 0,
    };
    for (const rec of recommendations) {
      const project = rec.project;
      if (!project) continue;
      counts["Any time"] += 1;
      const bucket = timeBucket(project.estimatedHours);
      if (bucket) counts[bucket] += 1;
    }
    return counts;
  }, [recommendations]);

  const sourceCounts = useMemo<Record<SourceView, number>>(() => {
    const rankedProjects = recommendations.map((rec) => rec.project).filter((project): project is MarketplaceProject => !!project);
    return {
      recommended: rankedProjects.length,
      ai: rankedProjects.filter((p) => sourceFromProject(p) === "ai").length,
      university: rankedProjects.filter((p) => sourceFromProject(p) === "university").length,
      "third-party": rankedProjects.filter((p) => sourceFromProject(p) === "third-party").length,
    };
  }, [recommendations]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [projects]);

  // Choose the starter from all recommendations so filters cannot unlock another project.
  const hasFullAccess = hasFullRecommendationAccess(user?.plan);
  const freeStarterId = useMemo(() => {
    if (hasFullAccess) return null;
    return pickFreeStarterId(recommendations.map((r) => ({ id: r.id })));
  }, [hasFullAccess, recommendations]);

  const filteredRecommendations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return recommendations.filter((recommendation) => {
      const project = recommendation.project;
      if (!project) return false;
      const projSource = sourceFromProject(project);
      const matchesSource = source === "recommended" || projSource === source;
      const matchesCategory = category === "All" || project.category === category;
      const projectBucket = timeBucket(project.estimatedHours);
      const matchesTime = time === "Any time" || (projectBucket !== null && projectBucket === time);
      const haystack =
        `${project.title} ${project.description} ${project.organizationName ?? ""} ${project.skills.join(" ")}`.toLowerCase();
      const matchesSearch = !needle || haystack.includes(needle);
      return matchesSource && matchesCategory && matchesTime && matchesSearch;
    });
  }, [recommendations, source, category, time, search]);

  // Filtering preserves the server-owned recommendation order.
  const restList = filteredRecommendations;

  const totalPages = Math.max(1, Math.ceil(restList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, restList.length);
  const visible = restList.slice(startIndex, endIndex);
  const isPreparingRecommendations = isInitialLoading && recommendations.length === 0;

  function resetFilters() {
    setSource("recommended");
    setCategory("All");
    setTime("Any time");
    setSearch("");
  }

  async function handleStart(project: MarketplaceProject) {
    // Reject locked-project enrollment even if the card action is triggered.
    if (!hasFullAccess && freeStarterId && project.id !== freeStarterId) {
      navigate(PRICING_ROUTE, { state: { plan: "PRO" } });
      return;
    }
    const isApplied = projects.some((p) => p.id === project.id && isAddedApplicationStatus(p.applicationStatus));
    if (isApplied) {
      navigate("/dashboard/my-projects");
      return;
    }
    const ok = await applyToProject(project.id, project);
    if (ok) navigate("/dashboard/my-projects");
  }

  return (
    <div className="app-page app-page--browse">
      <header className="app-page-header">
        <h1>Browse projects</h1>
        <p>Best matches first, with explainable bands grounded in your saved profile, goals, skills, time, and proof value.</p>
      </header>

      <div className="app-browse-toolbar">
        <div ref={filtersStickySentinelRef} className="app-filters-sentinel" aria-hidden />

        <section className="app-filters" data-stuck={filtersStuck ? "true" : undefined}>
          <LayoutGroup id="app-source-pills">
            <div className="app-filters-pills" role="tablist" aria-label="Project source">
              {SOURCES.map((entry) => {
                const isActive = source === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className="app-filter-pill"
                    data-active={isActive ? "true" : "false"}
                    onClick={() => setSource(entry.id)}>
                    {isActive && !reduced ? (
                      <motion.span layoutId="app-source-pill-bg" className="app-filter-pill-bg" transition={{ duration: 0.32 }} />
                    ) : isActive ? (
                      <span className="app-filter-pill-bg" aria-hidden />
                    ) : null}
                    <entry.icon size={13} aria-hidden />
                    <span>{entry.label}</span>
                    <small>{sourceCounts[entry.id]}</small>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="app-filters-row">
            <div className="app-filter-search">
              <Search size={14} aria-hidden />
              <input
                type="search"
                placeholder="Search projects, skills, or career paths"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search projects"
              />
            </div>
            <div className="app-filter-select-wrap" data-active={category !== "All" ? "true" : "false"}>
              <select
                className="app-filter-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All categories" : c}
                  </option>
                ))}
              </select>
            </div>
            <div className="app-filter-select-wrap" data-active={time !== "Any time" ? "true" : "false"}>
              <select
                className="app-filter-select"
                value={time}
                onChange={(event) => setTime(event.target.value as TimeFilter)}
                aria-label="Filter by time commitment">
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                    {timeCounts[t] !== undefined ? ` (${timeCounts[t]})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="app-view-toggle" role="group" aria-label="Project layout">
              <button
                type="button"
                data-active={view === "grid" ? "true" : "false"}
                onClick={() => setView("grid")}
                aria-label="Card view"
                title="Card view">
                <LayoutGrid size={14} aria-hidden />
              </button>
              <button
                type="button"
                data-active={view === "list" ? "true" : "false"}
                onClick={() => setView("list")}
                aria-label="List view"
                title="List view">
                <List size={14} aria-hidden />
              </button>
            </div>
          </div>
        </section>
      </div>

      {projectsError ? (
        <EmptyState
          title="We couldn't load projects right now"
          description={projectsError}
          actions={
            <AppButton variant="secondary" size="sm" onClick={resetFilters}>
              Try again
            </AppButton>
          }
        />
      ) : null}

      <motion.section
        ref={recommendationSectionRef}
        className="app-section"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: easeOutSoft }}
        aria-label="Project results">
        <div className="app-section-title">
          <div>
            <h2>
              {(() => {
                if (isPreparingRecommendations) return "Building your personalized project ranking...";
                if (restList.length === 0) return "No matches";
                if (hasFullAccess) {
                  return `${restList.length} recommended project${restList.length === 1 ? "" : "s"}`;
                }
                const unlockedVisible = restList.some((r) => r.id === freeStarterId) ? 1 : 0;
                const moreWithPro = restList.length - unlockedVisible;
                if (unlockedVisible === 0) {
                  return `${moreWithPro} matching project${moreWithPro === 1 ? "" : "s"}`;
                }
                return `1 starter project · ${moreWithPro} more available`;
              })()}
            </h2>
          </div>
          <div className="app-section-actions">
            {source !== "recommended" || category !== "All" || time !== "Any time" || search ? (
              <AppButton variant="ghost" size="sm" type="button" onClick={resetFilters}>
                Reset filters
              </AppButton>
            ) : null}
          </div>
        </div>

        {projectsError && recommendations.length === 0 ? (
          <EmptyState
            title="Recommendations need a retry"
            description={projectsError}
            actions={
              <AppButton variant="primary" size="sm" onClick={() => void reload()}>
                Reload recommendations
              </AppButton>
            }
          />
        ) : isPreparingRecommendations ? (
          <EmptyState title="Loading your recommendations" description="Intrnd is loading the project matches from your saved profile." />
        ) : restList.length === 0 ? (
          <EmptyState
            title="No matching projects"
            description="Try a different source, time range, or skill search."
            actions={
              <AppButton variant="primary" size="sm" onClick={resetFilters}>
                Reset filters
              </AppButton>
            }
          />
        ) : (
          <>
            {view === "grid" ? (
              <div className="app-project-grid">
                <AnimatePresence mode="popLayout">
                  {visible.map((recommendation) => {
                    if (!recommendation.project) return null;
                    const isLocked = Boolean(recommendation.project.locked) || (!hasFullAccess && recommendation.id !== freeStarterId);
                    const isStarter = !isLocked && !hasFullAccess && recommendation.id === freeStarterId;
                    return (
                      <ProjectCard
                        key={recommendation.id}
                        project={recommendation.project}
                        recommendation={{ rank: recommendation.rank, matchBand: recommendation.matchBand, reason: recommendation.reason }}
                        locked={isLocked}
                        quietRestriction={isLocked}
                        showLockedPreview={isLocked}
                        freeStarter={isStarter}
                        onPreview={isLocked ? undefined : () => setPreviewProject(recommendation.project)}
                        onStart={() => recommendation.project && handleStart(recommendation.project)}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="app-project-list">
                <AnimatePresence mode="popLayout">
                  {visible.map((recommendation) => {
                    const project = recommendation.project;
                    if (!project) return null;
                    const projSource = sourceFromProject(project);
                    const isApplied = isAddedApplicationStatus(project.applicationStatus);
                    const isLocked = Boolean(project.locked) || (!hasFullAccess && recommendation.id !== freeStarterId);
                    const isStarter = !isLocked && !hasFullAccess && recommendation.id === freeStarterId;
                    return (
                      <motion.article
                        key={project.id}
                        layout
                        initial={reduced ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="app-project-list-row"
                        data-locked={isLocked ? "true" : undefined}>
                        <div className="app-project-list-row-body">
                          <div className="app-project-list-row-title">
                            <span className="app-project-rank">#{recommendation.rank}</span>
                            <span>{isLocked ? project.title.replace(/^Locked\s+/i, "") : project.title}</span>
                            <span className="app-project-source" data-source={projSource}>
                              {project.sourceLabel ?? SOURCE_LABELS[projSource]}
                            </span>
                            {isStarter ? (
                              <span className="app-project-starter">
                                <Sparkles size={11} aria-hidden /> Starter recommendation
                              </span>
                            ) : null}
                            {isApplied && !isLocked ? (
                              <StatusBadge tone={statusToneFromBackend(project.applicationStatus ?? "ACTIVE")} />
                            ) : null}
                          </div>
                          <div className="app-project-list-row-meta" data-blurred={isLocked ? "true" : undefined}>
                            {recommendation.matchBand ? (
                              <span>
                                <MatchBandBadge band={recommendation.matchBand} label={project.matchLabel} />
                              </span>
                            ) : project.matchLabel ? (
                              <span>
                                <MatchBandBadge label={project.matchLabel} />
                              </span>
                            ) : null}
                            {isLocked ? (
                              <>
                                <span>·</span>
                                <span>
                                  {project.difficulty === "ADVANCED"
                                    ? "Advanced"
                                    : project.difficulty === "INTERMEDIATE"
                                      ? "Intermediate"
                                      : "Beginner"}
                                </span>
                                <span>·</span>
                                <span>{project.estimatedHours ?? "Self-paced"}</span>
                              </>
                            ) : (
                              <>
                                {recommendation.reason ? (
                                  <>
                                    <span>·</span>
                                    <span>{recommendation.reason}</span>
                                  </>
                                ) : null}
                                <span>·</span>
                                <span>{project.deliverable ?? project.description}</span>
                                <span>·</span>
                                <span>{project.estimatedHours ?? "Self-paced"}</span>
                                {project.skills.slice(0, 2).map((s) => (
                                  <span key={s}>{s}</span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="app-project-list-row-actions">
                          {isLocked ? (
                            <Link
                              to={PRICING_ROUTE}
                              state={{ plan: "PRO" }}
                              className="app-card-upgrade-cta app-card-upgrade-cta--compact"
                              aria-label="View access options">
                              <span>View access</span>
                            </Link>
                          ) : (
                            <>
                              <AppButton type="button" variant="secondary" size="sm" onClick={() => setPreviewProject(project)}>
                                Preview
                              </AppButton>
                              <AppButton type="button" variant="primary" size="sm" onClick={() => handleStart(project)}>
                                {isApplied ? "Open" : "Add"}
                              </AppButton>
                            </>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {restList.length > PAGE_SIZE ? (
              <div className="app-pagination">
                <span>
                  Showing {startIndex + 1}–{endIndex} of {restList.length}
                </span>
                <div className="app-pagination-buttons">
                  <AppButton variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                    Previous
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}>
                    Next
                  </AppButton>
                </div>
              </div>
            ) : null}
          </>
        )}
      </motion.section>

      <ProjectPreviewModal
        project={previewProject}
        onClose={() => setPreviewProject(null)}
        onStart={async (project) => {
          setPreviewProject(null);
          await handleStart(project);
        }}
        isStarting={previewProject !== null && pendingApplyProjectId === previewProject.id}
        isApplied={previewProject !== null && appliedProjectIds.has(previewProject.id)}
      />
    </div>
  );
}
