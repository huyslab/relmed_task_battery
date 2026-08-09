// Import functions 
import { postToParent, saveDataREDCap, updateBonusState, updateState, showTemporaryWarning, kickOut, fullscreen_prompt } from '@utils/index.js';
import { shakePiggy, updatePiggyTails} from "./utils.js";

// Trial sequence for vigour task - each trial specifies piggy properties and duration
const VIGOUR_TRIALS = [{ "magnitude": 1, "ratio": 1, "trialDuration": 6825 }, { "magnitude": 2, "ratio": 8, "trialDuration": 6956 }, { "magnitude": 1, "ratio": 16, "trialDuration": 7228 }, { "magnitude": 5, "ratio": 1, "trialDuration": 7221 }, { "magnitude": 5, "ratio": 16, "trialDuration": 7261 }, { "magnitude": 2, "ratio": 1, "trialDuration": 7386 }, { "magnitude": 1, "ratio": 8, "trialDuration": 7009 }, { "magnitude": 5, "ratio": 8, "trialDuration": 7376 }, { "magnitude": 2, "ratio": 16, "trialDuration": 6666 }, { "magnitude": 1, "ratio": 1, "trialDuration": 6962 }, { "magnitude": 2, "ratio": 8, "trialDuration": 6501 }, { "magnitude": 2, "ratio": 1, "trialDuration": 7236 }, { "magnitude": 5, "ratio": 1, "trialDuration": 7490 }, { "magnitude": 1, "ratio": 16, "trialDuration": 6902 }, { "magnitude": 1, "ratio": 8, "trialDuration": 6888 }, { "magnitude": 2, "ratio": 16, "trialDuration": 6891 }, { "magnitude": 5, "ratio": 8, "trialDuration": 6535 }, { "magnitude": 5, "ratio": 16, "trialDuration": 6652 }, { "magnitude": 1, "ratio": 8, "trialDuration": 6890 }, { "magnitude": 5, "ratio": 8, "trialDuration": 7452 }, { "magnitude": 5, "ratio": 16, "trialDuration": 6954 }, { "magnitude": 2, "ratio": 1, "trialDuration": 6827 }, { "magnitude": 5, "ratio": 1, "trialDuration": 6679 }, { "magnitude": 1, "ratio": 16, "trialDuration": 7199 }, { "magnitude": 2, "ratio": 16, "trialDuration": 7207 }, { "magnitude": 1, "ratio": 1, "trialDuration": 7145 }, { "magnitude": 2, "ratio": 8, "trialDuration": 7465 }, { "magnitude": 1, "ratio": 8, "trialDuration": 6870 }, { "magnitude": 5, "ratio": 8, "trialDuration": 6726 }, { "magnitude": 2, "ratio": 16, "trialDuration": 6688 }, { "magnitude": 2, "ratio": 8, "trialDuration": 6506 }, { "magnitude": 5, "ratio": 1, "trialDuration": 7044 }, { "magnitude": 2, "ratio": 1, "trialDuration": 7293 }, { "magnitude": 1, "ratio": 1, "trialDuration": 7182 }, { "magnitude": 1, "ratio": 16, "trialDuration": 6862 }, { "magnitude": 5, "ratio": 16, "trialDuration": 6985 }];

// Extract unique piggy bank parameters for UI configuration
const magnitudes = [...new Set(VIGOUR_TRIALS.map(trial => trial.magnitude))].sort((a, b) => a - b);
const ratios = [...new Set(VIGOUR_TRIALS.map(trial => trial.ratio))].sort((a, b) => b - a);

// Global task state tracking variables
let taskTotalReward = 0;
let taskTotalPresses = 0;
let trialState = {
  trialPresses: 0,
  trialReward: 0,
  responseTime: [],
  pointerType: null,
  pointerTypeCounts: {},
  viewportWidth: null,
  viewportHeight: null,
  viewportChanged: false,
  wrongOrientation: false,
  wrongOrientationTimes: []
};

// Array of image paths to preload for the vigour task
const VIGOUR_PRELOAD_IMAGES = [
        "1p-num.png", "2p-num.png", "5p-num.png", "10p-num.png", "piggy-bank.png", 
        "ooc_2p.png", "piggy-tail2.png", "saturate-icon.png", "tail-icon.png"
      ].map(s => "./assets/images/piggy-banks/" + s);

