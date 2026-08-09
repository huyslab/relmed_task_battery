/**
 * Reversal Learning Task Implementation
 * 
 * This module creates the jsPsych timeline for the reversal learning task where participants
 * choose between two options (squirrels) with changing reward probabilities.
 * The task measures participants' ability to adapt to changing contingencies.
 */

// This files creates the jsPsych timeline for the reversal task block

import {
    createPreloadTrial,
    createPressBothTrial,
    kickOut,
    fullscreen_prompt,
    canBeWarned,
    updateState,
    updateBonusState,
    saveDataREDCap } from "@utils/index.js"

// First preload for task
const reversal_preload = createPreloadTrial(
    [
        "/reversal/squirrels_empty.png",
        "/reversal/squirrels_bg.png",
        "/reversal/squirrels_fg.png",
        "/reversal/1penny.png",
        "/reversal/1pound.png",
        "2_finger_keys.jpg"
    ].map(img => `./assets/images/${img}`),
    "reversal"
);

/**
 * Generates the main reversal learning task blocks
 * 
 * @param {Object} settings - Task configuration settings
 * @param {number} settings.n_trials - Maximum number of trials
 * @param {number} settings.default_response_deadline - Standard response time limit
 * @param {number} settings.long_response_deadline - Extended response time for warned participants
 * @returns {Array} Array of jsPsych timeline blocks for the reversal task
 */
function generateReversalBlocks(settings) {

    // Parse the pre-defined trial sequence from JSON
    let reversal_timeline = JSON.parse(reversal_json);

    // Handle task resumption - remove already completed blocks/trials
    if (window.last_state && window.last_state.includes("reversal_block_")) {
        const last_block = parseInt(window.last_state.split("_")[2]) - 1;
        const last_trial = parseInt(window.last_state.split("_")[4]);

        // Remove blocks before the last one
        reversal_timeline = reversal_timeline.slice(last_block);
        
        // Remove trials before the last one in the current block
        reversal_timeline[0] = reversal_timeline[0].slice(last_trial);
    }
    
    
    // Assemble list of blocks with trial structure
    var reversal_blocks = [];
    
    // Create a block for each set of trials in the timeline
    for (let i=0; i<reversal_timeline.length; i++){
        reversal_blocks.push([
            {
                timeline: [
                    {
                        timeline: [
                            kickOut(settings), // Check if participant should be excluded
                            fullscreen_prompt, // Ensure fullscreen mode
                            {
                                type: jsPsychReversal, // Custom reversal task plugin
                                feedback_right: jsPsych.timelineVariable('feedback_right'),
                                feedback_left: jsPsych.timelineVariable('feedback_left'),
                                optimal_right: jsPsych.timelineVariable('optimal_right'),
                                // Dynamic response deadline based on warning status
                                response_deadline: () => {
                                    if (canBeWarned(settings)){
                                        return settings.default_response_deadline
                                    } else {
                                        return settings.long_response_deadline
                                    }
                                },
                                show_warning: () => {
                                    return canBeWarned(settings)
                                },
                                data: {
                                    block: jsPsych.timelineVariable('block'),
                                    trial: jsPsych.timelineVariable('trial'),
                                    trialphase: "reversal"
                                },
                                on_finish: (data) => {
                                    // Extract trial and block numbers for state tracking
                                    const trial_number = jsPsych.data.get().last(1).select('trial').values[0];
                                    const block_number = jsPsych.data.get().last(1).select('block').values[0];

                                    // Update progress state for potential resumption
                                    updateState(`reversal_block_${block_number}_trial_${trial_number}`, false)

                                    // Update bonus calculation
                                    updateBonusState(settings);

                                    // Count total trials completed
                                    const n_trials = jsPsych.data.get().filter({trial_type: "reversal"}).count()
                                    
                                    // Save data to REDCap every 40 trials
                                    if (n_trials % 40 == 0) {
                                        saveDataREDCap(3);
                                    }

                                    // Track missed responses (null responses)
                                    if (data.response === null) {
                                        const up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
                                        jsPsych.data.addProperties({
                                            n_warnings: up_to_now + 1
                                        });
                                    }

                                    // Track response deadline warnings
                                    if (data.response_deadline_warning) {
                                        const up_to_now = parseInt(jsPsych.data.get().last(1).select('reversal_n_warnings').values);
                                        jsPsych.data.addProperties({
                                            reversal_n_warnings: up_to_now + 1
                                        });
                                    }

                                },
                            }
                        ],
                        // Conditional function determines when to continue the block
                        conditional_function: () => {

                            // Get the performance criterion for this block
                            const criterion = jsPsych.evaluateTimelineVariable('criterion');

                            // Count correct responses in current block
                            let num_correct = jsPsych.data.get()
                                .filter({block: jsPsych.evaluateTimelineVariable('block'), trial_type: 'reversal'})
                                .select('response_optimal').sum()

                            // Check total trial count across all blocks
                            let n_trials = jsPsych.data.get()
                            .filter({trial_type: 'reversal'})
                            .count()
                            
                            // Continue if under trial limit AND haven't reached criterion
                            return (n_trials < settings.n_trials) && (num_correct < criterion)
                    },
                }
                ],
                timeline_variables: reversal_timeline[i], // Trial parameters for this block
            }
        ]);
    }

    return reversal_blocks;
}


