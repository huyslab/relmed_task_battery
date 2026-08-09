/**
 * Self-report questionnaire definitions
 *
 * Ported from the RELMED trial 1 battery (huyslab/relmed_trial1, questionnaires.js), where
 * these were rendered as a wide item x scale grid. The items, their order, the scale and the
 * catch items are kept exactly as they were there, so responses stay comparable; only the way
 * they are presented has changed - see plugin-self-report-item.js.
 *
 * Item ids are positional (`PHQ9_Q01` ... ) and count the catch items, matching the `Q01`...
 * form field names the grid produced.
 */

/** The 0-3 frequency scale both PHQ-9 and GAD-7 use */
const frequencyScale = [
    { label: "Not at all", value: 0 },
    { label: "Several days", value: 1 },
    { label: "More than half the days", value: 2 },
    { label: "Nearly every day", value: 3 }
];

/**
 * Turns a list of item texts into item objects, numbering them by position.
 *
 * @param {string} questionnaire - Questionnaire key, used as the item id prefix
 * @param {Array<string|Object>} items - Item text, or {text, catch_type, catch_origin} for a catch item
 * @returns {Array<Object>} Items as {id, text, catch_type, catch_origin, scored}
 */
function numberItems(questionnaire, items) {
    return items.map((item, i) => {
        const entry = typeof item === 'string' ? { text: item } : item;
        return {
            id: `${questionnaire}_Q${String(i + 1).padStart(2, '0')}`,
            text: entry.text,
            // 'infrequency' - an item almost nobody endorses; 'consistency' - a near-repeat of
            // another item, which should be answered the same way. Null for a real item.
            catch_type: entry.catch_type || null,
            // The item a 'consistency' catch should agree with
            catch_origin: entry.catch_origin || null,
            // Catch items are not part of the published scale, so they stay out of the total
            scored: !entry.catch_type
        };
    });
}

export const Questionnaires = {
    PHQ9: {
        key: 'PHQ9',
        name: 'PHQ-9',
        // Shown on the questionnaire's own opening screen
        instructions: `Over the <u>last 2 weeks</u>, how often have you been bothered by any of the following problems?`,
        hint: `There are no right or wrong answers. Answer for how things have been for you.`,
        // Repeated above every item, since the timeframe is part of what is being asked
        context: `Over the <u>last 2 weeks</u>, how often have you been bothered by...`,
        scale: frequencyScale,
        items: numberItems('PHQ9', [
            "Little interest or pleasure in doing things",
            "Feeling down, depressed, or hopeless",
            "Trouble falling or staying asleep, or sleeping too much",
            "Feeling tired or having little energy",
            "Poor appetite or overeating",
            "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
            "Trouble concentrating on things, such as reading the newspaper or watching television",
            "Moving or speaking so slowly that other people have noticed, or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
            {
                text: "Experiencing sadness or a sense of despair",
                catch_type: 'consistency',
                catch_origin: 'PHQ9_Q02'
            },
            "Thoughts that you would be better off dead, or of hurting yourself in some way"
        ])
    },
    GAD7: {
        key: 'GAD7',
        name: 'GAD-7',
        instructions: `Over the <u>last 2 weeks</u>, how often have you been bothered by the following problems?`,
        hint: `There are no right or wrong answers. Answer for how things have been for you.`,
        context: `Over the <u>last 2 weeks</u>, how often have you been bothered by...`,
        scale: frequencyScale,
        items: numberItems('GAD7', [
            "Feeling nervous, anxious or on edge",
            "Not being able to stop or control worrying",
            "Worrying too much about different things",
            "Trouble relaxing",
            "Being so restless that it is hard to sit still",
            "Becoming easily annoyed or irritable",
            {
                text: "Worrying about the 1974 Eurovision Song Contest",
                catch_type: 'infrequency'
            },
            "Feeling afraid as if something awful might happen"
        ])
    }
};

/**
 * Looks up a questionnaire by key.
 *
 * Throws rather than skipping: a module that asks for a questionnaire the battery doesn't
 * have should fail at setup, not quietly collect one fewer measure than the study expects.
 *
 * @param {string} key - A key of Questionnaires, e.g. 'PHQ9'
 * @returns {Object} The questionnaire definition
 */
export function getQuestionnaire(key) {
    const questionnaire = Questionnaires[key];
    if (!questionnaire) {
        throw new Error(
            `Unknown questionnaire "${key}". Available: ${Object.keys(Questionnaires).join(', ')}.`);
    }
    return questionnaire;
}
