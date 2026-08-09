import { controlConfig } from "./configuration.js";
import { createPressBothTrial, updateState } from "@utils/index.js"

/**
 * Creates ocean current visual elements based on strength level and rule matching
 * @param {number} level - Current strength level (1=weak, 2=medium, 3=strong)
 * @param {string} choice - Ship choice direction ('left' or 'right')
 * @param {boolean} matchBaseRule - Whether currents match base rule (true) or drift rule (false)
 * @returns {string} HTML string for ocean current visualization
 */
const createOceanCurrents = (level = 3, choice = "right", matchBaseRule = true) => {
    // Invert the choice for feedback display
    const feedbackChoice = choice === 'left' ? 'right' : 'left';

    /**
     * Helper function to create current lines based on level and direction
     * @param {boolean} matchBaseRule - Whether to show normal currents or drift currents
     * @param {boolean} isTrace - Whether to show trace lines (fainter background lines)
     * @param {boolean} isLeft - Whether currents are on left side
     * @returns {string} HTML for current lines
     */
    const createCurrentLines = (matchBaseRule = true, isTrace = false, isLeft = true) => {
        let lines = '';
        if (matchBaseRule) {
            // Normal current positions for ships reaching home bases
            const positions = {
                1: [{ top: 49, offset: 20 }], // Single weak current
                2: [
                    { top: 43, offset: 50 },
                    { top: 55, offset: 30 }
                ], // Two medium currents
                3: [
                    { top: 43, offset: 50 },
                    { top: 49, offset: 20 },
                    { top: 55, offset: 30 }
                ] // Three strong currents
            };

            const currentPositions = positions[level] || positions[3];

            currentPositions.forEach(({ top, offset }) => {
                const position = isLeft ? 'right' : 'left';
                const styles = `top: ${top}%; ${position}: calc(5% + ${offset}px);`;

                if (isTrace) {
                    lines += `<div class="current-trace" style="${styles};"></div>`;
                } else {
                    lines += `<div class="current-line" style="${styles};"></div>`;
                }
            });
        } else {
            // Drift current positions for ships without enough fuel
            const positions = {
                1: [{ top: 80, offset: 20 }],
                2: [
                    { top: 70, offset: 50 },
                    { top: 90, offset: 30 }
                ],
                3: [
                    { top: 70, offset: 50 },
                    { top: 80, offset: 20 },
                    { top: 90, offset: 30 }
                ]
            };

            const currentPositions = positions[level] || positions[3];

            currentPositions.forEach(({ top, offset }) => {
                const position = isLeft ? 'right' : 'left';
                const styles = `top: ${top}%; ${position}: calc(15% + ${offset}px);`;

                if (isTrace) {
                    lines += `<div class="current-trace" style="${styles}; width: 70%"></div>`;
                } else {
                    lines += `<div class="current-line" style="${styles}; width: 75%"></div>`;
                }
            });
        }

        return lines;
    };

    // Return appropriate current visualization based on rule type
    if (matchBaseRule) {
        return `
        <div class="ocean-current">
            <div class="current-group left-currents">
                ${createCurrentLines(true, true, true)}
                ${createCurrentLines(true, false, true)}
            </div>
            <div class="current-group right-currents">
                ${createCurrentLines(true, true, false)}
                ${createCurrentLines(true, false, false)}
            </div>
            </div>
        `;
    } else {
        return `
        <div class="ocean-current">
            <div class="current-group ${feedbackChoice}-horizon-currents">
            ${createCurrentLines(false, true, feedbackChoice === 'left')}
            ${createCurrentLines(false, false, feedbackChoice === 'left')}
            </div>
        `;
    }
};

/**
 * Creates instruction dialog wrapper with consistent styling
 * @param {string} content - HTML content for the dialog
 * @returns {string} Complete instruction dialog HTML
 */
const createInstructionDialog = (content) => {
    return `
    <div class="instruction-dialog">
        <div class="instruction-content">
            ${content}
        </div>
    </div>
`;
};

/**
 * Creates progress bar for instruction pages
 * @param {number} current - Current page number
 * @param {number} total - Total number of pages
 * @returns {string} Progress bar HTML
 */
const createProgressBar = (current, total) => {
    return `
    <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${(current / total) * 100}%"></div>
    </div>
`;
};

// Global variables for fuel trial keyboard listeners
let firstKeyListener = null;
let repeatedKeyListener = null;

/**
 * Sets up interactive fuel trial with keyboard input handling
 * @param {Object} config - Configuration object for the fuel trial
 * @param {string} config.initialMessage - Message shown after first keypress
 * @param {Function} config.progressCalculation - Function to calculate fuel progress
 * @param {Function} config.finishCondition - Function to determine when trial is complete
 * @param {string} config.finishMessage - Message shown when trial completes
 * @param {number} [config.finishDelay=350] - Delay before enabling next button
 */
