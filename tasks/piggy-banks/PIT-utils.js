// Import functions 
import { saveDataREDCap, updateBonusState, updateState, showTemporaryWarning, kickOut, fullscreen_prompt } from '@utils/index.js';
import { updatePiggyTails, shakePiggy } from './utils.js';

// Define trial sequence - each trial specifies piggy properties and background stimulus
const PIT_TRIAL_LIST = [{ "magnitude": 5, "ratio": 8, "coin": 0, "trialDuration": 4110 }, { "magnitude": 5, "ratio": 8, "coin": -0.01, "trialDuration": 6666 }, { "magnitude": 5, "ratio": 8, "coin": 0.01, "trialDuration": 7261 }, { "magnitude": 2, "ratio": 8, "coin": 0, "trialDuration": 4188 }, { "magnitude": 2, "ratio": 8, "coin": -1, "trialDuration": 7490 }, { "magnitude": 2, "ratio": 8, "coin": 1, "trialDuration": 6825 }, { "magnitude": 1, "ratio": 1, "coin": 0, "trialDuration": 4130 }, { "magnitude": 1, "ratio": 1, "coin": 0.01, "trialDuration": 6891 }, { "magnitude": 1, "ratio": 1, "coin": -0.01, "trialDuration": 6902 }, { "magnitude": 2, "ratio": 8, "coin": 0, "trialDuration": 4193 }, { "magnitude": 2, "ratio": 8, "coin": -0.5, "trialDuration": 6535 }, { "magnitude": 2, "ratio": 8, "coin": -0.01, "trialDuration": 6652 }, { "magnitude": 1, "ratio": 1, "coin": 0, "trialDuration": 3978 }, { "magnitude": 1, "ratio": 1, "coin": -0.5, "trialDuration": 6888 }, { "magnitude": 1, "ratio": 1, "coin": -1, "trialDuration": 6962 }, { "magnitude": 2, "ratio": 16, "coin": 0, "trialDuration": 3833 }, { "magnitude": 2, "ratio": 16, "coin": 0.5, "trialDuration": 7452 }, { "magnitude": 2, "ratio": 16, "coin": 0.01, "trialDuration": 6954 }, { "magnitude": 5, "ratio": 8, "coin": 0, "trialDuration": 3913 }, { "magnitude": 5, "ratio": 8, "coin": -0.5, "trialDuration": 6956 }, { "magnitude": 5, "ratio": 8, "coin": 0.5, "trialDuration": 7376 }, { "magnitude": 2, "ratio": 8, "coin": 0, "trialDuration": 4005 }, { "magnitude": 2, "ratio": 8, "coin": 0.5, "trialDuration": 7009 }, { "magnitude": 2, "ratio": 8, "coin": 0.01, "trialDuration": 7228 }, { "magnitude": 5, "ratio": 8, "coin": 0, "trialDuration": 4114 }, { "magnitude": 5, "ratio": 8, "coin": -1, "trialDuration": 7386 }, { "magnitude": 5, "ratio": 8, "coin": 1, "trialDuration": 7221 }, { "magnitude": 2, "ratio": 16, "coin": 0, "trialDuration": 4245 }, { "magnitude": 2, "ratio": 16, "coin": 1, "trialDuration": 6679 }, { "magnitude": 2, "ratio": 16, "coin": -0.01, "trialDuration": 7207 }, { "magnitude": 1, "ratio": 1, "coin": 0, "trialDuration": 3767 }, { "magnitude": 1, "ratio": 1, "coin": 1, "trialDuration": 7236 }, { "magnitude": 1, "ratio": 1, "coin": 0.5, "trialDuration": 6501 }, { "magnitude": 2, "ratio": 16, "coin": 0, "trialDuration": 3826 }, { "magnitude": 2, "ratio": 16, "coin": -0.5, "trialDuration": 7465 }, { "magnitude": 2, "ratio": 16, "coin": -1, "trialDuration": 6827 }, { "magnitude": 2, "ratio": 8, "coin": 0, "trialDuration": 4118 }, { "magnitude": 2, "ratio": 8, "coin": -0.5, "trialDuration": 6535 }, { "magnitude": 2, "ratio": 8, "coin": 1, "trialDuration": 6825 }, { "magnitude": 1, "ratio": 1, "coin": 0, "trialDuration": 3751 }, { "magnitude": 1, "ratio": 1, "coin": 0.01, "trialDuration": 6891 }, { "magnitude": 1, "ratio": 1, "coin": -1, "trialDuration": 6962 }, { "magnitude": 2, "ratio": 16, "coin": 0, "trialDuration": 3946 }, { "magnitude": 2, "ratio": 16, "coin": -0.01, "trialDuration": 7207 }, { "magnitude": 2, "ratio": 16, "coin": -1, "trialDuration": 6827 }, { "magnitude": 1, "ratio": 1, "coin": 0, "trialDuration": 3981 }, { "magnitude": 1, "ratio": 1, "coin": 0.5, "trialDuration": 6501 }, { "magnitude": 1, "ratio": 1, "coin": 1, "trialDuration": 7236 }, { "magnitude": 2, "ratio": 16, "coin": 0, "trialDuration": 3944 }, { "magnitude": 2, "ratio": 16, "coin": 0.5, "trialDuration": 7452 }, { "magnitude": 2, "ratio": 16, "coin": 1, "trialDuration": 6679 }, { "magnitude": 5, "ratio": 8, "coin": 0, "trialDuration": 3951 }, { "magnitude": 5, "ratio": 8, "coin": -1, "trialDuration": 7386 }, { "magnitude": 5, "ratio": 8, "coin": -0.5, "trialDuration": 6956 }, { "magnitude": 5, "ratio": 8, "coin": 0, "trialDuration": 3839 }, { "magnitude": 5, "ratio": 8, "coin": -0.01, "trialDuration": 6666 }, { "magnitude": 5, "ratio": 8, "coin": 0.01, "trialDuration": 7261 }, { "magnitude": 2, "ratio": 8, "coin": 0, "trialDuration": 4226 }, { "magnitude": 2, "ratio": 8, "coin": 0.01, "trialDuration": 7228 }, { "magnitude": 2, "ratio": 8, "coin": -1, "trialDuration": 7490 }, { "magnitude": 1, "ratio": 1, "coin": 0, "trialDuration": 3977 }, { "magnitude": 1, "ratio": 1, "coin": -0.01, "trialDuration": 6902 }, { "magnitude": 1, "ratio": 1, "coin": -0.5, "trialDuration": 6888 }, { "magnitude": 2, "ratio": 16, "coin": 0, "trialDuration": 3913 }, { "magnitude": 2, "ratio": 16, "coin": 0.01, "trialDuration": 6954 }, { "magnitude": 2, "ratio": 16, "coin": -0.5, "trialDuration": 7465 }, { "magnitude": 5, "ratio": 8, "coin": 0, "trialDuration": 4233 }, { "magnitude": 5, "ratio": 8, "coin": 1, "trialDuration": 7221 }, { "magnitude": 5, "ratio": 8, "coin": 0.5, "trialDuration": 7376 }, { "magnitude": 2, "ratio": 8, "coin": 0, "trialDuration": 4104 }, { "magnitude": 2, "ratio": 8, "coin": -0.01, "trialDuration": 6652 }, { "magnitude": 2, "ratio": 8, "coin": 0.5, "trialDuration": 7009 }];

