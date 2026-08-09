import { updatePersistentCoinContainer, observeResizing, dropCoin, setupPointerListener, cleanupPointerListener, simulatePointerTap } from './vigour-utils.js';
import { shakePiggy } from './utils.js';
import { updateState } from '@utils/index.js';

let instructionPointerListener = null;
let instructionResizeObserver = null;

/**
 * Interactive instruction page that demonstrates the piggy bank shaking mechanism
 * Allows users to practice the task with immediate feedback
 */
const instructionPage = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: generateInstructStimulus,
  choices: 'NO_KEYS',
  trial_duration: null,
  data: {trialphase: 'vigour_instructions'},
  on_load: function () {
    updatePersistentCoinContainer();
    instructionResizeObserver = observeResizing('coin-container', updatePersistentCoinContainer);

    // Demo state variables
    let shakeCount = 0;
    let FR = 5; // Fixed ratio - reward every 5 presses
    let timerStarted = false;
    let timer;
    updateInstructionText(shakeCount);
    const bottomContainer = document.getElementById('bottom-container');
    const experimentContainer = document.getElementById('experiment-container');
    const buttonInstruction = document.getElementById('button-instruction');
    instructionPointerListener = setupPointerListener(handleSpacebar);

    /**
     * Handles spacebar presses during the instruction demo
     * Provides immediate feedback and coin rewards
     */
    function handleSpacebar() {
      shakeCount++;
      shakePiggy();
      updateInstructionText(shakeCount);

      // Give coin reward every FR presses
      if (shakeCount % FR === 0) {
        dropCoin(0);
      }

      // Show continue/restart options after first reward
      if (shakeCount === FR + 1) {
        bottomContainer.style.visibility = 'visible';

        if (!timerStarted) {
          timerStarted = true;
          startTimer();
        }
      }
    }

    /**
     * Starts timer to highlight the continue button after 10 seconds
     */
    function startTimer() {
      timer = setTimeout(() => {
        experimentContainer.style.visibility = 'hidden';
        buttonInstruction.style.color = '#0066cc';
      }, 10000); // 10 seconds
    }

    /**
     * Resets the instruction demo to initial state
     */
    function restart() {
      shakeCount = 0;
      timerStarted = false;
      clearTimeout(timer);
      updateInstructionText(shakeCount);
      experimentContainer.style.visibility = 'visible';
      bottomContainer.style.visibility = 'hidden';
      buttonInstruction.style.fontSize = '';
      buttonInstruction.style.color = '';
      if (instructionPointerListener) {
        cleanupPointerListener(instructionPointerListener.handler, instructionPointerListener.element);
      }
      instructionPointerListener = setupPointerListener(handleSpacebar);
      const coinContainer = document.getElementById('coin-container');
      coinContainer.innerHTML = '';
    }

    // Set up button event listeners
    document.getElementById('restart-button').addEventListener('click', restart);
    document.getElementById('continue-button').addEventListener('click', jsPsych.finishTrial);

    // Simulate user interaction for testing mode
    if (window.simulating) {
      async function simulateTapsAndClick() {
        const piggy = document.getElementById('piggy-container');
        const tapPromises = [];
        // Simulate FR + 1 taps to trigger coin drop and continue option
        for (let i = 0; i < FR + 1; i++) {
          const scheduledTime = 100 * i + 1;
          tapPromises.push(
            new Promise(resolve => {
              simulatePointerTap(piggy, scheduledTime);
              setTimeout(resolve, scheduledTime);
            })
          );
        }

        // Wait for all taps to be simulated
        await Promise.all(tapPromises);

        // Simulate clicking continue button
        jsPsych.pluginAPI.clickTarget(document.getElementById('continue-button'), 100);
      }

      // Call the async function to start the simulation
      simulateTapsAndClick();
    }
  },
  on_finish: function () {
    if (instructionPointerListener) {
      cleanupPointerListener(instructionPointerListener.handler, instructionPointerListener.element);
      instructionPointerListener = null;
    }
    if (instructionResizeObserver) {
      instructionResizeObserver.disconnect();
      instructionResizeObserver = null;
    }
    jsPsych.pluginAPI.cancelAllKeyboardResponses();
  }
};

/**
 * Static instruction pages explaining the game rules and coin types
 * Uses jsPsych instructions plugin with navigation
 */
const ruleInstruction = {
  type: jsPsychInstructions,
  data: {trialphase: 'vigour_instructions'},
  show_clickable_nav: true,
  pages: [`
  <div id="instruction-text" style="text-align: left">
    <p><strong>You will now play a few minutes of this game, collecting coins!</strong></p>
    
    <p>Throughout the game, you will see different piggy banks with unique appearances:</p>
    <ul>
        <li><img src="./assets/images/piggy-banks/saturate-icon.png" style="height:1.3em; transform: translateY(0.2em)"> <span class="highlight-txt">Vividness</span> of piggy colors: Indicates how fast you need to shake it.</li>
        <li><img src="./assets/images/piggy-banks/tail-icon.png" style="height:1.3em; transform: translateY(0.2em)"> <span class="highlight-txt">Tail length</span>: Longer piggy tails = more valuable coins.</li>
    </ul>
    </div>
    `,
    `<div id="instruction-text" style="text-align: left">
    <p>Types of coins you can win:</p>
    <div class="instruct-coin-container">
        <div class="instruct-coin">
            <img src="./assets/images/piggy-banks/1p-num.png" alt="1 Penny">
            <p>1 Penny</p>
        </div>
        <div class="instruct-coin">
            <img src="./assets/images/piggy-banks/2p-num.png" alt="2 Pence">
            <p>2 Pence</p>
        </div>
        <div class="instruct-coin">
            <img src="./assets/images/piggy-banks/5p-num.png" alt="5 Pence">
            <p>5 Pence</p>
        </div>
    </div>
    
    <p><span class="highlight-txt">Your bonus</span>: At the end of the game, we will pay you a proportion of the total amount of coins collected across all the piggy banks.</p>
    </div>
      `]
};

