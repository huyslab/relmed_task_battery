/**
 * Self-Report Questionnaire Timeline
 *
 * Assembles one or more self-report questionnaires (PHQ-9, GAD-7) into a timeline. Each
 * questionnaire opens with its instructions and then asks one item per screen, answered with
 * a single tap on the option - see plugin-self-report-item.js for the screen itself.
 *
 * The questionnaires are asked in the order the caller lists them, and each one marks its own
 * start and finish with `updateState`, using the same `PHQ9_start` / `GAD7_start` names the
 * RELMED trial 1 battery reported, so the hosting site sees the states it already knows.
 */

import { updateState, saveDataREDCap } from "@utils/index.js";
import { getQuestionnaire } from "./questionnaires.js";

/**
 * Builds the screens for a single questionnaire: its instructions, then its items.
 *
 * @param {Object} questionnaire - A definition from questionnaires.js
 * @param {number} position - 1-based position of this questionnaire in the run
 * @param {number} total - Number of questionnaires in the run
 * @param {Object} settings - Task configuration settings
 * @returns {Array} Array of jsPsych trial objects
 */
function questionnaireScreens(questionnaire, position, total, settings) {
    const shared = {
        type: jsPsychSelfReportItem,
        questionnaire: questionnaire.key,
        transition_duration: settings.transition_duration,
        input_mode: settings.input_mode
    };

    const screens = [{
        ...shared,
        question_type: 'message',
        prompt: questionnaire.instructions,
        hint: questionnaire.hint,
        // Numbered only when there is more than one, so a single questionnaire doesn't
        // announce itself as "1 of 1"
        progress_label: total > 1 ? `Questionnaire ${position} of ${total}` : '',
        button_label: 'Start',
        data: { trialphase: `${questionnaire.key}_instructions` }
    }];

    questionnaire.items.forEach((item, i) => {
        screens.push({
            ...shared,
            question_type: 'likert',
            context: questionnaire.context,
            prompt: item.text,
            item_id: item.id,
            item_index: i,
            n_items: questionnaire.items.length,
            catch_type: item.catch_type,
            progress_label: `Question ${i + 1} of ${questionnaire.items.length}`,
            options: questionnaire.scale,
            data: { trialphase: questionnaire.key },
            // Save as we go, so a session interrupted part way still has the earlier answers.
            // Every item would mean a full data post per tap, which is a lot of traffic for a
            // long questionnaire, so this is throttled. The last item is skipped rather than
            // counted: the questionnaire's own on_timeline_finish saves right after it, and
            // whether that would have been a double post depends on the item count dividing
            // by save_every (PHQ-9's ten items and the default five do).
            on_finish: () => {
                const isLastItem = i === questionnaire.items.length - 1;
                if (!isLastItem && (i + 1) % settings.save_every === 0) saveDataREDCap();
            }
        });
    });

    return screens;
}

/**
 * Creates the complete timeline for a set of self-report questionnaires
 *
 * @param {Object} settings - Task configuration settings
 * @param {string} settings.task_name - Name used for the state updates
 * @param {Array<string>} settings.questionnaires - Which questionnaires to ask, in order
 * @param {boolean} settings.include_intro - Whether to open with a screen introducing the set
 * @param {number} settings.save_every - Save to REDCap after every this many items
 * @param {number} settings.transition_duration - Slide transition duration in ms
 * @param {string} settings.input_mode - 'touch', 'keyboard', or 'auto' to pick from the device
 *
 * @returns {Array} Array of jsPsych timeline objects for the questionnaires
 */
export function createSelfReportTimeline(settings) {
    const names = settings.questionnaires;
    const questionnaires = names.map((name) => getQuestionnaire(name));

    const timeline = questionnaires.map((questionnaire, q) => ({
        timeline: questionnaireScreens(questionnaire, q + 1, questionnaires.length, settings),
        on_timeline_start: () => { updateState(`${questionnaire.key}_start`); },
        on_timeline_finish: () => {
            updateState(`${questionnaire.key}_finish`, false);
            saveDataREDCap(3);
        }
    }));

    if (settings.include_intro) {
        const count = questionnaires.length === 1 ? 'a short questionnaire'
            : `${questionnaires.length} short questionnaires`;

        timeline.unshift({
            timeline: [{
                type: jsPsychSelfReportItem,
                question_type: 'message',
                prompt: `Now ${count} about how you have been feeling.`,
                hint: 'One question at a time. Tap the answer that fits best - there are no right or wrong answers, and your first response is usually the best one.',
                button_label: 'Start',
                transition_duration: settings.transition_duration,
                input_mode: settings.input_mode,
                data: { trialphase: `${settings.task_name}_intro` }
            }]
        });
    }

    return [{
        timeline,
        on_timeline_start: () => { updateState(`${settings.task_name}_start`); },
        on_timeline_finish: () => {
            updateState(`${settings.task_name}_finish`, false);
            saveDataREDCap(3);
        }
    }];
}