/**
 * Creates and animates a falling coin when user earns a reward
 * @param {number} magnitude - The coin value (determines which coin image to show)
 * @param {boolean} persist - Whether to use persistent coin container (default: false)
 */
function dropCoin(magnitude, persist = false) {
  const containerType = persist ? 'persist-coin-container' : 'coin-container';
  const coinContainer = document.getElementById(containerType);
  const coin = createCoin(magnitude);
  coinContainer.appendChild(coin);

  const animationOptions = getCoinAnimationOptions(magnitude);
  coin.animate(animationOptions.keyframes, animationOptions.config)
    .onfinish = () => coin.remove();
}

/**
 * Creates a coin image element with appropriate source and styling
 * @param {number} magnitude - The coin value
 * @returns {HTMLImageElement} Coin image element
 */
function createCoin(magnitude) {
  const coin = document.createElement('img');
  coin.className = 'vigour_coin';
  coin.src = magnitude === 0 ? './assets/images/piggy-banks/ooc_2p.png' : `./assets/images/piggy-banks/${magnitude}p-num.png`;
  coin.alt = `Coin of value ${magnitude}`;
  return coin;
}

/**
 * Returns animation configuration for coin drop effect
 * @param {number} magnitude - The coin value (affects animation duration)
 * @returns {Object} Animation keyframes and configuration
 */
function getCoinAnimationOptions(magnitude) {
  const duration = magnitude === 0 ? 2500 : 1000;
  const topStart = '-15%';
  const opacityStart = 0.8;

  return {
    keyframes: [
      { top: topStart, opacity: opacityStart, offset: 0 },
      { top: '70%', opacity: 1, offset: 0.1 },
      { top: '70%', opacity: 1, offset: 0.9 },
      { top: '70%', opacity: 0, offset: 1 }
    ],
    config: {
      duration: duration,
      easing: 'ease-in-out'
    }
  };
}

/**
 * Sets up a ResizeObserver to monitor element size changes
 * @param {string} elementId - ID of element to observe
 * @param {Function} callback - Function to call when element resizes
 */
function observeResizing(elementId, callback) {
  const resizeObserver = new ResizeObserver(callback);
  const element = document.getElementById(elementId);
  if (element) {
    resizeObserver.observe(element);
  }
  return resizeObserver;
}

/**
 * Creates a persistent coin container that survives trial transitions
 * Used to show coin animations across different trial screens
 */
function createPersistentCoinContainer() {
  // Check if it already exists
  if (document.getElementById('persist-coin-container')) {
    return;
  }
  
  // Create the container
  const persistContainer = document.createElement('div');
  persistContainer.id = 'persist-coin-container';
  document.body.appendChild(persistContainer);
  
  // Initialize position
  updatePersistentCoinContainer();
}

/**
 * Removes the persistent coin container from the DOM
 */
function removePersistentCoinContainer() {
  const persistContainer = document.getElementById('persist-coin-container');
  if (persistContainer) {
    persistContainer.remove();
  }
}

/**
 * Updates the position and size of persistent coin container to match the trial coin container
 * Ensures coin animations appear in the correct location
 */
function updatePersistentCoinContainer() {
  const coinContainer = document.getElementById('coin-container');
  const persistCoinContainer = document.getElementById('persist-coin-container');

  if (coinContainer && persistCoinContainer) {
    const rect = coinContainer.getBoundingClientRect();
    persistCoinContainer.style.top = `${rect.top}px`;
    persistCoinContainer.style.left = `${rect.left}px`;
    persistCoinContainer.style.width = `${rect.width}px`;
    persistCoinContainer.style.height = `${rect.height}px`;
  }
}

/**
 * Generates the HTML stimulus for a vigour trial with styled piggy bank
 * @param {number} magnitude - The reward magnitude (affects tail count)
 * @param {number} ratio - The response ratio requirement (affects color saturation)
 * @returns {string} HTML string for the trial stimulus
 */
function generateTrialStimulus(magnitude, ratio) {
  const ratio_index = ratios.indexOf(ratio);
  // Calculate saturation based on ratio - higher ratios = more saturated colors
  const ratio_factor = ratio_index / (ratios.length - 1);
  const piggy_style = `filter: saturate(${50 * (400 / 50) ** ratio_factor}%) brightness(${115 * (90 / 115) ** ratio_factor}%);`;
  return `
    <div class="experiment-wrapper">
      <!-- Middle Row (Piggy Bank & Coins) -->
      <div id="experiment-container">
        <div id="coin-container"></div>
        <div id="piggy-container">
          <!-- Piggy Bank Image -->
          <img id="piggy-bank" src="./assets/images/piggy-banks/piggy-bank.png" alt="Piggy Bank" style="${piggy_style}">
        </div>
      </div>
    </div>
  `;
}