// Extract unique piggy bank parameters for UI configuration
const unique_magnitudes = [...new Set(PIT_TRIAL_LIST.map(item => item.magnitude))].sort((a, b) => a - b);
const unique_ratios = [...new Set(PIT_TRIAL_LIST.map(item => item.ratio))].sort((a, b) => b - a); // Sort ratios descending

/**
 * Returns array of image paths to preload for the PIT task
 * @param {Object} settings - Configuration object containing session information
 * @returns {Array} Flattened array of image file paths
 */
export const PITPreloadImages = (settings) => {
  return [
      // Piggy bank background images
      [
        "piggy-cloud.png",
        "occluding_clouds.png"
      ].map(s => "./assets/images/piggy-banks/" + s),
      // Coin outcome images (positive and negative)
      [
        "1pound.png", "50pence.png", "1penny.png", "1pennybroken.png", "50pencebroken.png", "1poundbroken.png"
      ].map(s => "./assets/images/card-choosing/outcomes/" + s),
      // Pavlovian background stimuli (session-specific)
      [
        "PIT1.png", "PIT2.png", "PIT3.png", "PIT4.png", "PIT5.png", "PIT6.png"
      ].map(s => "./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/" + s)
    ].flat(); // Assuming vigour stimulus were already preloaded
}

