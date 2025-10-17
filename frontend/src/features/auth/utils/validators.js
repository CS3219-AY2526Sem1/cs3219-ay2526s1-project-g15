export function passwordIssues(pw="") {
  const issues = [];
  if (pw.length < 13) issues.push("Minimum 13 characters");
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) issues.push("At least one lowercase and uppercase letter");
  if (!/\d/.test(pw)) issues.push("At least one number");
  if (!/[-!@#$%]/.test(pw)) issues.push("At least one of the following: -!@#$%");
  return issues;
}
