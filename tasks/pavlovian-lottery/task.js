/**
 * Pavlovian Lottery Task
 * 
 * A simple lottery game where participants view Pavlovian stimuli (as conditioned stimuli)
 * paired with coins (as unconditioned stimuli/rewards).
 * 
 * Participants press a key to run the lottery, which displays a Pavlovian stimulus
 * followed by its associated coin reward with animation effects.
 */

import { createPreloadTrial, updateState } from '@utils/index.js';

/**
 * Creates the complete timeline for the Pavlovian Lottery experiment.
 * 
 * This function generates a jsPsych timeline that includes:
 * - Asset preloading
 * - Task instructions
 * - Lottery trials with slot machine animation
 * - Result displays showing stimulus-reward pairings
 * - Task completion message
 * 
 * @param {Object} settings - Configuration object containing task parameters
 * @param {string} settings.session - Session identifier for stimulus selection
 * @param {string} settings.task_name - Name of the task for preloading
 * @param {number} settings.initial_movement_delay - Delay before slot animation starts (ms)
 * @param {number} settings.reel_spin_duration - Duration of slot reel spinning (ms)
 * @param {number} settings.winning_highlight_delay - Delay before highlighting winning item (ms)
 * @param {number} settings.max_result_display_time - Maximum time to display results (ms)
 * @param {number} settings.continue_message_delay - Delay before showing continue prompt (ms)
 * 
 * @returns {Array} jsPsych timeline array containing all experiment trials
 */
