import { saveDataREDCap } from './data-handling.js';

/**
 * Participation validation and warning system utilities
 * Manages participant compliance, attention checks, and warning mechanisms
 */

/**
 * Prevents page refresh during experiment to maintain data integrity
 * @param {Event} e - The beforeunload event
 */
function preventRefresh(e) {
    // Cancel the event
    e.preventDefault();
    e.returnValue = '';
}

/**
 * Prevents users from terminating or interfering with the experiment by disabling
 * common browser developer tools and refresh actions.
 * 
 * Blocks right-click context menu, F12 key, Ctrl+Shift+I, Cmd+I shortcuts,
 * and prompts before page refresh to maintain experiment integrity.
 */
function preventParticipantTermination() {
    // Prevent right-click
    document.addEventListener('contextmenu', event => event.preventDefault());

    document.addEventListener("keydown", (e) => {
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I") || (e.metaKey && e.code === "KeyI")) {
            e.preventDefault();
        }
    });

    // Prompt before refresh
    window.addEventListener('beforeunload', preventRefresh);
}

  // Function that checks for fullscreen
function check_fullscreen(){
    if (window.debug || window.context === "relmed"){
        return false
    }

    var int = jsPsych.data.getInteractionData(),
    exit = int.values().filter(function(e){
        return e.event == "fullscreenexit"
    }),
    enter = int.values().filter(function(e){
        return e.event == "fullscreenenter"
    });

    if (exit.length > 0){
        return exit[exit.length - 1].time > enter[enter.length - 1].time
    }else{
        return false
    }
}

/**
 * jsPsych trial configuration for fullscreen enforcement
 * Prompts participants to return to fullscreen mode when they exit
 */
const fullscreen_prompt = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    css_classes: ['instructions'],
    timeline: [
      {
        message: `<p>This study only runs in full screen mode.<p>
            <p>Press the button below to return to full screen mode and continue.</p>`
      }
    ],
    conditional_function: check_fullscreen,
    on_finish: function() {
      // Update warning count
      var up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
      jsPsych.data.addProperties({
        n_warnings: up_to_now + 1
      });
    },
    data: {
      trialphase: 'fullscreen-prompt'
    }
}

/**
 * jsPsych trial configuration for pre-exclusion warning
 * Warns participants who are receiving too many response time warnings
 */

function preKickOutWarning(settings) {
    return {
        type: jsPsychHtmlButtonResponse,
        conditional_function: function() {
        if ((jsPsych.data.get().last(1).select('n_warnings').values[0] >= settings.interimWarning) &&
        !jsPsych.data.get().last(1).select('pre_kick_out_warned').values[0]
        ) {
            jsPsych.data.addProperties(
                {
                    pre_kick_out_warned: true
                }
            );
            return true;
        } else {
            return false;
        }
        },
        css_classes: ['instructions'],
        timeline: [
            {
                stimulus: `<p>You seem to be taking too long to respond on the tasks.</p>
                    <p>Please try to respond more quickly. Also, please keep your attention on the task window, and don't use other tabs or windows.</p>
                    <p>If you continue to receive too many warnings, we will have to stop your participation in this experiment.</p>
                    <p>Tap the button below to continue.</p>
                `,
                on_start: function(trial) {
                    // Save data
                    saveDataREDCap(3);
            }
            }
        ],
        choices: ['Continue'],
        data: {
        trialphase: 'pre-kick-out-warning'
        }
    }
}
/**
 * Context-specific kick-out warning configuration
 * Different behavior for RELMED vs Prolific participants
 */
function kickOutWarning(settings)  {
    return {
        type: jsPsychHtmlButtonResponse,
        conditional_function: function() {
            const n_warnings = jsPsych.data.get().last(1).select('n_warnings').values[0];
            const warned = jsPsych.data.get().last(1).select('kick_out_warned').values[0] || false;
            if ((n_warnings >= settings.finalWarning) && (!warned)) {
                jsPsych.data.addProperties(
                    {
                        kick_out_warned: true
                    }
                );

                return true;
            } else {
                return false;
            }
        },
        css_classes: ['instructions'],
        timeline: [
            {
            stimulus: `<p>You might be taking a little too long to make your choices.</p>
            <p>We're interested in your quick judgments, so please try to respond a little faster—even if it feels a bit less precise.</p>
            <p>Tap the button below to continue.</p>
            `
            }
        ],
        choices: ['Continue'],
        data: {
            trialphase: 'speed-accuracy'
        }
    };
}
/**
 * Combined kick-out trial timeline
 * Includes both pre-warning and final kick-out stages
 */
function kickOut(settings) {
        return {
        timeline: [
            preKickOutWarning(settings),
            kickOutWarning(settings)
        ]
    };
}

/**
 * Creates instruction-based kick-out trial for participants who fail comprehension checks
 * Only applies to Prolific context (RELMED participants get more chances)
 * @param {string} task - Task name for tracking instruction failures
 * @returns {Object|undefined} jsPsych trial object or undefined for RELMED context
 */

