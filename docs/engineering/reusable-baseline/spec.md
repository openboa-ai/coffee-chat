# Additive reusable baseline CI

Product planning remains pending. This change connects repository hygiene checks
to an immutable shared workflow. Keep the existing required `Repository baseline`
job, read-only permissions, branch protection and code-owner review policy.

Add a `trusted-baseline` caller job to Repository CI for pull requests and main
pushes. Call `openboa-ai/.github/.github/workflows/repository-baseline.yml` at full
SHA `04b282e50ed07ebf4ddb467dac95c2f7222f199e`, without inputs or inherited secrets.
The shared workflow checks event commits, workflow syntax, whitespace and secrets;
it never executes product code. Manual dispatch retains the existing baseline and
skips the event-bound shared workflow. Failed shared checks fail the CI run.

Acceptance requires local workflow lint and whitespace checks, the existing
baseline passing, and an actual PR run that exposes the pinned referenced workflow
and a successful shared job for the current head/base. Record the observed job
name before registering a new required check. Register it only after the caller
exists on main, and keep both checks required. A changed head requires fresh CI
and review. This adds no product validation, deployment, automatic merge authority,
credentials or changes to the established review boundary.

Delivery requires the central workflow change to be accepted and merged, this
repository's code-owner review for the current head, and current CI. A draft
caller may exercise the source-reviewed immutable candidate before delivery. If
the accepted central revision changes, update this pin and repeat verification
and review. Existing main remains the recovery path until normal delivery.