export function createPavlovianLotteryTimeline(settings) {
  // Define the Pavlovian stimuli and their associated rewards
  
  /**
   * Returns speed multiplier for simulation mode.
   * When window.simulating is true, speeds up all timing by factor of 10.
   * @returns {number} Speed factor (1 for normal, 10 for simulation)
   */
  const getSpeedUpFactor = () => window.simulating ? 10 : 1;

  /**
   * Main configuration object containing all task parameters and mappings.
   * Defines the stimulus-reward associations and timing constants.
   */
  var PREPILT_CONFIG = {
    /**
     * Predefined sequence of trial values determining stimulus-reward pairings.
     * Each object contains a pav_value that maps to specific stimuli and rewards.
     */
    sequence: [{ "pav_value": -1.0 }, { "pav_value": 0.5 }, { "pav_value": -1.0 }, { "pav_value": -1.0 }, { "pav_value": 0.01 }, { "pav_value": 1.0 }, { "pav_value": 0.01 }, { "pav_value": -0.01 }, { "pav_value": 0.5 }, { "pav_value": -0.01 }, { "pav_value": 0.01 }, { "pav_value": -0.01 }, { "pav_value": 1.0 }, { "pav_value": 1.0 }, { "pav_value": -0.5 }, { "pav_value": 0.01 }, { "pav_value": -0.5 }, { "pav_value": 0.5 }, { "pav_value": -1.0 }, { "pav_value": -0.5 }, { "pav_value": 1.0 }, { "pav_value": 0.5 }, { "pav_value": -1.0 }, { "pav_value": -0.5 }, { "pav_value": -0.01 }, { "pav_value": 0.5 }, { "pav_value": 1.0 }, { "pav_value": 0.01 }, { "pav_value": -0.01 }, { "pav_value": -0.5 }],

    /**
     * Maps pav_values to corresponding Pavlovian stimulus image filenames.
     * These are the conditioned stimuli that will be associated with rewards.
     */
    stimulus: {
      0.01: "PIT3.png",     // Low positive value stimulus
      1.0: "PIT1.png",      // High positive value stimulus
      0.5: "PIT2.png",      // Medium positive value stimulus
      "-0.01": "PIT4.png",  // Low negative value stimulus
      "-1": "PIT6.png",     // High negative value stimulus
      "-0.5": "PIT5.png"    // Medium negative value stimulus
    },

    /**
     * Maps pav_values to corresponding reward/punishment coin image filenames.
     * These are the unconditioned stimuli (outcomes) paired with the Pavlovian stimuli.
     */
    reward: {
      0.01: "1penny.png",         // Intact 1 penny coin
      1.0: "1pound.png",          // Intact 1 pound coin
      0.5: "50pence.png",         // Intact 50 pence coin
      "-0.01": "1pennybroken.png", // Broken 1 penny coin (loss)
      "-1": "1poundbroken.png",    // Broken 1 pound coin (loss)
      "-0.5": "50pencebroken.png"  // Broken 50 pence coin (loss)
    },

    /**
     * Maps pav_values to text representations of monetary values.
     * Used for displaying the outcome value to participants.
     */
    value: {
      0.01: "+ 1p",    // Gain 1 penny
      1.0: "+ £1",     // Gain 1 pound
      0.5: "+ 50p",    // Gain 50 pence
      "-0.01": "- 1p", // Lose 1 penny
      "-1": "- £1",    // Lose 1 pound
      "-0.5": "- 50p"  // Lose 50 pence
    },

    /**
     * Timing constants for animations and displays.
     * All values are adjusted by getSpeedUpFactor() for simulation mode.
     */
    CONSTANTS: {
      SMALL_COIN_SIZE: 100, // Size of coin images in instructions (pixels)
      get INITIAL_MOVEMENT_DELAY() { return settings.initial_movement_delay / getSpeedUpFactor(); },
      get REEL_SPIN_DURATION() { return settings.reel_spin_duration / getSpeedUpFactor(); },
      get WINNING_HIGHLIGHT_DELAY() { return settings.winning_highlight_delay / getSpeedUpFactor(); },
      get MAX_RESULT_DISPLAY_TIME() { return settings.max_result_display_time / getSpeedUpFactor(); },
      get CONTINUE_MESSAGE_DELAY() { return settings.continue_message_delay / getSpeedUpFactor(); }
    }
  };

  // Add index to PREPILT_CONFIG.sequence for resumption
  // This allows the experiment to resume from the correct trial if interrupted
  PREPILT_CONFIG.sequence = PREPILT_CONFIG.sequence.map((item, index) => ({
    prepilt_trial: index + 1, // Trial number (1-indexed)
    ...item
  }));

  // Create preload trial
  // Preloads all visual assets to prevent loading delays during the experiment
  const prepilt_preload = createPreloadTrial(
    [
      // Pavlovian stimulus images for the current session
      [1, 2, 3, 4, 5, 6].map(i => `./assets/images/pavlovian-stims/${settings.sessionInfo.stimulusSet}/PIT${i}.png`),
      // Coin reward/punishment images
      [
        "50pence.png",
        "1pound.png",
        "1penny.png",
        "1pennybroken.png",
        "50pencebroken.png",
        "1poundbroken.png",
      ].map(i => `./assets/images/card-choosing/outcomes/${i}`)
    ].flat(),
    settings.task_name
  );

  /**
   * Instruction screens explaining the task to participants.
   * Includes overview, visual examples of coins, and starting instructions.
   */
  const instructions = [{
    type: jsPsychInstructions,
    css_classes: ['instructions'],
    pages: [
      // Welcome and task overview
      `
        <h2>Welcome to the Lucky Lottery Game!</h2>
        <p>Spin the lottery wheel to discover which patterns earn or lose coins.</p>
      `,
      // Visual guide showing all possible coin outcomes
      `
        <p>Each spin reveals a pattern that will either reward you with a £1, 50p, or 1p coin, or break a coin.</p>
        <div style='display: grid;'>
            <table style='width: 200px; grid-column: 2;'>
                <tr>
                    <td><img src='./assets/images/card-choosing/outcomes/1pound.png' style='width:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px; height:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px;'></td>
                    <td><img src='./assets/images/card-choosing/outcomes/50pence.png' style='width:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px; height:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px;'></td>
                    <td><img src='./assets/images/card-choosing/outcomes/1penny.png' style='width:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px; height:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px;'></td>
                </tr>
                <tr>
                    <td><img src='./assets/images/card-choosing/outcomes/1poundbroken.png' style='width:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px; height:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px;'></td>
                    <td><img src='./assets/images/card-choosing/outcomes/50pencebroken.png' style='width:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px; height:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px;'></td>
                    <td><img src='./assets/images/card-choosing/outcomes/1pennybroken.png' style='width:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px; height:${PREPILT_CONFIG.CONSTANTS.SMALL_COIN_SIZE}px;'></td>
                </tr>
            </table>
        </div>
        <p>Your bonus payment will depend on the coins you find in this task and the next ones. Each coin adds to your bonus, but broken coins reduce it.</p>
      `
    ],
    show_clickable_nav: true,
    data: { trialphase: 'prepilt_instruction' }
  },
  {
    // Final instruction screen with start prompt
    type: jsPsychHtmlKeyboardResponse,
    css_classes: ['instructions'],
    stimulus: `
    <p>The game consists of ${parseInt(PREPILT_CONFIG.sequence.length)} spins in total.</p>
    <p>When you're ready, place your fingers comfortably on the <span class="spacebar-icon">Spacebar</span>.</p>
    <p class="highlight-txt">Press down the <span class="spacebar-icon">Spacebar</span> to begin your first spin!</p>
    `,
    choices: [' '], // Only spacebar accepted
    data: { trialphase: 'prepilt_instruction' },
    on_start: () => {updateState("prepilt_conditioning_start")} // Update experiment state
  }
  ];

  /**
   * Lottery animation trial implementing slot machine-style spinning effect.
   * Creates a horizontal carousel of stimuli that spins and stops on the target stimulus.
   */
  const lotteryAnimation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      // Create a carousel/slot machine style display
      return `
        <div class="trial-content-wrapper">
          <h3>Spinning the Lucky Lottery!</h3>
          <div class="slot-machine-container">
            <div class="selection-frame"></div>
            <div id="slot-reel" class="slot-reel">
              <!-- Slot images will be added via JavaScript -->
            </div>
          </div>
          <div class="lower-message-area">
            <p style="font-size: 28px; font-weight: bold; margin: 10px 0; visibility: hidden;"></p>
            <p id="continue-msg" style="visibility: hidden;">Press <span class="spacebar-icon">Spacebar</span> to continue</p>
          </div>
        </div>
      `;
    },
    record_data: false, // This trial doesn't record response data
    choices: "NO_KEYS", // No keyboard responses accepted during animation
    trial_duration: function() {
      return PREPILT_CONFIG.CONSTANTS.REEL_SPIN_DURATION;
    },
    on_load: function () {
      // Get the target stimulus for this trial
      const currentStimulus = "./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/" + PREPILT_CONFIG.stimulus[jsPsych.evaluateTimelineVariable('pav_value')];
      const slotReel = document.getElementById('slot-reel');
      const slotContainer = document.querySelector('.slot-machine-container');
      const selectionFrame = document.querySelector('.selection-frame');

      // Create pavlovianStimuli array from PREPILT_CONFIG for carousel population
      const pavlovianStimuli = Object.values(PREPILT_CONFIG.stimulus).map((filename) => {
        return {
          stimulus: "./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/" + filename
        };
      });

      if (slotReel && slotContainer) {
        // Create a long sequence of images that repeats all stimuli several times
        let reelContent = '';

        /**
         * Shuffles an array using Fisher-Yates algorithm.
         * Ensures random ordering of stimuli in the carousel.
         * @param {Array} array - Array to shuffle
         * @returns {Array} New shuffled array
         */
        function shuffleArray(array) {
          const newArray = [...array];
          for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
          }
          return newArray;
        }

        // Create a sequence with no consecutive duplicates for better visual effect
        let lastImageSrc = null;
        const allItems = [];

        // Create 5 sets of shuffled stimuli (enough for the full reel)
        for (let i = 0; i < 5; i++) {
          // Get shuffled stimuli
          let shuffledStimuli = shuffleArray([...pavlovianStimuli]);

          // Check if first item matches last item from previous set
          if (lastImageSrc !== null && shuffledStimuli[0].stimulus === lastImageSrc) {
            // Swap with another position to avoid duplicates
            for (let j = 1; j < shuffledStimuli.length; j++) {
              if (shuffledStimuli[j].stimulus !== lastImageSrc) {
                // Swap positions to avoid duplicate
                [shuffledStimuli[0], shuffledStimuli[j]] = [shuffledStimuli[j], shuffledStimuli[0]];
                break;
              }
            }
          }

          // Add all stimuli from this set
          shuffledStimuli.forEach(stim => {
            allItems.push(stim.stimulus);
            lastImageSrc = stim.stimulus;
          });
        }

        // Final check for any remaining duplicates (defensive programming)
        for (let i = 0; i < allItems.length - 1; i++) {
          if (allItems[i] === allItems[i + 1]) {
            // Find a different stimulus to replace the duplicate
            const options = pavlovianStimuli
              .map(stim => stim.stimulus)
              .filter(src => src !== allItems[i] && (i + 2 >= allItems.length || src !== allItems[i + 2]));

            if (options.length > 0) {
              // Replace with a non-duplicate option
              allItems[i + 1] = options[Math.floor(Math.random() * options.length)];
            }
          }
        }

        // Generate HTML for all carousel items
        allItems.forEach(stimSrc => {
          reelContent += `
            <div class="slot-item">
              <img src="${stimSrc}" class="slot-image">
            </div>
          `;
        });

        // Ensure penultimate item is different from both target and the last item in allItems
        // This creates a more convincing "near miss" effect before landing on target
        const lastItemInSequence = allItems[allItems.length - 1];
        const filteredStimuli = pavlovianStimuli.filter(stim =>
          stim.stimulus !== currentStimulus &&
          stim.stimulus !== lastItemInSequence
        );
        const penultimateStimulus = filteredStimuli[Math.floor(Math.random() * filteredStimuli.length)].stimulus;

        // Add a penultimate item that is guaranteed to be different from the target
        reelContent += `
          <div class="slot-item">
            <img src="${penultimateStimulus}" class="slot-image">
          </div>
        `;

        // Add our target item as the final item that will stop in the center
        reelContent += `
          <div class="slot-item target-item" id="winning-item">
            <img src="${currentStimulus}" class="slot-image">
          </div>
        `;

        // Fill the reel with content
        slotReel.innerHTML = reelContent;

        // Calculate the width of the reel for proper positioning
        // Constants for slot item sizing
        const ITEM_BASE_WIDTH_PERCENT = 30; // Base width as percent of window width
        const ITEM_MARGIN_PX = 1;           // Margin (in px) on each side of item
        const ITEM_MARGIN_COUNT = 2;        // Number of margins per item (left + right)
        const PERCENT_DIVISOR = 100;        // For percent calculation

        // Calculate the width of each slot item (base width percent of window + margins)
        const itemWidth = Math.ceil((window.innerWidth * (ITEM_BASE_WIDTH_PERCENT + ITEM_MARGIN_PX * ITEM_MARGIN_COUNT) / PERCENT_DIVISOR));
        const totalItems = slotReel.children.length;
        slotReel.style.width = (itemWidth * totalItems) + 'px';

        // Initial position: far to the right so items appear to enter from the right
        slotReel.style.transform = `translateX(${slotContainer.offsetWidth}px)`;

        // Find the target item position (it's the last item in our reel)
        const winningItem = document.getElementById('winning-item');

        // Calculate the exact position needed to center the target in the frame
        const containerCenter = slotContainer.offsetWidth / 2;
        const targetPosition = containerCenter - (winningItem.offsetLeft + (winningItem.offsetWidth / 2));

        // Animation sequence with precise timing
        setTimeout(() => {
          // First movement: slide from right to left through container
          slotReel.style.transition = 'transform 0.5s cubic-bezier(0, 0.4, 0.6, 1)';
          slotReel.style.transform = `translateX(${targetPosition}px)`;

          // Phase 2: Highlight the winning item and the frame after landing
          setTimeout(() => {
            if (winningItem) {
              winningItem.classList.add('winning-item');
            }
            if (selectionFrame) {
              selectionFrame.classList.add('frame-highlight');
            }
          }, PREPILT_CONFIG.CONSTANTS.WINNING_HIGHLIGHT_DELAY);
        }, PREPILT_CONFIG.CONSTANTS.INITIAL_MOVEMENT_DELAY);
      }
    }
  };

  /**
   * Result display trial showing the final stimulus-reward pairing.
   * Displays both the Pavlovian stimulus and its associated reward/punishment.
   */
  const showResult = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      // Get the stimulus and reward images for this trial
      const stimulusImg = "./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/" + PREPILT_CONFIG.stimulus[jsPsych.evaluateTimelineVariable('pav_value')];
      const rewardImg = "./assets/images/card-choosing/outcomes/" + PREPILT_CONFIG.reward[jsPsych.evaluateTimelineVariable('pav_value')];
      const value = PREPILT_CONFIG.value[jsPsych.evaluateTimelineVariable('pav_value')];

      return `
        <div class="trial-content-wrapper">
          <h3>You got:</h3>
          <div class="result-stimulus">
            <div class="result-frame"></div>
            <img src="${stimulusImg}" class="result-image">
            <img src="${rewardImg}" class="coin-image">
          </div>
          <div class="lower-message-area">
            <p class="${value.includes('-') ? 'negative' : 'positive'}">${value}</p>
            <p id="continue-msg" style="visibility: hidden;">Press <span class="spacebar-icon">Spacebar</span> to continue</p>
          </div>
        </div>
      `;
    },
    choices: "NO_KEYS", // Keyboard response handled manually in on_start
    trial_duration: function() {
      return PREPILT_CONFIG.CONSTANTS.MAX_RESULT_DISPLAY_TIME;
    },
    save_timeline_variables: true, // Save trial variables for data analysis
    data: { trialphase: 'prepilt_conditioning'},
    on_start: function (trial) {
      // Show continue message after delay
      jsPsych.pluginAPI.setTimeout(() => {
        const continueMsg = document.querySelector('#continue-msg');
        continueMsg.style.visibility = 'visible';
      }, PREPILT_CONFIG.CONSTANTS.CONTINUE_MESSAGE_DELAY); // Delay before showing the prompt
      
      // Set up keyboard response with minimum RT requirement
      jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: (info) => {
          jsPsych.finishTrial({
            response: info.key,
            rt: info.rt
          });
        },
        valid_responses: [' '], // Only spacebar accepted
        rt_method: 'performance',
        persist: false,
        allow_held_key: false,
        minimum_valid_rt: PREPILT_CONFIG.CONSTANTS.CONTINUE_MESSAGE_DELAY, // Prevent accidental fast responses
      });
      
      // Update experiment state for resumption capability
      if (jsPsych.evaluateTimelineVariable('prepilt_trial') < PREPILT_CONFIG.sequence.length) {
        updateState(`pavlovian_lottery_${jsPsych.evaluateTimelineVariable('prepilt_trial')}`, false);
      } else {
        updateState("pavlovian_lottery_last", false);
      }
    }
  };

  // Build the main task trial sequence
  
  /**
   * Determine starting trial for resumption capability.
   * Parses window.last_state to find the last completed lottery trial.
   */
  let last_lottery = 0; // Default value for fresh start
  if (typeof window.last_state === 'string' && (window.last_state.match(/_/g) || []).length >= 2) {
    const parts = window.last_state.split("_");
    last_lottery = parseInt(parts[2]) || 0; // Extract trial number, fallback to 0 if parsing fails
  } else {
    console.warn("Invalid format for window.last_state. Falling back to default value.");
  }
  
  /**
   * Main trial sequence combining animation and result display.
   * Uses timeline variables to iterate through remaining trials.
   */
  const trialSequence = {
    timeline: [
      lotteryAnimation, // Slot machine spinning animation
      showResult,       // Stimulus-reward pairing display
    ],
    timeline_variables: PREPILT_CONFIG.sequence.slice(last_lottery) // Resume from correct trial
  };

  /**
   * Task completion message displayed after all trials.
   */
  const endMessage = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <h2>Great job!</h2>
      <p>You've completed all the lottery spins.</p>
      <p>Press any key to continue to the next part of the experiment.</p>
    `,
    post_trial_gap: 800 // Brief pause before next part of experiment
  };

  // Build the full experiment timeline
  const timeline = [
    prepilt_preload,  // Asset preloading
    instructions,     // Task instructions
    trialSequence,    // Main lottery trials
    endMessage        // Completion message
  ];

  // Return the timeline
  return timeline;
}