/**
 * Creates instruction screens for the reversal learning task
 * 
 * @param {Object} settings - Task configuration settings
 * @param {string} settings.session - Current session type (e.g., "screening")
 * @param {number} settings.n_trials - Number of trials (affects duration estimate)
 * @returns {Array} Array of jsPsych instruction trials
 */
function reversalInstructions(settings) {
    var _revReadyCleanup = null;
    var touchCapable = navigator.maxTouchPoints > 0;

    var sessionPrefix = settings.sessionInfo.variant !== 'screening' ? "<p>Let's start with the first game!</p>" : "";
    var duration = settings.n_trials == 50 ? "three" : "five";

    var pageRules = `<p>One squirrel has higher-value coins, and the other has lower-value coins.
                But every few turns they secretly switch bags.</p>
                <p>Your goal is to figure out which squirrel has the better coins and collect as many high-value ones as possible.</p>`;

    var squirrelHtml =
        `<div class="reversal-stimuli">
            <div class="rev-squirrel-empty">
                <img src="./assets/images/reversal/squirrels_empty.png" alt="Two squirrels in a forest"></img>
            </div>
            <div class="rev-squirrel-bg">
                <img src="./assets/images/reversal/squirrels_bg.png" alt=""></img>
            </div>
            <div class="rev-squirrel-fg">
                <img src="./assets/images/reversal/squirrels_fg.png" alt=""></img>
            </div>`;

    // --- Shared instruction trial (pages differ by input modality) ---
    var instructionTrial = {
        type: jsPsychInstructions,
        css_classes: ['instructions'],
        pages: touchCapable ? [
            `${sessionPrefix}
            <p>Next, you will meet two friendly squirrels, each with a bag of coins to share.
            Tap on either the left or right squirrel to choose one.
            The squirrel you pick will give you a coin to add to your safe.</p>`,
            pageRules
        ] : [
            `${sessionPrefix}
            <p>Next, you will meet two friendly squirrels, each with a bag of coins to share.
            Use the arrow keys to choose either the left or right squirrel.
            The squirrel you pick will give you a coin to add to your safe.</p>`,
            pageRules
        ],
        show_clickable_nav: true,
        data: {trialphase: "reversal_instruction"},
        on_start: () => { updateState(`reversal_instructions_start`) },
        on_finish: () => {
            if (settings.sessionInfo.variant !== 'screening') {
                updateState(`no_resume_10_minutes`)
            }
            updateState(`reversal_task_start`)
        }
    };

    // --- Touch ready screen: tap either squirrel ---
    var touchReadyTrial = {
        type: jsPsychHtmlKeyboardResponse,
        choices: 'NO_KEYS',
        stimulus: squirrelHtml +
            `<div id="rev-tap-left" class="rev-tap-zone rev-tap-left"></div>
            <div id="rev-tap-right" class="rev-tap-zone rev-tap-right"></div>
            </div>
            <p style="text-align:center;margin-top:1.2em;max-width:600px;margin-left:auto;margin-right:auto;">
                You will now play the squirrel game for about ${duration} minutes without breaks.
            </p>
            <p style="text-align:center;max-width:600px;margin-left:auto;margin-right:auto;">
                When you're ready, <strong>tap either squirrel</strong> to begin.
            </p>`,
        data: { trialphase: "reversal_instruction" },
        on_load: function () {
            var finished = false;
            var finishOnce = function () {
                if (finished) return;
                finished = true;
                jsPsych.finishTrial({ response: 'b' });
            };
            var tapHandler = function (event) {
                if (!event.isPrimary || event.button !== 0) return;
                event.preventDefault();
                finishOnce();
            };
            var suppressContext = function (e) { e.preventDefault(); };
            var tapLeft = document.getElementById('rev-tap-left');
            var tapRight = document.getElementById('rev-tap-right');
            if (tapLeft) {
                tapLeft.addEventListener('pointerdown', tapHandler);
                tapLeft.addEventListener('contextmenu', suppressContext);
            }
            if (tapRight) {
                tapRight.addEventListener('pointerdown', tapHandler);
                tapRight.addEventListener('contextmenu', suppressContext);
            }
            _revReadyCleanup = function () {
                if (tapLeft) {
                    tapLeft.removeEventListener('pointerdown', tapHandler);
                    tapLeft.removeEventListener('contextmenu', suppressContext);
                }
                if (tapRight) {
                    tapRight.removeEventListener('pointerdown', tapHandler);
                    tapRight.removeEventListener('contextmenu', suppressContext);
                }
            };
            if (window.simulating) {
                var target = tapLeft || tapRight;
                if (target) {
                    jsPsych.pluginAPI.setTimeout(function () {
                        target.dispatchEvent(new PointerEvent('pointerdown', {
                            bubbles: true, isPrimary: true, pointerType: 'touch', button: 0
                        }));
                    }, 100);
                }
            }
        },
        on_finish: function () {
            if (_revReadyCleanup) {
                _revReadyCleanup();
                _revReadyCleanup = null;
            }
            jsPsych.pluginAPI.cancelAllKeyboardResponses();
            jsPsych.data.addProperties({ reversal_n_warnings: 0 });
        }
    };

    // --- Keyboard ready screen: press both arrow keys simultaneously (original behaviour) ---
    var keyboardReadyTrial = createPressBothTrial(
        `<p>You will now play the squirrel game for about ${duration} minutes without breaks.</p>
        <p>When you're ready, place your fingers comfortably on the <strong>left and right arrow keys</strong> as shown below.
        Press down <strong>both left and right arrow keys at the same time</strong> to begin.</p>
        <img src='./assets/images/2_finger_keys.jpg' style='width:250px;'>`,
        "reversal_instruction"
    );

    return [instructionTrial, touchCapable ? touchReadyTrial : keyboardReadyTrial];
}