function setupFuelTrial(config) {
    let selectedKey = null;
    let trialPresses = 0;
    const leftArrow = document.querySelector('.arrow-left');
    const rightArrow = document.querySelector('.arrow-right');
    const leftContainer = document.querySelector('.fuel-container-left');
    const rightContainer = document.querySelector('.fuel-container-right');

    // Disable next button until trial is complete (unless simulating)
    if (!window.simulating) {
        document.getElementById("jspsych-instructions-next").disabled = true;
    }
    document.getElementById(jsPsych.getDisplayContainerElement().id).focus();

    // Set up listener for initial ship selection
    firstKeyListener = jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: handleFirstKey,
        valid_responses: ['ArrowRight'],
        rt_method: 'performance',
        persist: false,
        allow_held_key: false,
        minimum_valid_rt: 100
    });
    
    /**
     * Creates animated fuel icon that appears during fueling
     * @param {HTMLElement} container - Container to add fuel icon to
     */
    function createFuelIcon(container) {
        const fuelIcon = document.createElement('img');
        fuelIcon.src = './assets/images/control/fuel.png';
        fuelIcon.className = 'fuel-icon fuel-animation';
        container.appendChild(fuelIcon);
        fuelIcon.addEventListener('animationend', () => {
            container.removeChild(fuelIcon);
        });
    }
    
    /**
     * Handles the first key press to select a ship
     * @param {Object} info - jsPsych key response info object
     */
    function handleFirstKey(info) {
        jsPsych.pluginAPI.cancelKeyboardResponse(firstKeyListener);

        // Remove any existing selection indicators
        const selectionIndicator = document.querySelector('.selection-indicator');
        if (document.querySelector('.selection-indicator')) { selectionIndicator.remove(); }
        const islandIndicator = document.querySelector('.island-indicator');
        if (islandIndicator) { islandIndicator.remove(); }

        // Update UI based on ship selection
        if (info.key === 'ArrowLeft') {
            selectedKey = 'left';
            leftArrow.classList.add('highlight');
            document.querySelector('.choice-right').style.visibility = 'hidden';
            document.querySelector('.fuel-container-left .fuel-indicator-container').style.opacity = '1';
        } else if (info.key === 'ArrowRight') {
            selectedKey = 'right';
            rightArrow.classList.add('highlight');
            document.querySelector('.choice-left').style.visibility = 'hidden';
            document.querySelector('.fuel-container-right .fuel-indicator-container').style.opacity = '1';
        }
        
        // Update instruction text and set up repeated key listener
        document.querySelector('.instruction-content').innerHTML = config.initialMessage;
        repeatedKeyListener = setupRepeatedKeyListener();
    }
    
    /**
     * Sets up listener for repeated key presses to add fuel
     * @returns {Object} jsPsych keyboard response object
     */
    function setupRepeatedKeyListener() {
        return jsPsych.pluginAPI.getKeyboardResponse({
            callback_function: handleRepeatedKeypress,
            valid_responses: selectedKey === 'left' ? ['ArrowLeft'] : ['ArrowRight'],
            rt_method: 'performance',
            persist: true,
            allow_held_key: false,
            minimum_valid_rt: 0
        });
    }
    
    /**
     * Handles repeated key presses for fueling
     * @param {Object} info - jsPsych key response info object
     */
    function handleRepeatedKeypress(info) {
        trialPresses++;
        const container = selectedKey === 'left' ?
            document.querySelector('.fuel-container-left') :
            document.querySelector('.fuel-container-right');
        const fuelBar = container.querySelector('.fuel-indicator-bar');
        
        // Update fuel progress using provided calculation function
        const progress = Math.min(config.progressCalculation(trialPresses), 100);
        fuelBar.style.width = `${progress}%`;

        // Change color when full
        if (progress === 100) {
            fuelBar.style.backgroundColor = '#00ff00';
        }

        // Add fuel animation
        createFuelIcon(selectedKey === 'left' ? leftContainer : rightContainer);
        
        // Check if trial should finish using provided condition function
        if (config.finishCondition(trialPresses, progress)) {
            jsPsych.pluginAPI.cancelKeyboardResponse(repeatedKeyListener);

            // Apply ship fade-out animation
            if (selectedKey === 'left') {
                display_element.querySelector('.ship-left').classList.add('fade-out-left');
            } else if (selectedKey === 'right') {
                display_element.querySelector('.ship-right').classList.add('fade-out-right');
            }

            // Show completion message and enable next button
            document.querySelector('.instruction-content').innerHTML = config.finishMessage;
            jsPsych.pluginAPI.setTimeout(() => {
                document.getElementById("jspsych-instructions-next").disabled = false;
            }, config.finishDelay || 350);
        }
    }
}