/**
 * Sets up a pointerdown (touch/tap) listener on the piggybank element.
 * @param {Function} callback - Function to call when piggybank is tapped
 * @returns {{element: HTMLElement, handler: Function}|null} Listener reference for cleanup, or null if element not found
 */
function setupPointerListener(callback) {
  const piggyContainer = document.getElementById('piggy-container');
  if (!piggyContainer) return null;
  const handler = function (event) {
    if (!event.isPrimary) return; // ignore secondary touches (multi-touch contamination)
    if (event.button !== 0) return; // ignore right-click, middle-click, and stylus barrel buttons
    event.preventDefault();
    callback(event);
  };
  piggyContainer.addEventListener('pointerdown', handler);
  return { element: piggyContainer, handler };
}

/**
 * Removes a pointerdown listener set up by setupPointerListener.
 * @param {Function|null} handler - The handler function to remove
 * @param {HTMLElement|null} element - The DOM element the listener is attached to
 */
function cleanupPointerListener(handler, element) {
  if (handler && element) {
    element.removeEventListener('pointerdown', handler);
  }
}

/**
 * Simulates a tap on an element by dispatching a PointerEvent after a delay.
 * Used only in simulation mode.
 * @param {HTMLElement} element - The element to simulate a tap on
 * @param {number} delay - Delay in milliseconds before dispatching
 */
function simulatePointerTap(element, delay) {
  setTimeout(() => {
    if (element) {
      element.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerType: 'touch',
        button: 0
      }));
    }
  }, delay);
}

// Global trial tracking variables
let vigourTrialCounter = 0;
let fsChangeHandler = null;
let vigourPointerHandler = null;
let vigourPiggyContainer = null;
let vigourResizeHandler = null;
let vigourResizeTimer = null;
let vigourResizeObserver = null;
let vigourGateFrame = null;

/**
 * Creates a single vigour trial with piggy bank shaking mechanics
 * @param {Object} settings - Configuration object containing task parameters
 * @returns {Object} jsPsych trial object
 */
