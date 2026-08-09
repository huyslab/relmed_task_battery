import { updateState} from '@utils/index.js';

/**
 * Creates the main instruction pages for the PIT (Pavlovian-Instrumental Transfer) task
 * @param {Object} settings - Configuration object containing session information
 * @returns {Object} jsPsych instructions trial object
 */
function PITMainInstructions(settings) { 
  return {
    type: jsPsychInstructions,
    data: { trialphase: 'vigour_instructions' },
    show_clickable_nav: true,
    pages: [`
    <div id="instruction-text" style="text-align: left">
      <p><strong>You will now play the same game again for the next few minutes. The rules remain the same:</strong></p>

      <ul>
          <li><img src="./assets/images/piggy-banks/saturate-icon.png" style="height:1.3em; transform: translateY(0.2em)"> <span class="highlight-txt">Vividness</span> of piggy colors: Indicates how hard you need to shake it.</li>
          <li><img src="./assets/images/piggy-banks/tail-icon.png" style="height:1.3em; transform: translateY(0.2em)"> <span class="highlight-txt">Tail length</span>: Longer piggy tails = more valuable coins.</li>
      </ul>

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
      </div>
      `,
      `<div id="instruction-text" style="text-align: left">
        <p><strong>But this time, you'll play in a cloudy place.</strong></p>
        <img src="./assets/images/piggy-banks/occluding_clouds.png" style="height:12em">
        <p><span class="highlight-txt">Coins will drop and be collected as usual, but they'll be hidden behind clouds.<br>You won't see them during the game.</span></p>
        <p>We will also pay you the bonus in the same way as in the previous game at the end.</p>
      </div>`,
      `
      <div id="instruction-text" style="text-align: left">
        <p><span class="highlight-txt">In this cloudy place, the background will also change occasionally.</span></p>
        <p>These are the backgrounds you will see. Each time you see a background, <strong>one</strong> coin will either be added or removed from your earnings.</p>

            <div class="pav-stimuli-container">
                  <div class="pit-pav-row">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT1.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT2.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT3.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT4.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT5.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT6.png"} class="pit-pav-icon">
                  </div>
            </div>
      </div>
      `, `
      <div id="instruction-text" style="text-align: left">
            <p><strong>Here's how each background affects your earnings:</strong></p>
            <p>The backgrounds on the left will <strong>add</strong> £1, 50p, or 1p, while the backgrounds on the right will <strong>remove</strong> 1p, 50p, or £1.</p>

            <div class="pav-stimuli-container">
                  <div class="pit-pav-row">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT1.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT2.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT3.png"} class="pit-pav-icon">
                        <div class="vertical"></div>
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT4.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT5.png"} class="pit-pav-icon">
                        <img src=${"./assets/images/pavlovian-stims/" + settings.sessionInfo.stimulusSet + "/PIT6.png"} class="pit-pav-icon">
                  </div>
                  <div class="pit-coin-row">
                        <img src="./assets/images/card-choosing/outcomes/1pound.png" class="pit-coin-icon">
                        <img src="./assets/images/card-choosing/outcomes/50pence.png" class="pit-coin-icon">
                        <img src="./assets/images/card-choosing/outcomes/1penny.png" class="pit-coin-icon">
                        <div class="vertical"></div>
                        <img src="./assets/images/card-choosing/outcomes/1pennybroken.png" class="pit-coin-icon">
                        <img src="./assets/images/card-choosing/outcomes/50pencebroken.png" class="pit-coin-icon">
                        <img src="./assets/images/card-choosing/outcomes/1poundbroken.png" class="pit-coin-icon">
                  </div>
            </div>
      </div>
      `]
  };
}

/**
 * Confirmation screen before starting the PIT task
 * Shows instructions for key placement and allows user to start or review instructions
 */
const startPITconfirmation = {
  type: jsPsychHtmlKeyboardResponse,
  choices: ['b', 'r'], // 'b' to begin, 'r' to review instructions
  stimulus: `
  <div id="instruction-text">
      <p>You will now play the piggy-bank game in the clouds for about <strong>eight minutes</strong>.</p>
      <p>When you're ready, place the <strong>index finger of the hand you write with</strong> comfortably on the <span class="spacebar-icon">B</span> key, as shown below.</p>
      <p>Use only this finger to press during the game.</p>
      <p>Press it once to begin.</p>
      <img src="./assets/images/piggy-banks/vigour_key.png" style="width:250px;" alt="Key press illustration">
      <p>If you want to read the rules again, press <span class="spacebar-icon">R</span>.</p>
  </div>
    `,
  post_trial_gap: 300,
  data: { trialphase: 'pit_instructions' }
}

/**
 * Main export function that creates the complete PIT instructions timeline
 * @param {Object} settings - Configuration object containing session information
 * @returns {Object} jsPsych timeline object with instruction pages and loop functionality
 */
export const PITInstructions = (settings) => {
  return {
    timeline: [PITMainInstructions(settings), startPITconfirmation],
    // Loop function to repeat instructions if user presses 'r'
    loop_function: function (data) {
      const last_iter = data.last(1).values()[0];
      // If user pressed 'r', repeat the instructions
      if (jsPsych.pluginAPI.compareKeys(last_iter.response, 'r')) {
        return true;
      } else {
        return false; // Continue to next part of experiment
      }
    },
    // Update experiment state when instructions begin
    on_timeline_start: () => {
      updateState(`pit_instructions_start`);
    }
  }
}