/**
 * Creates the complete control task instructions timeline
 * @param {Object} settings - Task settings including session type and configuration
 * @returns {Array} jsPsych timeline for control task instructions
 */
export function createControlInstructionsTimeline(settings) {
    // Configuration for instruction pages
    const nPages = 12;
    const leftShip = "green";
    const rightShip = "blue";
    const downstreamIsland = "i3"; // Compatible with screening session (only 3 islands)
    const homebaseIsland = controlConfig(settings).controlRule[rightShip];

    // Main instruction pages with interactive content
    const controlInstructionPages = [
        // Page 0: Initial Welcome
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                <section class="scene">
                <img class="island-far" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${downstreamIsland}.png" alt="Farther island" />
                <div class="overlap-group">
                    <div class="choice-left">
                        <div class="fuel-container-left" style="visibility: hidden;">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-left" src="./assets/images/control/simple_ship_${leftShip}.png" alt="Left ship" />
                        <img class="arrow-left" style="visibility: hidden;" src="./assets/images/control/left.png" alt="Left arrow" />
                    </div>
                    <img class="island-near" src="./assets/images/control/simple_island.png" alt="Nearer island" />
                    <div class="choice-right">
                        <div class="fuel-container-right">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-right" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Right ship" />
                        <img class="arrow-right" style="visibility: hidden;" src="./assets/images/control/left.png" alt="right arrow" />
                    </div>
                </div>
                ${createOceanCurrents(2)}
                </section>
                ${createInstructionDialog(`
                    <h2>Welcome to shipping game!</h2>
                    <p>In this game, there are <strong>ships</strong> and <strong>fruit islands</strong>.</p>
                    `)}
                ${createProgressBar(1, nPages)}
            </div>
            `
        },

        // Page 1: Main properties
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                <section class="scene">
                <img class="island-far" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${downstreamIsland}.png" alt="Farther island" />
                <div class="overlap-group">
                    <div class="choice-left">
                        <div class="fuel-container-left" style="visibility: hidden;">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-left" src="./assets/images/control/simple_ship_${leftShip}.png" alt="Left ship" />
                        <img class="arrow-left" style="visibility: hidden;" src="./assets/images/control/left.png" alt="Left arrow" />
                    </div>
                    <img class="island-near" src="./assets/images/control/simple_island.png" alt="Nearer island" />
                    <div class="choice-right">
                        <div class="fuel-container-right">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-right" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Right ship" />
                        <img class="arrow-right" style="visibility: hidden;" src="./assets/images/control/left.png" alt="right arrow" />
                    </div>
                </div>
                ${createOceanCurrents(2)}
                </section>
                ${createInstructionDialog(`
                    <p>Each ship has one <strong>home</strong> fruit island.</p>
                    <p>Each ship will go to its home fruit island if it has <strong>enough fuel</strong> to overcome the <strong>ocean currents</strong>.</p>
                `)}
                ${createProgressBar(2, nPages)}
            </div>
            `
        },

        // Page 2: Without fuel...
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                <section class="scene">
                <img class="island-far" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${downstreamIsland}.png" alt="Farther island" />
                <div class="overlap-group">
                    <div class="choice-left">
                        <div class="fuel-container-left" style="visibility: hidden;">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-left" src="./assets/images/control/simple_ship_${leftShip}.png" alt="Left ship" />
                        <img class="arrow-left" style="visibility: hidden;" src="./assets/images/control/left.png" alt="Left arrow" />
                    </div>
                    <img class="island-near" src="./assets/images/control/simple_island.png" alt="Nearer island" />
                    <div class="choice-right">
                        <div class="fuel-container-right">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-right" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Right ship" />
                        <img class="arrow-right" style="visibility: hidden;" src="./assets/images/control/left.png" alt="right arrow" />
                    </div>
                </div>
                ${createOceanCurrents(2)}
                </section>
                ${createInstructionDialog(`
                    <p>During <strong>learning</strong> periods, your aim is to <strong>learn</strong> the home fruit island for each ship.</p>
                    <p>You <strong>learn</strong> by simply trying out different ships: just pick either of the ships on offer and see where it goes.</p>
                `)}
                ${createProgressBar(3, nPages)}
            </div>
            `
        },

        // Page 3: Let's try that out...
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                <section class="scene">
                <img class="island-far" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${downstreamIsland}.png" alt="Farther island" />
                <div class="overlap-group">
                    <div class="choice-left">
                        <div class="fuel-container-left">
                        <div class="fuel-indicator-container">
                            <div class="fuel-indicator-bar"></div>
                        </div>
                        </div>
                        <img class="ship-left" src="./assets/images/control/simple_ship_${leftShip}.png" alt="Left ship" />
                        <img class="arrow-left" src="./assets/images/control/left.png" alt="left arrow" />
                    </div>
                    <img class="island-near" src="./assets/images/control/simple_island.png" alt="Nearer island" />
                    <div class="choice-right">
                        <div class="selection-indicator">
                            <div class="selection-label">Press ➡️ to select</div>
                            <span class="selection-dot"></span>
                        </div>
                        <div class="fuel-container-right">
                        <div class="fuel-indicator-container">
                            <div class="fuel-indicator-bar"></div>
                        </div>
                        </div>
                        <img class="ship-right" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Right ship" />
                        <img class="arrow-right" src="./assets/images/control/left.png" alt="right arrow" />
                    </div>
                </div>
                ${createOceanCurrents(2)}
                </section>
                ${createInstructionDialog(`
                    <p>Ok, let's give this a try! Press the <strong>right arrow key</strong> to choose the right ship.</p>
                `)}
                ${createProgressBar(4, nPages)}
            </div>
            `
        },

        // Page 4: Ending up on the next island
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                <section class="scene">
                    <div class="overlap-group" style="justify-content: space-between;">
                        <div class="choice-left">
                            <img class="ship-left" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Ship" style="opacity: 0;" />
                        </div>
                        <img class="island-near" style="visibility: hidden;" src="./assets/images/control/simple_island.png" alt="Hidden island" />
                        <div class="choice-right">
                            <img class="island-near" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${homebaseIsland}.png" alt="Destination island" style="top: -10%;" />
                        </div>
                    </div>
                </section>
                ${createInstructionDialog(`
                    <p>Great, so with enough fuel, this ${rightShip} ship can overcome the ocean currents to reach its home fruit island - ${controlConfig(settings)[`${homebaseIsland}_name`][settings.session]} island.</p>
                    `)}
                ${createProgressBar(5, nPages)}
            </div>
            `
        },

            // Page 5: Let's try again
            {
                content: `
                <div class="instruction-stage">
                    <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                    <section class="scene">
                    <img class="island-far" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${downstreamIsland}.png" alt="Farther island" />
                    <div class="overlap-group">
                        <div class="choice-left">
                            <div class="fuel-container-left" style="visibility: hidden;">
                                <div class="fuel-indicator-container">
                                    <div class="fuel-indicator-bar"></div>
                                </div>
                            </div>
                            <img class="ship-left" src="./assets/images/control/simple_ship_${leftShip}.png" alt="Left ship" />
                            <img class="arrow-left" src="./assets/images/control/left.png" alt="Left arrow" />
                        </div>
                        <img class="island-near" src="./assets/images/control/simple_island.png" alt="Nearer island" />
                        <div class="choice-right">
                            <div class="selection-indicator">
                                <div class="selection-label">Press ➡️ to select</div>
                                <span class="selection-dot"></span>
                            </div>
                            <div class="fuel-container-right">
                                <div class="fuel-indicator-container">
                                    <div class="fuel-indicator-bar"></div>
                                </div>
                            </div>
                            <img class="ship-right" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Right ship" />
                            <img class="arrow-right" src="./assets/images/control/left.png" alt="right arrow" />
                        </div>
                    </div>
                    ${createOceanCurrents(2)}
                    </section>
                    ${createInstructionDialog(`
                        <p>Let's try again, this time press only a few times to add only a little fuel.</p>
                    `)}
                    ${createProgressBar(6, nPages)}
                </div>
                `
            },

        // Page 6: Ending up on the homebase
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                <section class="scene">
                    <img class="island-far" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${downstreamIsland}.png" alt="Farther island" />
                    <img class="feedback-ship" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Ship" style="opacity: 0;" />
                ${createOceanCurrents(2)}
                </section>
                ${createInstructionDialog(`
                    <p>The ship ran out of fuel midway.</p>
                    <p>Now the ship drifted to the island at the top of the screen and did <strong>not</strong> reach its home fruit island.</p>
                `)}
                ${createProgressBar(7, nPages)}
            </div>
            `
        },

        // Page 7: Current level explanation: High
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                ${createOceanCurrents(3)}
                <div class="current-indicator">
                    <div class="label"><strong>Strong current</strong>:<br> A lot of fuel needed</div>
                </div>
                ${createInstructionDialog(`
                    <p>Ships need more fuel to reach their home fruit island when ocean currents are stronger.</p>
                    <p>Three lines mean strong currents - you'll need a lot of fuel.</p>
                `)}
                ${createProgressBar(8, nPages)}
            </div>
            `
        },

        // Page 8: Current level explanation: Mid
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                ${createOceanCurrents(2)}
                <div class="current-indicator">
                    <div class="label"><strong>Medium current</strong>:<br> Moderate fuel needed</div>
                </div>
                ${createInstructionDialog(`
                    <p>Two lines mean medium current strength - you'll need a moderate amount of fuel.</p>
                `)}
                ${createProgressBar(9, nPages)}
            </div>
            `
        },

        // Page 9: Current level explanation: low
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                ${createOceanCurrents(1)}
                <div class="current-indicator">
                    <div class="label"><strong>Weak current</strong>:<br> Only a little fuel needed</div>
                </div>
                ${createInstructionDialog(`
                    <p>One line means the currents are weak. You don't have to put a lot of effort into fuelling up the ship.</p>
                    <p>So you can be strategic and put in effort only when you think it's worth it.</p>
                `)}
                ${createProgressBar(10, nPages)}
            </div>
            `
        },

        // Page 13: Recap for training
        {
            content: `
            <div class="instruction-stage">
                <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                <section class="scene">
                <img class="island-far" src="./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}/simple_island_${downstreamIsland}.png" alt="Farther island" />
                <div class="overlap-group">
                    <div class="choice-left">
                        <div class="fuel-container-left" style="visibility: hidden;">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-left" src="./assets/images/control/simple_ship_${leftShip}.png" alt="Left ship" />
                        <img class="arrow-left" src="./assets/images/control/left.png" alt="Left arrow" />
                    </div>
                    <img class="island-near" src="./assets/images/control/simple_island.png" alt="Nearer island" />
                    <div class="choice-right">
                        <div class="fuel-container-right">
                            <div class="fuel-indicator-container">
                                <div class="fuel-indicator-bar"></div>
                            </div>
                        </div>
                        <img class="ship-right" src="./assets/images/control/simple_ship_${rightShip}.png" alt="Right ship" />
                        <img class="arrow-right" src="./assets/images/control/left.png" alt="right arrow" />
                    </div>
                </div>
                ${createOceanCurrents(2)}
                </section>
                ${createInstructionDialog(`
                    <p>To recap, during <strong>learning</strong>, you will learn each ship's home fruit island and fuel requirements for different current strengths</strong>.</p>
                `)}
                ${createProgressBar(11, nPages)}
            </div>
            `
        }
    ];

    // Create main instruction trial with page change handlers
    var controlInstructionTrial = [];
    controlInstructionTrial = {
        type: jsPsychInstructions,
        css_classes: ['instructions'],
        pages: controlInstructionPages.map(page => page.content),
        allow_keys: false,
        simulation_options: {
            data: {
                rt: 1000
            }
        },
        show_clickable_nav: true,
        show_page_number: false,
        data: {trialphase: "control_instructions"},
        on_start: function(trial) {
            if (window.simulating) {
                trial.allow_keys = true;
                trial.key_forward = ' ';
            }
        },
        on_finish: function(data) {
            jsPsych.data.addProperties({
                control_instruction_fail: 0
            });
        },
        on_page_change: function(current_page) {
            // Clean up any existing keyboard listeners before proceeding
            if (typeof repeatedKeyListener !== 'undefined' && repeatedKeyListener) {
                jsPsych.pluginAPI.cancelKeyboardResponse(repeatedKeyListener);
                repeatedKeyListener = null;
            }

            if (typeof firstKeyListener !== 'undefined' && firstKeyListener) {
                jsPsych.pluginAPI.cancelKeyboardResponse(firstKeyListener);
                firstKeyListener = null;
            }

            // Page 3: Interactive fuel trial - high fuel demonstration
            if (current_page === 3) {
                setupFuelTrial({
                    initialMessage: `<p>Now press the same <strong>right arrow key</strong> multiple times to give it a lot of fuel.</p>`,
                    // Progress calculation: 30 presses = 100% fuel
                    progressCalculation: (trialPresses) => (trialPresses / 30) * 100,
                    // Complete when fuel bar reaches 75%
                    finishCondition: (trialPresses, progress) => progress >= 75,
                    finishMessage: `<p>Now the fuel is sufficient for this ship, and it's leaving now!</p>`
                });
            }

            // Page 4: Ship animation to home base
            if (current_page === 4) {
                const choice = 'right';
                const feedbackChoice = choice === 'left' ? 'right' : 'left';
                const islandSide = feedbackChoice === 'left' ? 'right' : 'left';

                // Set up ship movement animation
                const shipImg = display_element.querySelector(`.ship-${feedbackChoice}`);
                const islandImg = display_element.querySelector(`.choice-${islandSide} .island-near`);
                
                // Calculate movement distance and direction
                const distance = islandImg.offsetWidth + shipImg.offsetWidth / 4;
                const shouldFlip = feedbackChoice === 'left';
                const scaleX = shouldFlip ? '-1' : '1';

                const animationStyle = document.createElement('style');
                animationStyle.setAttribute('data-feedback-animation', 'true');

                // Create CSS animation for ship movement
                animationStyle.textContent = `
                    @keyframes moveShip {
                        0% { 
                            opacity: 0;
                            transform: scaleX(${scaleX}) translateX(0);
                        }
                        100% { 
                            opacity: 1;
                            transform: scaleX(${scaleX}) translateX(-${distance}px);
                        }
                    }
                        
                    .ship-animate {
                    animation: moveShip 600ms ease-out forwards;
                    }
                `;
                document.head.appendChild(animationStyle);

                // Apply animation after DOM is ready
                setTimeout(() => {
                    shipImg.classList.add('ship-animate');
                }, 50);
            }

            // Page 5: Interactive fuel trial - low fuel demonstration
            if (current_page === 5) {
                setupFuelTrial({
                    initialMessage: `<p>Try again, this time press only a few times to add only a little fuel.</p>`,
                    progressCalculation: (trialPresses) => (trialPresses / 30) * 100,
                    // Complete after only 5 presses to show insufficient fuel
                    finishCondition: (trialPresses, progress) => trialPresses >= 5,
                    finishMessage: `<p>Fueling time is limited. The ship has gone now!</p>`
                });
            }

            // Page 6: Ship drift animation (insufficient fuel)
            if (current_page === 6) {
                const choice = 'right';

                // Set up drift animation to top island
                const shipImg = display_element.querySelector(`.feedback-ship`);
                const islandImg = display_element.querySelector(`.island-far`);
                
                const distance = islandImg.offsetWidth/2 + shipImg.offsetWidth;
                const shouldFlip = choice === 'left';
                const scaleX = shouldFlip ? '-1' : '1';

                // Remove any existing animation styles
                const existingAnimationStyle = document.querySelector('style[data-feedback-animation="true"]');
                if (existingAnimationStyle) {
                    existingAnimationStyle.remove();
                }
                
                const animationStyle = document.createElement('style');
                animationStyle.setAttribute('data-feedback-animation', 'true');

                // Create drift animation (ship moves to top island)
                animationStyle.textContent = `
                    @keyframes moveShip {
                        0% { 
                            opacity: 0;
                            transform: scaleX(${scaleX}) translateX(${distance}px) translateY(${shipImg.offsetHeight/2}px);
                        }
                        100% { 
                            opacity: 1;
                            transform: scaleX(${scaleX * 0.9}) scaleY(0.9) translateX(${shipImg.offsetWidth/3 + islandImg.offsetWidth/2}px);
                        }
                        }
                        
                        .ship-animate {
                        animation: moveShip 600ms ease-out forwards;
                        }
                `;
                document.head.appendChild(animationStyle);

                // Apply drift animation
                setTimeout(() => {
                    shipImg.classList.add('ship-animate');
                }, 100);
            }
        }
    };

    const controlInstructionLastPage = {
        type: jsPsychInstructions,
        css_classes: ['instructions'],
        pages: [
                `
                <div class="instruction-stage">
                    <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
                    <div class="instruction-dialog" style="bottom:40%; min-width: 600px;">
                        <div class="instruction-content" style="font-size: 1.2em; text-align: center;">
                            <p>😊 Well done! You've completed the instructions and are ready to start.</p>
                            <p>First <strong>learning</strong> period will begin soon.</p>
                            <p>Before you start playing, you'll answer a few questions about the instructions you just read.</p>
                            <p>You must answer all questions correctly to begin the game.</p>
                            <p>Press <span class="spacebar-icon">Next</span> to continue or <span class="spacebar-icon">Restart</span> to review these instructions again.</p>
                        </div>
                    </div>
                </div>
                `
        ],
        allow_keys: false,
        show_clickable_nav: true,
        show_page_number: false,
        data: {trialphase: "control_instructions"},
        on_load: function() {
            const navigationElement = document.querySelector('.jspsych-instructions-nav');
            const firstButton = navigationElement.querySelector('button:first-child');
            const newButton = document.createElement('button');
            newButton.id = 'jspsych-instructions-restart';
            newButton.textContent = 'Restart';
            newButton.className = 'jspsych-btn';
            newButton.style.backgroundColor = '#ff7875';
            newButton.addEventListener('click', () => {
                jsPsych.finishTrial({restart: true});
            });
            navigationElement.insertBefore(newButton, firstButton.nextSibling);
        }
    };

    // Prediction trial
    let controlInstructionPredTrials = [];
    controlInstructionPredTrials.push({
        type: jsPsychPredictHomeBase,
        ship: "blue",
        predict_decision: null,
        choices: settings.sessionInfo.variant === 'screening' ? ["i1", "i2", "i3"] : ["i2", "i3", "i4", "i1"],
        post_trial_gap: 0,
        on_load: function () {
            // Remove the icon-row element if it exists
            const iconRow = document.querySelector('.icon-row');
            if (iconRow) {
                iconRow.remove();
            }
            const instructionStage = document.querySelector('.instruction-stage');
            // Add a brief instruction dialog at the top of the prediction screen
            const instructionDialog = document.createElement('div');
            instructionDialog.className = 'instruction-dialog';
            instructionStage.appendChild(instructionDialog);
            // Position the instruction dialog in the center of the screen
            instructionDialog.style.position = "relative";
            instructionDialog.style.top = "calc(24% - 5vh)";
            instructionDialog.style.left = "50%";
            instructionDialog.style.transform = "translateX(-50%)";
            instructionDialog.style.zIndex = "10";
            instructionDialog.innerHTML = `
                <div class="instruction-content" style="font-size: 1.2em; ">
                    <p>Every now and then, we will ask you to tell us what you have learned.</p>
                    <p>Make sure to pay attention to the home fruit island of each ship during <strong>learning</strong>.</p>
                    <p>Now, finish this example test to continue.</p>
                </div>
            `;
        },
        on_finish: function(data) {
            data.trialphase = "control_instruction_prediction";
        }
    });


    // Comprehension check
    let controlIntroComprehension = [];
    controlIntroComprehension.push({
        type: jsPsychSurveyMultiChoice,
        preamble: () => {
            var preamble = `<div class=instructions><p>For each statement, please indicate whether it is true or false:</p></div>`
            // Show warning if participant is close to max failures
            if (jsPsych.data.get().last(1).select('control_instruction_fail').values[0] == settings.max_instruction_fails - 1) {
                preamble += `<p style="color:#f44336; font-weight:bold">You have almost reached the maximum number of failures allowed. Please pay close attention to the instructions.</p>`;
            }
            return preamble;
        },
        data: {trialphase: "control_instruction_quiz"},
        questions: [
            {
                prompt: "During <strong>learning</strong> periods, I need to learn about the home fruit island for each ship and how much to fuel for different current strengths.",
                name: "learning",
                options: ["True", "False"],
                required: true
            },
            {
                prompt: "When a ship doesn't have enough fuel, it will drift to the island at the top of the screen following ocean currents.",
                name: "drift",
                options: ["True", "False"],
                required: true
            },
            {
                prompt: "The amount of fuel needed to reach a ship's home fruit island depends on the ocean current strength.",
                name: "current_fuel",
                options: ["True", "False"],
                required: true
            },
            {
                prompt: `The ${rightShip} ship has ${controlConfig(settings)[`${homebaseIsland}_name`][settings.session]} island as its home fruit island.`,
                name: "homebase",
                options: ["True", "False"],
                required: true
            }
        ],
        simulation_options: {
            data: {
                response: {
                    Q0: `True`,
                    Q1: `True`,
                    Q2: `True`,
                    Q3: `True`
                }
            }
        },
        on_finish: function(data) {
            // Track failed comprehension attempts
            if (!Object.values(data.response).every(value => value === "True")) {
                var up_to_now = parseInt(jsPsych.data.get().last(1).select('control_instruction_fail').values[0]);
                jsPsych.data.addProperties({
                    control_instruction_fail: up_to_now + 1
                });
            }
        }
    });


    const controlQuizExplanation = [
        {
            prompt: "During <strong>learning</strong> periods, I need to learn about the home fruit island for each ship and how much to fuel for different current strengths.",
            explanation: "Learning the home fruit island for each ship and the fuel to overcome different current strengths is the main goal during learning periods."
        },
        {
            prompt: "When a ship doesn't have enough fuel, it will drift to the island at the top of the screen following ocean currents.",
            explanation: "Ships that are not fueled enough to overcome the currents will drift to the island at the top of the screen."
        },
        {
            prompt: "The amount of fuel needed to reach a ship's home fruit island depends on the ocean current strength.",
            explanation: "Stronger currents (indicated by more lines) require more fuel to reach the home fruit island."
        },
        {
            prompt: `The ${rightShip} ship has ${controlConfig(settings)[`${homebaseIsland}_name`][settings.session]} island as its home fruit island.`,
            explanation: `The ${rightShip} ship's home fruit island in this game is ${controlConfig(settings)[`${homebaseIsland}_name`][settings.session]}.`
        }
    ]



    controlIntroComprehension.push(
        {   
            type: jsPsychInstructions,
            css_classes: ['instructions'],
            allow_keys: false,
            show_page_number: false,
            show_clickable_nav: true,
            data: {
                trialphase: "control_instruction_quiz_review"
            },
            timeline: [
                // {
                //     pages: [
                //     `
                //     <p>You did not answer all the quiz questions correctly.</p>
                //     <p>Press <span class="spacebar-icon">Next</span> to review the questions answered wrong.</p>
                //     `
                //     ]
                // },
                {
                    pages: () => {
                        const data = jsPsych.data.get().filter({trialphase: "control_instruction_quiz"}).last(1).select('response').values[0];
                        return controlQuizExplanation.filter((item, index) => {
                            return Object.values(data)[index] !== "True";
                        }).map(item => `
                            <p>You gave the wrong answer for the following question:</p>
                            <h3 style="color: darkred; width: 700px; text-align: left;">Question: ${item.prompt}</h3>
                            <br>
                            <p style="max-width: 700px; text-align: left;"><strong>The correct answer:</strong> True</p>
                            <p style="max-width: 700px; text-align: left;"><strong>Explanation:</strong> ${item.explanation}</p>
                        `);
                    }
                }
            ],
            conditional_function: () => {
                const data = jsPsych.data.get().filter({trialphase: "control_instruction_quiz"}).last(1).select('response').values[0];
                return !Object.values(data).every(value => value === "True");
            }
        }
    )

    controlIntroComprehension.push(
        {   
            type: jsPsychInstructions,
            css_classes: ['instructions'],
            allow_keys: false,
            show_page_number: false,
            show_clickable_nav: true,
            data: {
                trialphase: "control_instruction_quiz_failure"
            },
            timeline: [
                {
                    pages: [
                    `
                    <p style="font-size: 1.4em;">Press <span style="font-weight: bold; color: #2f6cac;">Next</span> to <strong>re-take the quiz questions</strong></p>
                    <p style="font-size: 1.4em;">or <span style="font-weight: bold; color: #ff7875;">Restart</span> to <strong>review the full instructions again.</strong></p>
                    `
                    ]
                }
            ],
            on_load: function() {
                const navigationElement = document.querySelector('.jspsych-instructions-nav');
                const firstButton = navigationElement.querySelector('button:first-child');
                const newButton = document.createElement('button');
                newButton.id = 'jspsych-instructions-restart';
                newButton.textContent = 'Restart';
                newButton.className = 'jspsych-btn';
                newButton.style.backgroundColor = '#ff7875';
                newButton.addEventListener('click', () => {
                    jsPsych.finishTrial({restart: true});
                });
                navigationElement.insertBefore(newButton, firstButton.nextSibling);
            },
            conditional_function: () => {
                const data = jsPsych.data.get().filter({trialphase: "control_instruction_quiz"}).last(1).select('response').values[0];

                return !Object.values(data).every(value => value === "True");
            }
        }
    )

    // Add looping functionality to the instruction trial
    const controlInstructions = {
        timeline: [
            controlInstructionTrial, 
            controlInstructionPredTrials, 
            controlInstructionLastPage
        ],
        loop_function: () => {
            const restart = jsPsych.data.get().filter({trialphase: "control_instructions"}).last(1).select('restart').values[0];
            return restart;
        },
        on_timeline_start: () => {
            if (settings.sessionInfo.variant !== 'screening') {
                updateState(`no_resume_10_minutes`);
            }
            updateState("control_instructions_start");
        }
    };

    const controlComprehensionLoop = {
        timeline: [controlIntroComprehension],
        loop_function: () => {
            const data = jsPsych.data.get().filter({trialphase: "control_instruction_quiz"}).last(1).select('response').values[0];
            const restart = jsPsych.data.get().filter({trialphase: "control_instruction_quiz_failure"}).last(1).select('restart').values[0];

            return !Object.values(data).every(value => value === "True") && !restart;
        }
    }

    const controlInstructionsLoop = {
        timeline: [controlInstructions, controlComprehensionLoop],
        loop_function: () => {
            const data = jsPsych.data.get().filter({trialphase: "control_instruction_quiz"}).last(1).select('response').values[0];
            const restart = jsPsych.data.get().filter({trialphase: "control_instruction_quiz_failure"}).last(1).select('restart').values[0];
            return !Object.values(data).every(value => value === "True") && restart;
        }
    };

    const controlInstructionsTimeline = [
        controlInstructionsLoop,
        createPressBothTrial(
            `<p><strong>Great! You're now ready to begin the real game.</strong></p>
            <p>You'll play multiple rounds, which typically takes about <strong>${settings.sessionInfo.variant === 'screening' ? 4 : 14} minutes</strong> to complete.</p>
            <p>When you're ready, place your fingers comfortably on the <strong>left and right arrow keys</strong> as shown below. Press down <strong> both left and right arrow keys at the same time </strong> to begin.</p>
            <img src='./assets/images/2_finger_keys.jpg' style='width:250px;'></img>`,
            "control_instruction_end"
        )
    ];

    return controlInstructionsTimeline;
}