function piggyBankTrial(settings) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      return generateTrialStimulus(jsPsych.evaluateTimelineVariable('magnitude'), jsPsych.evaluateTimelineVariable('ratio'));
    },
    choices: 'NO_KEYS',
    // response_ends_trial: false,
    trial_duration: jsPsych.timelineVariable('trialDuration'),
    save_timeline_variables: ["magnitude", "ratio"],
    data: {
      trialphase: 'vigour_trial',
      trial_duration: jsPsych.timelineVariable('trialDuration'),
      // Trial-specific data functions
      responseTime: () => { return trialState.responseTime },
      pointer_type: () => { return trialState.pointerType },
      // Per-input-type press counts (e.g. {touch: 5, pen: 2}); pointer_mixed flags
      // finger<->pencil switching within a trial (supports warnings / exclusion).
      pointer_type_counts: () => { return trialState.pointerTypeCounts },
      pointer_mixed: () => { return Object.keys(trialState.pointerTypeCounts).length > 1 },
      // Per-trial viewport geometry: drives piggy size; subsumes orientation and
      // captures dvh/toolbar changes. viewport_changed flags mid-trial rotation/resize.
      viewport_width: () => { return trialState.viewportWidth },
      viewport_height: () => { return trialState.viewportHeight },
      viewport_changed: () => { return trialState.viewportChanged },
      wrong_orientation: () => { return trialState.wrongOrientation },
      wrong_orientation_times: () => { return trialState.wrongOrientationTimes },
      trial_presses: () => { return trialState.trialPresses },
      trial_reward: () => { return trialState.trialReward },
      // Global task data
      total_presses: function() { return taskTotalPresses },
      total_reward: function() { return taskTotalReward }
    },
    on_start: function (trial) {
      // Shorten trial duration for simulation mode
      if (window.simulating) {
        trial.trial_duration = 500;
      }

      // Reset trial state
      trialState = {
        trialPresses: 0,
        trialReward: 0,
        responseTime: [],
        pointerType: null,
        pointerTypeCounts: {},
        viewportWidth: null,
        viewportHeight: null,
        viewportChanged: false,
        wrongOrientation: false,
        wrongOrientationTimes: []
      };
    },
    on_load: function () {
      const magnitude = jsPsych.evaluateTimelineVariable('magnitude');
      const ratio = jsPsych.evaluateTimelineVariable('ratio');

      // Record the viewport geometry this trial was presented at
      trialState.viewportWidth = window.innerWidth;
      trialState.viewportHeight = window.innerHeight;

      // Flag the rotate-to-portrait gate (phone-landscape) during this trial, with onset offsets (ms).
      // trialOnset is separate from trialStartTime below so RT measurement is unchanged.
      const trialOnset = performance.now();
      const isRotateGateVisible = () => {
        const overlay = document.getElementById('rotate-overlay');
        return !!overlay && getComputedStyle(overlay).display !== 'none';
      };
      let gateVisible = isRotateGateVisible();
      if (gateVisible) {
        trialState.wrongOrientation = true;
        trialState.wrongOrientationTimes.push(Math.round(performance.now() - trialOnset));
      }
      const syncGateState = () => {
        const now = performance.now();
        const nowVisible = isRotateGateVisible();
        if (nowVisible && !gateVisible) {
          trialState.wrongOrientation = true;
          trialState.wrongOrientationTimes.push(Math.round(now - trialOnset));
        }
        gateVisible = nowVisible;
      };

      // Add magnitudes and ratios to settings for piggy tails
      settings.magnitudes = magnitudes;
      settings.ratios = ratios;

      updatePiggyTails(magnitude, ratio, settings);
      updatePersistentCoinContainer();
      vigourResizeObserver = observeResizing('coin-container', updatePersistentCoinContainer);

      // Add fullscreen change listener to re-update piggy tails
      fsChangeHandler = () => {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          updatePiggyTails(magnitude, ratio, settings);
        }
      };
      document.addEventListener('fullscreenchange', fsChangeHandler);
      document.addEventListener('webkitfullscreenchange', fsChangeHandler);

      // Re-layout tails and coin overlay on viewport changes (orientation, mobile toolbar, resize).
      // Tails are positioned in px from the piggy's measured width, so they must be recomputed.
      vigourResizeHandler = () => {
        trialState.viewportChanged = true; // geometry changed mid-trial (rotation or mobile toolbar)
        syncGateState();
        if (vigourGateFrame !== null) cancelAnimationFrame(vigourGateFrame);
        vigourGateFrame = requestAnimationFrame(() => {
          vigourGateFrame = null;
          syncGateState();
        });
        if (vigourResizeTimer) clearTimeout(vigourResizeTimer);
        vigourResizeTimer = setTimeout(() => {
          updatePiggyTails(magnitude, ratio, settings);
          updatePersistentCoinContainer();
        }, 150);
      };
      window.addEventListener('resize', vigourResizeHandler);
      window.addEventListener('orientationchange', vigourResizeHandler);

      // Set up pointerdown (touch/tap) listener on the piggybank
      let pressCount = 0;
      let lastPressTime = null;
      const trialStartTime = performance.now();
      const piggyContainer = document.getElementById('piggy-container');
      vigourPiggyContainer = piggyContainer;

      vigourPointerHandler = function (event) {
        if (!event.isPrimary) return; // ignore secondary touches (multi-touch contamination)
        if (event.button !== 0) return; // ignore right-click, middle-click, and stylus barrel buttons
        syncGateState();
        if (gateVisible) return;
        event.preventDefault();
        const now = performance.now();

        const ptype = event.pointerType || 'unknown';
        if (trialState.pointerType === null) {
          trialState.pointerType = ptype; // modality the trial was started with
        }
        // Count presses per input type to detect mixed/switched input within a trial
        trialState.pointerTypeCounts[ptype] = (trialState.pointerTypeCounts[ptype] || 0) + 1;

        if (lastPressTime === null) {
          // First tap: record RT from trial start
          trialState.responseTime.push(now - trialStartTime);
        } else {
          trialState.responseTime.push(now - lastPressTime);
        }
        lastPressTime = now;

        shakePiggy();
        pressCount++;
        trialState.trialPresses++;
        taskTotalPresses++;

        if (pressCount === ratio) {
          trialState.trialReward += magnitude;
          taskTotalReward += magnitude;
          pressCount = 0;
          dropCoin(magnitude, true);
        }
      };

      if (piggyContainer) {
        piggyContainer.addEventListener('pointerdown', vigourPointerHandler);
      }

      // Simulate taps for testing mode
      if (window.simulating) {
        const trial_presses = jsPsych.randomization.randomInt(1, 8);
        const avg_rt = 500 / trial_presses;
        for (let i = 0; i < trial_presses; i++) {
          simulatePointerTap(piggyContainer, avg_rt * i + 1);
        }
      }
    },
    on_finish: function (data) {
      // Clean up pointerdown listener
      cleanupPointerListener(vigourPointerHandler, vigourPiggyContainer);
      vigourPointerHandler = null;
      vigourPiggyContainer = null;
      // Also clean up any lingering keyboard listeners from other trials
      jsPsych.pluginAPI.cancelAllKeyboardResponses();
      vigourTrialCounter += 1;
      data.trial_number = vigourTrialCounter;
      
      // Save data at regular intervals and end of task
      if (vigourTrialCounter % (VIGOUR_TRIALS.length / 3) == 0 || vigourTrialCounter == VIGOUR_TRIALS.length) {
        saveDataREDCap(3);
        updateBonusState(settings);
      }
      
      // Clean up fullscreen event listeners
      if (fsChangeHandler) {
        document.removeEventListener('fullscreenchange', fsChangeHandler);
        document.removeEventListener('webkitfullscreenchange', fsChangeHandler);
        fsChangeHandler = null;
      }

      // Clean up viewport resize listeners and any pending debounce
      if (vigourResizeHandler) {
        window.removeEventListener('resize', vigourResizeHandler);
        window.removeEventListener('orientationchange', vigourResizeHandler);
        vigourResizeHandler = null;
      }
      if (vigourResizeTimer) {
        clearTimeout(vigourResizeTimer);
        vigourResizeTimer = null;
      }
      if (vigourGateFrame !== null) {
        cancelAnimationFrame(vigourGateFrame);
        vigourGateFrame = null;
      }
      if (vigourResizeObserver) {
        vigourResizeObserver.disconnect();
        vigourResizeObserver = null;
      }

      // Show warning for no response on easy trials
      if (data.trial_presses === 0 && data.timeline_variables.ratio === 1) {
        const up_to_now = jsPsych.data.get().last(1).select('n_warnings').values[0] ?? 0;
        jsPsych.data.addProperties({ n_warnings: up_to_now + 1 });
        showTemporaryWarning("Didn't catch a response - moving on", 800);
      }

      // Warn (and count like a missed response) if a stylus / Apple Pencil was used
      if ((data.pointer_type_counts?.pen || 0) > 0) {
        const pen_up_to_now = jsPsych.data.get().last(1).select('n_warnings').values[0] ?? 0;
        jsPsych.data.addProperties({ n_warnings: pen_up_to_now + 1 });
        showTemporaryWarning("Please tap with your finger, not a stylus (e.g., Apple Pencil)", 800);
      }
    }
  }
};