/**
 * Final confirmation screen before starting the actual vigour task
 * Allows user to restart instructions or begin the task
 */
const startConfirmation = {
  type: jsPsychHtmlKeyboardResponse,
  choices: 'NO_KEYS',
  stimulus: `
  <div class="experiment-wrapper">
    <div id="instruction-container">
      <div id="instruction-text">
        <p>You will now play the piggy-bank game without a break for about <strong>four minutes</strong>.</p>
        <p>When you're ready, <span class="highlight-txt">tap the piggy bank</span> to begin.</p>
      </div>
    </div>
    <div id="experiment-container">
      <div id="piggy-container">
        <img id="piggy-bank" src="./assets/images/piggy-banks/piggy-bank.png"
             alt="Tap the piggy bank to start">
      </div>
    </div>
    <div id="bottom-container" style="visibility: visible;">
      <button id="reread-button" class="jspsych-btn">Re-read instructions</button>
    </div>
  </div>
    `,
  post_trial_gap: 300,
  data: {trialphase: 'vigour_instructions'},
  simulation_options: {
    data: {
      response: 'b'
    }
  },
  on_load: function () {
    let confirmed = false;

    const finishOnce = function (response) {
      if (confirmed) return;
      confirmed = true;
      jsPsych.finishTrial({ response });
    };

    // Tap piggybank to begin
    const piggyContainer = document.getElementById('piggy-container');
    if (piggyContainer) {
      piggyContainer.addEventListener('pointerdown', function handler(event) {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        finishOnce('b');
        piggyContainer.removeEventListener('pointerdown', handler);
      });
    }

    // Button to re-read instructions
    const rereadButton = document.getElementById('reread-button');
    if (rereadButton) {
      rereadButton.addEventListener('click', function () {
        finishOnce('r');
      });
    }

    // Auto-advance in simulation mode: this trial has no timeout and ends only on a
    // real tap/click, so dispatch a simulated tap on the piggy bank to begin the task.
    if (window.simulating) {
      simulatePointerTap(piggyContainer, 100);
    }
  },
  on_finish: function (data) {
    // Set RNG seed for reproducible trial sequences
    const seed = jsPsych.randomization.setSeed();
    data.rng_seed = seed;
  },
}

/**
 * Main export: Complete vigour task instruction timeline
 * Includes loop functionality to repeat instructions if user presses 'r'
 */
export const vigour_instructions = {
  timeline: [instructionPage, ruleInstruction, startConfirmation],
  // Loop function to repeat instructions if user presses 'r'
  loop_function: function (data) {
    const last_iter = data.last(1).values()[0];
    if (jsPsych.pluginAPI.compareKeys(last_iter.response, 'r')) {
      return true; // Repeat instructions
    } else {
      return false; // Continue to main task
    }
  },
  on_timeline_start: () => {updateState(`vigour_instructions_start`)}
}

/**
 * Generates the HTML stimulus for the interactive instruction page
 * @returns {string} HTML string containing the instruction demo interface
 */
function generateInstructStimulus() {
  return `
    <div class="experiment-wrapper">
      <!-- Upper Information (Instructions) -->
      <div id="instruction-container">
        <div id="instruction-text"></div>
      </div>

      <!-- Middle Row (Piggy Bank & Coins) -->
      <div id="experiment-container">
        <div id="coin-container"></div>
        <div id="piggy-container">
          <!-- Piggy Bank Image -->
          <img id="piggy-bank" src="./assets/images/piggy-banks/piggy-bank.png" alt="Piggy Bank">
        </div>
      </div>

      <!-- Lower Information (Buttons) -->
      <div id="bottom-container" style="visibility: hidden">
        <p id="button-instruction" style="margin: 24px">Press <span style="font-weight: bold;">Restart</span> to try again, or <span style="font-weight: bold;">Continue</span> to proceed.</p>
        <div id="button-container">
          <button id="restart-button" class="jspsych-btn">Restart</button>
          <button id="continue-button" class="jspsych-btn">Continue</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Updates the instruction text based on user's progress through the demo
 * @param {number} shakeCount - Number of times user has pressed the key
 */
function updateInstructionText(shakeCount) {
  const messages = [
    '<p>Welcome to the piggy bank game!</p><p>Tap the piggy bank to shake it!</p>',
    '<p>Tap the piggy bank to shake it!</p><p>You can tap it again to keep on shaking...</p>',
    '<p>Well done, You just got a coin out of the piggy bank!</p><p><span class="highlight-txt">You can always tap again for more coins.</span> Try getting some more!</p>'
  ];
  let messageIndex = 0;
  if (shakeCount < 1) {
    messageIndex = 0; // Initial welcome message
  } else if (shakeCount >= 1 && shakeCount < 5) {
    messageIndex = 1; // Encouragement to continue pressing
  } else {
    messageIndex = 2; // Success message after first coin
  }
  document.getElementById('instruction-text').innerHTML = messages[messageIndex];
}
