type MetricEvent = {
  id: string;
  userId: string | null;
  eventType: string;
  applicationId: string | null;
  submissionId: string | null;
  properties: unknown;
  occurredAt: Date;
};

type CohortMember = { id: string; cohortJoinedAt: Date | null };

type ReviewedSubmission = { id: string; submittedAt: Date | null; reviewedBy: string | null; reviewerName: string | null };

const funnelEventTypes = new Set(["RECOMMENDATION_IMPRESSION", "PROJECT_STARTED", "SUBMISSION_FINALIZED", "REVIEW_COMPLETED"]);

export function calculateCohortMetrics(input: {
  members: CohortMember[];
  events: MetricEvent[];
  reviewedSubmissions: ReviewedSubmission[];
  reviewSlaHours: number;
}) {
  const memberIds = new Set(input.members.map((member) => member.id));
  const events = input.events
    .filter((event) => event.userId && memberIds.has(event.userId))
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const eventsByType = new Map<string, MetricEvent[]>();
  for (const event of events) {
    const bucket = eventsByType.get(event.eventType) ?? [];
    bucket.push(event);
    eventsByType.set(event.eventType, bucket);
  }

  const firstByUser = (eventType: string, predicate: (event: MetricEvent) => boolean = () => true) => {
    const result = new Map<string, Date>();
    for (const event of eventsByType.get(eventType) ?? []) {
      if (event.userId && predicate(event) && !result.has(event.userId)) result.set(event.userId, event.occurredAt);
    }
    return result;
  };

  const enrolled = new Map(input.members.map((member) => [member.id, member.cohortJoinedAt]));
  const recommended = firstByUser("RECOMMENDATION_IMPRESSION");
  const started = firstByUser("PROJECT_STARTED");
  const submitted = firstByUser("SUBMISSION_FINALIZED");
  const verified = firstByUser("REVIEW_COMPLETED", (event) => propertyString(event.properties, "decision") === "VERIFIED");
  const stageCounts = [input.members.length, recommended.size, started.size, submitted.size, verified.size];
  const stageNames = ["enrolled", "recommendations", "started", "submitted", "verified"] as const;
  const funnel = Object.fromEntries(
    stageNames.map((name, index) => [
      name,
      {
        count: stageCounts[index],
        conversionFromPrevious: index === 0 ? null : ratio(stageCounts[index], stageCounts[index - 1]),
        conversionFromEnrolled: index === 0 ? 1 : ratio(stageCounts[index], stageCounts[0]),
      },
    ]),
  ) as Record<(typeof stageNames)[number], { count: number; conversionFromPrevious: number | null; conversionFromEnrolled: number | null }>;

  const reviewedSubmissions = new Map(input.reviewedSubmissions.map((submission) => [submission.id, submission]));
  const firstReviewBySubmission = new Map<string, MetricEvent>();
  for (const event of eventsByType.get("REVIEW_COMPLETED") ?? []) {
    if (event.submissionId && !firstReviewBySubmission.has(event.submissionId)) {
      firstReviewBySubmission.set(event.submissionId, event);
    }
  }
  const reviewRows = [...firstReviewBySubmission.entries()].flatMap(([submissionId, event]) => {
    const submission = reviewedSubmissions.get(submissionId);
    if (!submission) return [];
    const hours = submission.submittedAt ? elapsedHours(submission.submittedAt, event.occurredAt) : null;
    if (hours === null) return [];
    return [
      {
        hours,
        decision: propertyString(event.properties, "decision"),
        reviewerId: submission.reviewedBy ?? "unassigned",
        reviewerName: submission.reviewerName ?? "Unassigned",
      },
    ];
  });
  const workloadLabels = new Map(reviewRows.map((review) => [review.reviewerId, review.reviewerName]));
  const workload = Object.entries(
    reviewRows.reduce<Record<string, number>>((result, review) => {
      result[review.reviewerId] = (result[review.reviewerId] ?? 0) + 1;
      return result;
    }, {}),
  )
    .map(([reviewerId, reviews]) => ({ reviewerId, reviewer: workloadLabels.get(reviewerId) ?? "Unassigned", reviews }))
    .sort((left, right) => right.reviews - left.reviews || left.reviewer.localeCompare(right.reviewer));

  const stageTiming = [
    durationMetric("Enrollment to recommendations", enrolled, recommended),
    durationMetric("Recommendations to start", recommended, started),
    durationMetric("Start to submission", started, submitted),
    durationMetric("Submission to verification", submitted, verified),
  ];

  const proofViews = eventsByType.get("PROOF_VIEWED") ?? [];
  const resumeCopies = eventsByType.get("RESUME_BULLET_COPIED") ?? [];
  const funnelEvents = events.filter((event) => funnelEventTypes.has(event.eventType));
  const uniqueFunnelKeys = new Set(funnelEvents.map(naturalFunnelKey));
  const roadmapConfigured = eventsByType.get("ROADMAP_CONFIGURED") ?? [];
  const checkpointViews = eventsByType.get("CHECKPOINT_VIEWED") ?? [];
  const checkpointCompletions = eventsByType.get("CHECKPOINT_COMPLETED") ?? [];
  const feedbackEvents = eventsByType.get("ROADMAP_FEEDBACK_RECORDED") ?? [];
  const checkpointIds = new Set(
    [...checkpointViews, ...checkpointCompletions]
      .map((event) => propertyString(event.properties, "checkpointId"))
      .filter((value): value is string => Boolean(value)),
  );
  const checkpointDropoff = [...checkpointIds]
    .map((checkpointId) => {
      const viewed = new Set(
        checkpointViews
          .filter((event) => propertyString(event.properties, "checkpointId") === checkpointId)
          .map((event) => event.applicationId)
          .filter(Boolean),
      );
      const completed = new Set(
        checkpointCompletions
          .filter((event) => propertyString(event.properties, "checkpointId") === checkpointId)
          .map((event) => event.applicationId)
          .filter(Boolean),
      );
      return {
        checkpointId,
        viewedApplications: viewed.size,
        completedApplications: completed.size,
        completionRate: ratio(completed.size, viewed.size),
      };
    })
    .sort((left, right) => left.checkpointId.localeCompare(right.checkpointId));

  const firstViewByCheckpoint = new Map<string, MetricEvent>();
  for (const event of checkpointViews) {
    const checkpointId = propertyString(event.properties, "checkpointId");
    const key = event.applicationId && checkpointId ? `${event.applicationId}:${checkpointId}` : null;
    if (key && !firstViewByCheckpoint.has(key)) firstViewByCheckpoint.set(key, event);
  }
  const completionTimings = checkpointCompletions.flatMap((event) => {
    const checkpointId = propertyString(event.properties, "checkpointId");
    const key = event.applicationId && checkpointId ? `${event.applicationId}:${checkpointId}` : null;
    const viewed = key ? firstViewByCheckpoint.get(key) : null;
    const elapsed = viewed ? elapsedHours(viewed.occurredAt, event.occurredAt) : null;
    const actualMinutes = elapsed !== null ? elapsed * 60 : null;
    const estimatedMinutes = propertyNumber(event.properties, "estimatedMinutes");
    return actualMinutes !== null && estimatedMinutes !== null ? [{ actualMinutes, estimatedMinutes }] : [];
  });
  const issueCodes = Object.entries(
    feedbackEvents.reduce<Record<string, number>>((result, event) => {
      const code = propertyString(event.properties, "issueCode") ?? "NONE";
      result[code] = (result[code] ?? 0) + 1;
      return result;
    }, {}),
  )
    .map(([issueCode, count]) => ({ issueCode, count }))
    .sort((left, right) => right.count - left.count);
  const supportByApplication = new Map<string, string>();
  for (const event of roadmapConfigured) {
    const level = propertyString(event.properties, "supportLevel");
    if (event.applicationId && level) supportByApplication.set(event.applicationId, level);
  }
  const outcomesBySupport = ["GUIDED", "STANDARD", "ACCELERATED"].map((supportLevel) => {
    const applicationIds = new Set(
      [...supportByApplication].filter(([, level]) => level === supportLevel).map(([applicationId]) => applicationId),
    );
    const submittedApplications = new Set(
      (eventsByType.get("SUBMISSION_FINALIZED") ?? [])
        .filter((event) => event.applicationId && applicationIds.has(event.applicationId))
        .map((event) => event.applicationId),
    );
    const verifiedApplications = new Set(
      (eventsByType.get("REVIEW_COMPLETED") ?? [])
        .filter(
          (event) =>
            event.applicationId && applicationIds.has(event.applicationId) && propertyString(event.properties, "decision") === "VERIFIED",
        )
        .map((event) => event.applicationId),
    );
    return { supportLevel, configured: applicationIds.size, submitted: submittedApplications.size, verified: verifiedApplications.size };
  });

  return {
    funnel,
    stageTiming,
    reviewSla: {
      reviewed: reviewRows.length,
      withinSla: reviewRows.filter((review) => review.hours <= input.reviewSlaHours).length,
      complianceRate: reviewRows.length
        ? reviewRows.filter((review) => review.hours <= input.reviewSlaHours).length / reviewRows.length
        : null,
      medianHours: median(reviewRows.map((review) => review.hours)),
    },
    revisionRate: reviewRows.length ? reviewRows.filter((review) => review.decision === "NEEDS_REVISION").length / reviewRows.length : null,
    reviewerWorkload: workload,
    engagement: {
      proofViews: { total: proofViews.length, uniqueUsers: uniqueUserCount(proofViews) },
      resumeBulletCopies: { total: resumeCopies.length, uniqueUsers: uniqueUserCount(resumeCopies) },
    },
    eventIntegrity: {
      funnelEvents: funnelEvents.length,
      duplicateFunnelEvents: funnelEvents.length - uniqueFunnelKeys.size,
      noDuplicates: funnelEvents.length === uniqueFunnelKeys.size,
    },
    roadmaps: {
      checkpointDropoff,
      completionTiming: {
        measurement: "ELAPSED_WALL_CLOCK" as const,
        sampleSize: completionTimings.length,
        medianActualMinutes: median(completionTimings.map((row) => row.actualMinutes)),
        medianEstimatedMinutes: median(completionTimings.map((row) => row.estimatedMinutes)),
        withinTwiceEstimateRate: completionTimings.length
          ? completionTimings.filter((row) => row.actualMinutes <= row.estimatedMinutes * 2).length / completionTimings.length
          : null,
      },
      evidenceValidationFailures: (eventsByType.get("CHECKPOINT_EVIDENCE_VALIDATION_FAILED") ?? []).length,
      feedback: {
        responses: feedbackEvents.length,
        helpfulRate: feedbackEvents.length
          ? feedbackEvents.filter((event) => propertyBoolean(event.properties, "helpful") === true).length / feedbackEvents.length
          : null,
        issueCodes,
      },
      outcomesBySupport,
    },
  };
}

