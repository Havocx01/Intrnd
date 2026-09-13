export const submissionEvidenceKinds = ["TEXT", "FILE", "IMAGE", "DOCUMENT", "REPOSITORY", "LINK"] as const;

export type SubmissionEvidenceKind = (typeof submissionEvidenceKinds)[number];

export type SubmissionRequirement = {
  key: string;
  title: string;
  instructions: string;
  kind: SubmissionEvidenceKind;
  required: boolean;
  minItems: number;
  maxItems: number;
  acceptedMimeTypes?: string[];
};

export type SubmissionRequirements = { version: 1; instructions?: string; items: SubmissionRequirement[] };

export type SerializedSubmissionItem = {
  id: string;
  requirementKey: string;
  kind: SubmissionEvidenceKind;
  textValue: string | null;
  url: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date | string;
};
