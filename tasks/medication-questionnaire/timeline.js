/**
 * Medication Questionnaire Timeline
 *
 * A short questionnaire about the medication a participant was invited to the study for,
 * asked at the start of a session. One question per screen, finger-sized controls, and no
 * way back to an earlier question - each screen is a separate trial and its answer is
 * committed when it slides away.
 */

import { updateState, saveDataREDCap } from "@utils/index.js"

/**
 * Builds the list of question screens.
 *
 * @param {Object} settings - Task configuration settings
 * @returns {Array} Array of question definitions for the medication-question plugin
 */
function medicationQuestions(settings) {
    const unsure = settings.allow_unsure ? "I'm not sure" : null;

    // Options for "how many pills a day", with the last one handing over to the keypad
    const pillChoices = [];
    for (let i = 1; i < settings.max_pill_buttons; i++) {
        pillChoices.push({ label: String(i), value: i });
    }
    pillChoices.push({
        label: `${settings.max_pill_buttons} or more`,
        value: null,
        reveals: 'number'
    });

    return [
        {
            question_type: 'text',
            name: 'medication_name',
            prompt: 'What is the name of the medicine you were invited to this study for?',
            hint: 'Please copy it exactly as it is written on the package.',
            placeholder: 'Name of the medicine',
            unsure_label: unsure
        },
        {
            question_type: 'number',
            name: 'medication_dose_mg',
            prompt: 'How strong is one pill?',
            hint: 'The package shows a number followed by "mg". Please type that number.',
            placeholder: 'For example, 50',
            unit: 'mg',
            unsure_label: unsure
        },
        {
            question_type: 'choice',
            name: 'pills_per_day',
            prompt: 'How many of these pills do you take each day?',
            choices: pillChoices,
            keypad_prompt: 'How many pills a day?'
        },
        {
            question_type: 'date',
            name: 'medication_start_date',
            prompt: 'When did you start taking this medicine?',
            hint: 'If it was a long time ago, the year on its own is fine. Leave anything you are unsure about blank.',
            required: false,
            earliest_year: settings.earliest_year
        },
        {
            question_type: 'list',
            name: 'other_medications',
            prompt: 'Have you taken any other prescription medicines this week?',
            hint: 'This means anything a doctor prescribed for you, apart from the medicine above.',
            placeholder: 'Name of the medicine',
            required: false,
            list_labels: {
                yes: 'Yes, I have',
                no: 'No, none',
                add: 'Add',
                add_prompt: 'Add them one at a time.',
                empty: 'Nothing added yet.'
            }
        }
    ];
}

/**
 * Creates the complete timeline for the medication questionnaire
 *
 * @param {Object} settings - Task configuration settings
 * @param {string} settings.task_name - Name used for the state updates and data fields
 * @param {boolean} settings.include_intro - Whether to open with a short welcome screen
 * @param {boolean} settings.allow_unsure - Whether to offer an "I'm not sure" escape button
 * @param {number} settings.max_pill_buttons - Highest pills-per-day button before the keypad
 * @param {number} settings.earliest_year - Earliest year offered in the start date question
 * @param {number} settings.transition_duration - Slide transition duration in ms
 * @param {string} settings.input_mode - 'touch', 'keyboard', or 'auto' to pick from the device
 *
 * @returns {Array} Array of jsPsych timeline objects for the questionnaire
 */
export function createMedicationQuestionnaireTimeline(settings) {
    const questions = medicationQuestions(settings);

    const screens = questions.map((question, i) => ({
        type: jsPsychMedicationQuestion,
        question_index: i,
        n_questions: questions.length,
        transition_duration: settings.transition_duration,
        input_mode: settings.input_mode,
        ...question,
        data: {
            trialphase: `${settings.task_name}_${question.name}`
        },
        // Save as we go, so a session interrupted part way still has the earlier answers
        on_finish: () => { saveDataREDCap(); }
    }));

    if (settings.include_intro) {
        screens.unshift({
            type: jsPsychMedicationQuestion,
            question_type: 'message',
            name: 'medication_questionnaire_intro',
            prompt: 'First, a few questions about your medicine.',
            hint: 'There are five short questions. It helps to have the package with you, but if you do not have it, just answer as best you can.',
            button_label: 'Start',
            transition_duration: settings.transition_duration,
            input_mode: settings.input_mode,
            data: { trialphase: `${settings.task_name}_intro` }
        });
    }

    return [{
        timeline: screens,
        on_timeline_start: () => { updateState(`${settings.task_name}_start`); },
        on_timeline_finish: () => {
            updateState(`${settings.task_name}_finish`, false);
            saveDataREDCap(3);
        }
    }];
}
