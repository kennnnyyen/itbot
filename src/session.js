// Identity comes from data-username and data-first-name attributes on the <script> tag.
// Browser token / localStorage session management is no longer used — the server
// looks up returning users by username via the X-Username header.

export function getBrowserToken() { return null; }  // noop — no longer imported
export function persistToken() {}                    // noop — no longer imported