const createInstructionsKickOut = (task) => {
    if (window.context == "relmed") {
        return undefined;
    } else {
        return {
            type: jsPsychHtmlKeyboardResponse,
            conditional_function: function () {
                if (jsPsych.data.get().last(1).select(`${task}_instruction_fail`).values[0] >= window.max_instruction_fails) {
                    return true;
                } else {
                    return false;
                }
            },
            css_classes: ['instructions'],
            timeline: [
                {
                    stimulus: '...',
                    trial_duration: 200,
                    on_finish: function (data) {
                        // Save data
                        saveDataREDCap(3);
                        // Allow refresh
                        window.removeEventListener('beforeunload', preventRefresh);
                    }
                },
                {
                    stimulus: `<p>Thank you for your time—unfortunately, it seems that the instructions weren’t fully understood, so we won’t be able to proceed with the experiment.</p>
                    <p>If you believe this is a mistake, please email haoyang.lu@ucl.ac.uk, explaining the circumstances.</p>
                    <p>Please return this study on <a href="https://app.prolific.com/">Prolific</a>.</p>
                    <p>You may now close this tab.</p>
                `
                }
            ],
            choices: ["NO_KEYS"],
            data: {
                trialphase: 'kick-out'
            }
        }
    }
}

/**
 * Checks if the browser is currently in fullscreen mode
 * Used to enforce fullscreen participation in experiments
 * @returns {boolean} True if user has exited fullscreen, false otherwise
 */
function checkFullscreen(){
    // Skip fullscreen check in debug mode or RELMED context
    if (window.debug || window.context === "relmed"){
        return false
    }

    // Get interaction data to check fullscreen events
    var int = jsPsych.data.getInteractionData(),
    exit = int.values().filter(function(e){
        return e.event == "fullscreenexit"
    }),
    enter = int.values().filter(function(e){
        return e.event == "fullscreenenter"
    });

    // Check if most recent event was an exit
    if (exit.length > 0){
        return exit[exit.length - 1].time > enter[enter.length - 1].time
    }else{
        return false
    }
}

// Warnings for unresponsive trials
/**
 * Determines whether a warning can be shown for a given task on this trial.
 *
 * This function checks multiple conditions to decide if a warning should be displayed:
 * 1. The total number of warnings issued so far for the specified task (`${task}_n_warnings`) 
 *    is less than the maximum allowed (`window.max_warnings_per_task`).
 * 2. The warning was not already shown in the specified number of trials back 
 *    (default is the last trial, useful for pre-trial computations; change to 2 for post-trial computations). This is determined either by:
 *  a. The last trial's `trialphase` is `"no_choice_warning"` (used for tasks with external warning messages).
 *  b. Checking data field `"response_deadline_warning"` for the last task trial (used for tasks with interal warning messages).
 * 5. If `window.context` is `"prolific"`, a warning is always allowed, overriding other conditions.
 *
 * @param {string} task - The name of the task, used to track task-specific warnings.
 * @param {number} [warning_expected_n_back=1] - The number of trials back to check 
 *        whether a warning was already shown.
 * @returns {boolean} - Returns `true` if a warning can be shown, otherwise `false`.
 */
const canBeWarned = (settings, override_n_back = null) => {
    // Fetch number of previous warnings on this task
    const task_n_warnings = jsPsych.data.get().last(1).select(`${settings.task_name}_n_warnings`).values[0] ?? 0;
    // console.log(`Task ${settings.task_name} has received ${task_n_warnings} warnings so far.`)

    // Check the type of last trial. For tasks with external warning messages this would be "no_choice_warning"
    const last_trial = jsPsych.data.get().last(override_n_back ?? settings.warning_expected_n_back).select("trialphase").values[0];
    // console.log(`The last trial was of type: ${last_trial}`);

    // Check for a data field documenting warning message shown. For tasks with internal warning messages this would be "response_deadline_warning"
    const last_trial_shown = jsPsych.data.get().filter({trialphase: settings.task_name}).last(override_n_back ?? settings.warning_expected_n_back).select("response_deadline_warning").values[0] ?? false;
    // console.log(`Was a warning shown in the last trial? ${last_trial_shown || last_trial == "no_choice_warning"}`);

    return ((task_n_warnings < settings.max_warnings_per_task) && (last_trial !== "no_choice_warning") && (!last_trial_shown));
};

/**
 * Displays a temporary warning message overlay on the screen
 * Used for inline feedback during tasks without interrupting flow
 * @param {string} message - Warning message to display
 * @param {number} duration - Duration to show warning in milliseconds (default: 800)
 */
