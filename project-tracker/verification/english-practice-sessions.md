# English practice completion — 2026-10-18

Completed rounds are stored with the final review in a single record patch. Session IDs are stable during retry; incomplete practice does not produce a completed round. Records remain private, survive refresh, and preserve concurrently added sessions.

Verification: 151 Node tests; component/page builds; synthetic Edge browser workflow covers last-save failure/retry, correct/incorrect answers, two completed rounds, reload/history/today status, early exit, empty library, dictation, and 320/390/1440 widths. No production practice records are created by tests.

Premium static audit reports 36 pre-existing warnings/errors in shared legacy/adapter flows (including hidden native fields and delegated buttons); it is not a clean audit. Runtime checks cover the changed practice flow.
