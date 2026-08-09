/**
 * Open Text Task Instructions
 * 
 * This module provides instruction pages for the open text response task,
 * where participants answer questions by typing text responses about themselves,
 * their feelings, background, attitudes, and behaviors.
 */

import { updateState } from "@utils/index.js"

// ------------> Instruction texts <---------------

/**
 * Creates the main instruction page explaining the open text task
 * @param {Object} settings - Task configuration settings
 * @param {string} settings.oq_timelimit_text - Time limit display text for responses
 * @param {number} settings.min_words - Minimum word count required per response
 * @returns {string} HTML content for instruction page 2
 */
const instrPage2 = (settings) => {
    return `
        <p><b>Next, you'll be answering questions by typing text responses.</b></p>
        <p>These questions will ask about yourself, your feelings, background, attitudes, and everyday behaviors.</p>
        <p>For each question, you'll have <b>`+settings.oq_timelimit_text+`</b> to write a response containing <b>at least `+settings.min_words.toString()+` words</b>.</p>
    `
}

/**
 * Instruction page explaining that questions may seem repetitive
 * Encourages participants to answer each question thoroughly despite similarities
 */
const instr_page5 = `
    <p>You may notice that some questions appear to be similar or repetitive. This is intentional - <b>please answer each question carefully and thoroughly.</b></p>
    `


/**
 * Combines all instruction pages into an array
 * @param {Object} settings - Task configuration settings
 * @returns {string[]} Array of HTML instruction page content
 */
const instrPages = (settings) => {return [instrPage2(settings), instr_page5]} 

/**
 * Creates the jsPsych instructions trial for the open text task
 * @param {Object} settings - Task configuration settings
 * @param {string} settings.session - Current session identifier (e.g., "wk24", "wk28")
 * @returns {Object} jsPsych instructions trial configuration
 */
export function openTextInstructions(settings) {
    const instr_pages = instrPages(settings);

    return {
        type: jsPsychInstructions,
        pages: instr_pages,
        css_classes: ['instructions'],
        show_clickable_nav: true,
        button_label_previous: 'Back',
        button_label_next: 'Next',
        allow_keys: false,
        simulation_options: {
            data: {
                rt: 1000
            }
        },
        // Enable keyboard navigation during simulation mode
        on_start: function(trial) {
            if (window.simulating) {
                trial.allow_keys = true;
                trial.key_forward = ' ';
            }
        },
        // Update button text on final page to indicate task start
        on_page_change: function (current_page) {
            let next_button_element = document.querySelector('button#jspsych-instructions-next')
            if (current_page === instr_pages.length - 1) {
                next_button_element.innerHTML = '<b><u>Start answering questions</u></b>'
            }
        },
        show_page_number: true,
        // Update application state when instructions complete
        on_finish: () => {
            // Disable resume functionality for specific sessions. open_text declares no
            // session of its own, so sessionInfo is null whenever it runs outside a launch
            // that supplies one (examples/open-text.html) - and a run with no session has no
            // restricted policy to honour.
            if (settings.sessionInfo?.resumePolicy === 'restricted'){
                updateState("no_resume");
            }
            // Mark that open text task has started
            updateState("open_text_task_start");
        }
    }
}
