// api/session-registry.js
// The single source of truth for what a session is. A hosting site sends a session label
// ("Session 2", "Week 2", "Training"); that label is resolved to one of the canonical keys
// below exactly once, at launch, and the resolved key then drives every task in the run -
// which trial sequence loads, which stimulus set is used, which variant of the rules and
// instructions is shown, and how resumption is signalled back to the site.
//
// Adding a session means adding an entry here, but the entry is not the whole job: see the
// "Sessions" section of the README for what lives outside this file (asset folders, sequence
// files, control's per-session tables).

export const SessionRegistry = {
    screening: {
        name: 'Screening',
        // Not part of the numbered study order, so "Session N" never resolves to it
        order: null,
        aliases: ['training'],
        variant: 'screening',
        stimulusSet: 'screening',
        resumePolicy: 'standard'
    },
    wk0: {
        name: 'Week 0',
        order: 1,
        aliases: [],
        variant: 'full',
        stimulusSet: 'wk0',
        resumePolicy: 'standard'
    },
    wk2: {
        name: 'Week 2',
        order: 2,
        aliases: [],
        variant: 'full',
        stimulusSet: 'wk2',
        resumePolicy: 'standard'
    },
    wk4: {
        name: 'Week 4',
        order: 3,
        aliases: [],
        variant: 'full',
        stimulusSet: 'wk4',
        resumePolicy: 'standard'
    },
    wk24: {
        name: 'Week 24',
        order: 4,
        aliases: [],
        variant: 'full',
        stimulusSet: 'wk24',
        resumePolicy: 'restricted'
    },
    wk28: {
        name: 'Week 28',
        order: 5,
        aliases: [],
        variant: 'full',
        stimulusSet: 'wk28',
        resumePolicy: 'restricted'
    }
};

/**
 * Strips the formatting differences between the same label written by different sites,
 * so "Session 2", "session_2" and "session-2" all compare equal.
 *
 * @param {string} label - A session label
 * @returns {string} The label lowercased with spaces, underscores and hyphens removed
 */
function normalizeLabel(label) {
    return String(label).trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Resolves a hosting site's session label to a canonical session key.
 *
 * The label is whatever the study admin named the session in StudyManagement, so accept
 * mymeds' default ("Session 1"), RELMED-style week labels ("Week 0"), the raw keys ("wk0",
 * "screening"), and any alias a session declares ("Training"). Everything is matched against
 * the registry rather than a hand-maintained list, so adding a session here is enough.
 *
 * @param {string} label - The session label from the URL
 * @returns {string|null} A key of SessionRegistry, or null if the label is not recognised
 */
export function resolveSession(label) {
    if (!label) return null;

    const normalized = normalizeLabel(label);

    // Raw session key, e.g. "wk0" or "screening"
    if (SessionRegistry[normalized]) return normalized;

    // An alias a session declares for itself, e.g. mymeds' "Training" for screening
    const aliased = Object.keys(SessionRegistry).find((key) =>
        (SessionRegistry[key].aliases || []).some((alias) => normalizeLabel(alias) === normalized));
    if (aliased) return aliased;

    // Week label, e.g. "Week 24" -> "wk24"
    const week = normalized.match(/^week(\d+)$/);
    if (week && SessionRegistry[`wk${week[1]}`]) return `wk${week[1]}`;

    // Ordinal label, e.g. "Session 2" -> the session the study runs second
    const session = normalized.match(/^session(\d+)$/);
    if (session) {
        const position = parseInt(session[1], 10);
        const ordered = Object.keys(SessionRegistry).find((key) => SessionRegistry[key].order === position);
        if (ordered) return ordered;
    }

    return null;
}

/**
 * Looks up a session entry by its canonical key.
 *
 * Throws rather than returning a default: every caller here is about to pick stimuli, rules
 * or a trial sequence, and doing that for the wrong session is worse than not running.
 *
 * @param {string} key - A key of SessionRegistry
 * @returns {Object} The session entry
 */
export function getSession(key) {
    const session = SessionRegistry[key];
    if (!session) {
        throw new Error(`Unknown session "${key}". Available sessions: ${listSessions().join(', ')}.`);
    }
    return session;
}

/**
 * Get list of all canonical session keys
 * @returns {Array<string>} Array of session keys
 */
export function listSessions() {
    return Object.keys(SessionRegistry);
}

/**
 * Describes the session labels resolveSession accepts, derived from the same registry it
 * resolves against so an error message can't drift from the behaviour.
 *
 * @returns {string} Human-readable list of accepted labels
 */
export function describeAcceptedSessions() {
    const keys = listSessions();
    const ordered = keys.filter((key) => SessionRegistry[key].order !== null);
    const weekLabels = keys.filter((key) => /^wk\d+$/.test(key)).map((key) => `"Week ${key.slice(2)}"`);
    const aliases = keys.flatMap((key) => (SessionRegistry[key].aliases || []).map((alias) => `"${alias}"`));

    return [
        ordered.length ? `"Session 1"-"Session ${ordered.length}"` : null,
        weekLabels.length ? weekLabels.join(', ') : null,
        aliases.length ? aliases.join(', ') : null,
        `or a session key (${keys.join(', ')})`
    ].filter(Boolean).join(', ');
}