function durationMetric(label: string, start: Map<string, Date | null>, end: Map<string, Date>) {
  const values: number[] = [];
  for (const [userId, endAt] of end) {
    const startAt = start.get(userId);
    if (!startAt) continue;
    const hours = elapsedHours(startAt, endAt);
    if (hours !== null) values.push(hours);
  }
  return { label, medianHours: median(values), sampleSize: values.length };
}

function naturalFunnelKey(event: MetricEvent) {
  if (event.eventType === "RECOMMENDATION_IMPRESSION") {
    return `${event.eventType}:${event.userId}:${propertyString(event.properties, "rankerVersion") ?? "-"}`;
  }
  if (event.eventType === "PROJECT_STARTED") return `${event.eventType}:${event.applicationId ?? event.id}`;
  if (event.eventType === "SUBMISSION_FINALIZED" || event.eventType === "REVIEW_COMPLETED") {
    return `${event.eventType}:${event.submissionId ?? event.id}`;
  }
  return event.id;
}

function propertyString(properties: unknown, key: string) {
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return null;
  const value = (properties as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function propertyNumber(properties: unknown, key: string) {
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return null;
  const value = (properties as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function propertyBoolean(properties: unknown, key: string) {
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return null;
  const value = (properties as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : null;
}

function uniqueUserCount(events: MetricEvent[]) {
  return new Set(events.map((event) => event.userId).filter(Boolean)).size;
}

function elapsedHours(start: Date, end: Date) {
  const milliseconds = end.getTime() - start.getTime();
  return milliseconds >= 0 ? milliseconds / 3_600_000 : null;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
}