/**
 * Generates the HTML stimulus for a PIT trial with piggy bank and background
 * @param {number} coin - The coin value that determines background stimulus
 * @param {number} ratio - The response ratio required for reward
 * @param {Object} settings - Configuration object containing session information
 * @returns {string} HTML string for the trial stimulus
 */
function generatePITstimulus(coin, ratio, settings) {
  const ratio_index = unique_ratios.indexOf(ratio);
  // Calculate saturation based on ratio - higher ratios = more saturated colors
  const ratio_factor = ratio_index / (unique_ratios.length - 1);
  const piggy_style = `filter: saturate(${50 * (400 / 50) ** ratio_factor}%) brightness(${115 * (90/115) ** ratio_factor}%);`;
  const cloud_style = `filter: brightness(0.8) contrast(1.2);`;
  
  // Map coin values to background image filenames
  let PIT_imgs = {
    0.01: "PIT3.png",
    1.0: "PIT1.png",
    0.5: "PIT2.png",
    "-0.01": "PIT4.png",
    "-1": "PIT6.png",
    "-0.5": "PIT5.png"
  };
  // Convert to full paths with session-specific directory
  PIT_imgs = Object.fromEntries(Object.entries(PIT_imgs).map(([k, v]) => [k, "./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/" + v]));
  PIT_imgs["0"] = ""; // No background for neutral trials
  
  const piggyBgImg = PIT_imgs[coin];
  return `
    <div class="experiment-wrapper" style="background-image: url(${piggyBgImg});background-repeat: repeat; background-size: 30vw;">
      <!-- Middle Row (Piggy Bank & Coins) -->
      <div id="experiment-container">
        <div id="bg-container">
          <img id="piggy-bg-1" src="./assets/images/piggy-banks/piggy-cloud.png" alt="Piggy background" style="transform: translate(0vw, -4vh); position: absolute; height: 120%; width: auto; ${cloud_style}">
          <img id="piggy-bg-2" src="./assets/images/piggy-banks/piggy-cloud.png" alt="Piggy background" style="transform: translate(0vw, -4vh); position: absolute; height: 120%; width: auto;">
        </div>
        <div id="piggy-container">
          <!-- Piggy Bank Image -->
          <img id="piggy-bank" src="./assets/images/piggy-banks/piggy-bank.png" alt="Piggy Bank" style="${piggy_style}">
        </div>
        <div id="obstructor-container">
          <img id="obstructor" src="./assets/images/piggy-banks/occluding_clouds.png" alt="Obstructor">
        </div>
      </div>
    </div>
  `;
}

// Global task state tracking variables
let PITtrialCounter = 0;
let taskTotalPresses = 0;
let taskTotalReward = 0;
let fsChangeHandler = null;

/**
 * Creates a single PIT trial with vigour task mechanics and Pavlovian background
 * @param {Object} settings - Configuration object containing session information
 * @returns {Object} jsPsych trial object
 */
