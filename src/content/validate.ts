import { ContentDocument } from './schema';

export type ValidationResult =
  | { valid: true; document: ContentDocument; warnings: string[] }
  | { valid: false; problems: string[] };

export function validateContentDocument(candidate: unknown): ValidationResult {
  const parsed = ContentDocument.safeParse(candidate);

  if (!parsed.success) {
    return {
      valid: false,
      problems: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
      ),
    };
  }

  return { valid: true, document: parsed.data, warnings: releaseWarningsFor(parsed.data) };
}

/**
 * Not build failures: content is authored long before it is reviewed or
 * recited. These block release, which is why they are surfaced every build.
 */
function releaseWarningsFor(document: ContentDocument): string[] {
  const warnings: string[] = [];

  if (document.reviewedBy === null) {
    warnings.push('reviewedBy is not set — content cannot be released unreviewed');
  }

  const untranslated = Object.entries(document.translationSources)
    .filter(([, source]) => source === null)
    .map(([language]) => language);

  if (untranslated.length > 0) {
    warnings.push(`no translation source named for: ${untranslated.join(', ')}`);
  }

  if (document.items.some((item) => item.audio === null)) {
    warnings.push('some items have no recitation');
  }

  return warnings;
}