function showTemporaryWarning(message, duration = 800) {
    // Create warning element
    const warningElement = document.createElement('div');
    warningElement.id = 'vigour-warning-temp';
    warningElement.innerText = message;

    // Style the warning with modern CSS
    warningElement.style.cssText = `
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        background-color: rgba(244, 206, 92, 0.9);
        padding: 15px 25px;
        border-radius: 8px;
        width: min(92vw, 440px);
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 24px;
        font-weight: 500;
        color: #182b4b;
        opacity: 0;
        transition: opacity 0.2s ease;
        text-align: center;
        letter-spacing: 0.0px;
    `;

    // Add to document body
    document.body.appendChild(warningElement);

    // Force reflow to ensure transition works
    warningElement.offsetHeight;

    // Show warning with fade-in effect
    warningElement.style.opacity = '1';

    // Remove after duration with fade-out effect
    setTimeout(() => {
        warningElement.style.opacity = '0';
        setTimeout(() => {
            warningElement.remove();
        }, 200); // Wait for fade out transition
    }, duration);
}

/**
 * Creates a warning trial for participants who didn't respond in time
 * Shows a brief message and updates warning counters
 * @param {string} resp_var - Response variable name to check (default: "response")
 * @param {string} stimulus - HTML stimulus to display during warning
 * @param {string} task - Task name for tracking warnings
 * @returns {Object} jsPsych trial configuration object
 */
function noChoiceWarning(resp_var = "response", stimulus = "", settings) {
    const warning_trial = {
        timeline: [{
            type: jsPsychHtmlKeyboardResponse,
            choices: "NO_KEYS",
            stimulus: stimulus,
            data: {
                trialphase: "no_choice_warning"
            },
            trial_duration: 1000,
            on_load: function () {
                showTemporaryWarning("Didn't catch a response - moving on", 800);
            }
        }],
        conditional_function: function () {
            const last_trial_choice = jsPsych.data.get().last(1).select(resp_var).values[0];

            return (last_trial_choice === null) && canBeWarned(settings)
            
        },
        on_finish: () => {
            // Update task warning counter if can be warned on this trial
            const task_n_warnings = jsPsych.data.get().last(1).select([`${settings.task_name}_n_warnings`]).values[0];
            jsPsych.data.addProperties({
                [`${settings.task_name}_n_warnings`]: task_n_warnings + 1
            });
        }
    }
    return warning_trial;
};

/**
 * Sets up event listeners for tracking multiple simultaneous key presses
 * Used for trials requiring participants to press multiple keys simultaneously
 * @param {Array} keysToTrack - Array of key names to track (e.g., ['ArrowLeft', 'ArrowRight'])
 * @param {Function} callback_function - Function to call when all keys are pressed
 * @param {Element} targetElement - DOM element to attach listeners to (default: document)
 * @returns {Object} Object with cleanup function to remove event listeners
 */
function setupMultiKeysListener(keysToTrack, callback_function, targetElement = document) {
    const pressedKeys = {};

    // Named functions are required for proper removal
    function handleKeyDown(event) {
        pressedKeys[event.key] = true;
        areKeysPressed() ? callback_function() : null;
    }

    function handleKeyUp(event) {
        pressedKeys[event.key] = false;
    }

    // Attach event listeners
    targetElement.addEventListener('keydown', handleKeyDown);
    targetElement.addEventListener('keyup', handleKeyUp);

    // Check if all required keys are currently pressed
    function areKeysPressed() {
        return keysToTrack.every(key => pressedKeys[key] === true);
    }

    // Cleanup function to remove listeners
    function cleanup() {
        targetElement.removeEventListener('keydown', handleKeyDown);
        targetElement.removeEventListener('keyup', handleKeyUp);
    }

    return {
        // areKeysPressed,
        cleanup
    };
}

/**
 * Creates a trial requiring participants to press both arrow keys simultaneously
 * Used for attention checks and ensuring participant engagement
 * @param {string} stimulus - HTML stimulus to display
 * @param {string} trialphase - Phase identifier for data logging
 * @returns {Object} jsPsych trial configuration object
 */
function createPressBothTrial(stimulus, trialphase){
    return {
        type: jsPsychHtmlKeyboardResponse,
        css_classes: ['instructions'],
        stimulus: stimulus,
        choices: ['arrowleft', 'arrowright'],
        data: {trialphase: trialphase},
        on_finish: () => {
            // Reset warning counter for reversal task
            jsPsych.data.addProperties({
                reversal_n_warnings: 0
            });
        },
        response_ends_trial: () => {
            console.log(`response_ends_trial: ${window.simulating || false}`)
            return window.simulating || false
        },
        on_load: function() {
            // Skip multi-key setup if simulating
            if (window.simulating || false){
                return
            }

            const start = performance.now();
            const callback = function() {
                jsPsych.finishTrial({
                    rt: Math.floor(performance.now() - start)
                });
                // Clean up the event listeners to prevent persisting into the next trial
                multiKeysListener.cleanup();
            }

            // Set up listener for simultaneous arrow key presses
            const multiKeysListener = setupMultiKeysListener(
                ['ArrowRight', 'ArrowLeft'], 
                callback
            );
        }
    }
}

// Export functions for use in other modules
export {
    preventRefresh,
    fullscreen_prompt,
    kickOut,
    createInstructionsKickOut,
    checkFullscreen,
    canBeWarned,
    showTemporaryWarning,
    noChoiceWarning,
    setupMultiKeysListener,
    createPressBothTrial,
    preventParticipantTermination
};