function PITTrial(settings) {
  // Create trial state in closure scope so it's accessible to data functions
  const trialState = {
    trialPresses: 0,
    trialReward: 0,
    responseTime: []
  };

  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      return generatePITstimulus(jsPsych.evaluateTimelineVariable('coin'), jsPsych.evaluateTimelineVariable('ratio'), settings);
    },
    choices: 'NO_KEYS',
    // response_ends_trial: false,
    trial_duration: jsPsych.timelineVariable('trialDuration'),
    save_timeline_variables: ["magnitude", "ratio"],
    data: {
      trialphase: 'pit_trial',
      pit_coin: jsPsych.timelineVariable('coin'),
      trial_duration: jsPsych.timelineVariable('trialDuration'),
      response_time: () => { return trialState.responseTime },
      trial_presses: () => { return trialState.trialPresses },
      trial_reward: () => { return trialState.trialReward },
      // Record global data
      total_presses: () => { return taskTotalPresses },
      total_reward: () => { return taskTotalReward }
    },
    on_start: function (trial) {
      // Shorten trial duration for simulation mode
      if (window.simulating) {
        trial.trial_duration = 500;
      }
      
      // Reset trial state
      trialState.trialPresses = 0;
      trialState.trialReward = 0;
      trialState.responseTime = [];

      let lastPressTime = 0;
      let pressCount = 0;

      const ratio = jsPsych.evaluateTimelineVariable('ratio');
      const magnitude = jsPsych.evaluateTimelineVariable('magnitude');

      // Set up keyboard listener for vigour responses
      const keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: function (info) {
          trialState.responseTime.push(info.rt - lastPressTime);
          lastPressTime = info.rt;
          // wigglePiggy();
          shakePiggy();
          pressCount++;
          trialState.trialPresses++;
          taskTotalPresses++;

          // Check if ratio requirement is met for reward
          if (pressCount === ratio) {
            trialState.trialReward += magnitude;
            taskTotalReward += magnitude;
            pressCount = 0;
          }
        },
        valid_responses: ['b'],
        rt_method: 'performance',
        persist: true,
        allow_held_key: false,
        minimum_valid_rt: 0
      });
    },
    on_load: function () {
      const currentMag = jsPsych.evaluateTimelineVariable('magnitude');
      const currentRatio = jsPsych.evaluateTimelineVariable('ratio');
      
      // Add magnitudes and ratios to settings for piggy tails
      settings.magnitudes = unique_magnitudes;
      settings.ratios = unique_ratios;
      
      updatePiggyTails(currentMag, currentRatio, settings);

      // Add fullscreen change listener to re-update piggy tails
      fsChangeHandler = () => {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          updatePiggyTails(currentMag, currentRatio, settings);
        }
      };
      document.addEventListener('fullscreenchange', fsChangeHandler);
      document.addEventListener('webkitfullscreenchange', fsChangeHandler);

      // Simulate keypresses for testing mode
      if (window.simulating) {
        const trial_presses = jsPsych.randomization.randomInt(1, 8);
        const avg_rt = 500/trial_presses;
        for (let i = 0; i < trial_presses; i++) {
          jsPsych.pluginAPI.pressKey('b', avg_rt * i + 1);
        }
      }
    },
    on_finish: function (data) {
      // Clean up listener
      jsPsych.pluginAPI.cancelAllKeyboardResponses();
      PITtrialCounter += 1;
      data.pit_trial_number = PITtrialCounter;
      
      // Save data at regular intervals and end of task
      if (PITtrialCounter % (PIT_TRIAL_LIST.length / 3) == 0 || PITtrialCounter == PIT_TRIAL_LIST.length) {
        saveDataREDCap(3);
        updateBonusState(settings);
      }
      
      // Clean up fullscreen event listeners
      if (fsChangeHandler) {
        document.removeEventListener('fullscreenchange', fsChangeHandler);
        document.removeEventListener('webkitfullscreenchange', fsChangeHandler);
        fsChangeHandler = null;
      }

      // Show warning for no response on easy trials
      if (data.trial_presses === 0 && data.timeline_variables.ratio === 1) {
        var up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
        jsPsych.data.addProperties({
          n_warnings: up_to_now + 1
        });
        // console.log(jsPsych.data.get().last(1).select('n_warnings').values[0]);
        showTemporaryWarning("Don't forget to participate!", 800); // Enable this line for non-stopping warning
      }
    }
  };
}

/**
 * Creates the complete timeline for the PIT task core trials
 * @param {Object} settings - Configuration object containing session information
 * @returns {Array} Array of jsPsych timeline objects for all PIT trials
 */
export function createPITCoreTimeline(settings) {
  let PITtrials = [];
  // Create a timeline for each trial with kick-out and fullscreen checks
  PIT_TRIAL_LIST.forEach(trial => {
    PITtrials.push({
      timeline: [kickOut(settings), fullscreen_prompt, PITTrial(settings)],
      timeline_variables: [trial]
    });
  });

  // Add initialization callback to first trial
  PITtrials[0]["on_timeline_start"] = () => {
    updateState(`no_resume_10_minutes`);
    updateState(`pit_task_start`);
    // Reset task counters
    taskTotalPresses = 0;
    taskTotalReward = 0;
  };

  return PITtrials;
}