/**
 * Calculates relative bonus earnings for the reversal task
 * 
 * Computes participant's earnings relative to theoretical minimum and maximum
 * possible performance to determine bonus payment.
 * 
 * @returns {Object} Object containing earned amount, minimum possible, and maximum possible
 * @returns {number} returns.earned - Actual earnings (sum of coin values)
 * @returns {number} returns.min - Minimum possible earnings (all pennies)
 * @returns {number} returns.max - Maximum possible earnings (all pounds)
 */
const computeRelativeReversalBonus = () => {

    // Get all reversal task data
    const reversal_data = jsPsych.data.get().filter({trial_type: "reversal"});

    const n_trials = reversal_data.values().length;

    // Compute theoretical performance bounds
    const max_sum = n_trials; // Best case: one pound (£1) on every trial
    const min_sum = n_trials * 0.01; // Worst case: one penny (£0.01) on every trial

    // Compute the actual sum of coins earned
    const earned_sum = reversal_data.select("chosen_feedback").sum();

    return {
        earned: earned_sum, 
        min: min_sum, 
        max: max_sum
    }
}

/**
 * Creates the complete timeline for the reversal learning task
 * 
 * Assembles preloading, instructions, and task blocks into a single timeline
 * that can be added to the main experiment sequence.
 * 
 * @param {Object} settings - Task configuration settings
 * @returns {Array} Complete jsPsych timeline for the reversal task
 */
function createReversalTimeline(settings) {
    
    let procedure = [];
    
    // Preload task assets
    procedure.push(reversal_preload);
    
    // Add instruction screens and task blocks
    procedure = procedure.concat(reversalInstructions(settings));
    procedure = procedure.concat(generateReversalBlocks(settings));
    
    return procedure;
}

export { createReversalTimeline, computeRelativeReversalBonus }