/**
 * Creates the complete timeline for the vigour task core trials
 * @param {Object} settings - Configuration object containing task parameters
 * @returns {Array} Array of jsPsych timeline objects for all vigour trials
 */
function createVigourCoreTimeline(settings) {
    let experimentTimeline = [];
    // Create a timeline for each trial with kick-out and fullscreen checks
    VIGOUR_TRIALS.forEach(trial => {
        experimentTimeline.push({
            timeline: [kickOut(settings), fullscreen_prompt, piggyBankTrial(settings)], 
            timeline_variables: [trial]
        });
    });

    // Add initialization callback to first trial
    experimentTimeline[0]["on_timeline_start"] = () => {
        updateState("no_resume_10_minutes");
        updateState(`vigour_task_start`);
        createPersistentCoinContainer();
        // Reset task counters (vigourTrialCounter must also be reset so trial_number
        // data is correct and the end-of-task save fires on every run, not just the first)
        taskTotalReward = 0;
        taskTotalPresses = 0;
        vigourTrialCounter = 0;
    };

    // Add cleanup callback to last trial
    experimentTimeline.at(-1)["on_timeline_finish"] = () => {
        removePersistentCoinContainer();
    };
    
    return experimentTimeline;
}

export {
  createVigourCoreTimeline,
  updatePersistentCoinContainer,
  observeResizing,
  dropCoin,
  setupPointerListener,
  cleanupPointerListener,
  simulatePointerTap,
  VIGOUR_PRELOAD_IMAGES
}
