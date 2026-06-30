export const FORBIDDEN_SQL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bCREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b/i, label: "Postgres functions are forbidden" },
  { pattern: /\bCREATE\s+TRIGGER\b/i, label: "Postgres triggers are forbidden" },
  { pattern: /\bCREATE\s+POLICY\b/i, label: "Postgres RLS policies are forbidden" },
  { pattern: /\bSECURITY\s+DEFINER\b/i, label: "security definer behavior is forbidden" },
  { pattern: /\bDEFAULT\s+now\s*\(/i, label: "database timestamps are forbidden" },
  { pattern: /\bDEFAULT\s+CURRENT_TIMESTAMP\b/i, label: "database timestamps are forbidden" },
  { pattern: /\bgen_random_uuid\s*\(/i, label: "database UUID generation is forbidden" },
  { pattern: /\buuid_generate/i, label: "database UUID generation is forbidden" },
  { pattern: /\bGENERATED\s+ALWAYS\b/i, label: "generated database behavior is forbidden" },
];

export function checkSqlConformance(sql: string): string[] {
  const failures: string[] = [];
  for (const rule of FORBIDDEN_SQL_PATTERNS) {
    if (rule.pattern.test(sql)) failures.push(rule.label);
  }
  return failures;
}
