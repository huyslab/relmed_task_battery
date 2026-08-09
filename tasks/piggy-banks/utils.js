// Utility functions common to vigour and PIT tasks

/**
 * Animates the piggy bank container with specified keyframes and options
 * @param {Array<string>} keyframes - Array of CSS transform values for animation frames
 * @param {Object} options - Animation options (duration, easing, etc.)
 */
function animatePiggy(keyframes, options) {
  const piggyBank = document.getElementById('piggy-container');
  if (piggyBank) {
    // Preserve any existing transforms
    let currentTransform = getComputedStyle(piggyBank).transform;
    currentTransform = currentTransform === 'none' ? '' : currentTransform;
    const animationKeyframes = keyframes.map(frame => ({
      transform: `${currentTransform} ${frame}`
    }));
    piggyBank.animate(animationKeyframes, options);
  }
}

/**
 * Triggers a quick shake animation on the piggy bank when user presses a key
 */
function shakePiggy() {
  animatePiggy([
    'translateX(-2%)',
    'translateX(2%)',
    'translateX(0)'
  ], { duration: 100, easing: 'linear' });
}

/**
 * Updates the piggy bank's tail display based on magnitude and applies visual styling
 * @param {number} magnitude - The reward magnitude (determines number of tails)
 * @param {number} ratio - The response ratio requirement (affects visual saturation)
 * @param {Object} settings - Configuration object containing magnitudes and ratios arrays
 */
function updatePiggyTails(magnitude, ratio, settings) {
  const piggyContainer = document.getElementById('piggy-container');
  const piggyBank = document.getElementById('piggy-bank');

  // Calculate visual parameters based on current trial values
  const magnitude_index = settings.magnitudes.indexOf(magnitude);
  const ratio_index = settings.ratios.indexOf(ratio);
  // Calculate saturation based on ratio - higher ratios get more saturated colors
  const ratio_factor = ratio_index / (settings.ratios.length - 1);

  // Render tails fresh on every (re)layout. Clearing INSIDE the handler keeps this
  // idempotent even when the image fires `load` after the manual `complete` call below:
  // a freshly inserted cached image triggers both, which would otherwise double the tails
  // (and tail count encodes reward magnitude, so duplicates are a wrong experimental cue).
  piggyBank.onload = () => {
    document.querySelectorAll('.piggy-tail').forEach(tail => tail.remove());
    const piggyBankWidth = piggyBank.offsetWidth;
    const tailWidth = piggyBankWidth * 0.1; // Tail width relative to piggy size
    const spacing = tailWidth * 0; // No spacing between tails currently
    
    // Create one tail for each magnitude level (magnitude_index + 1 tails total)
    for (let i = 0; i < magnitude_index + 1; i++) {
      const tail = document.createElement('img');
      tail.src = './assets/images/piggy-banks/piggy-tail2.png';
      tail.alt = 'Piggy Tail';
      tail.className = 'piggy-tail';

      // Position each tail to the right of the piggy bank
      tail.style.left = `calc(50% + ${piggyBankWidth / 2 + (tailWidth + spacing) * i}px - ${tailWidth / 20}px)`;
      tail.style.width = `${tailWidth}px`;
      // Apply saturation and brightness based on ratio difficulty
      tail.style.filter = `saturate(${50 * (400 / 50) ** ratio_factor}%) brightness(${115 * (90 / 115) ** ratio_factor}%)`;

      piggyContainer.appendChild(tail);
    }
  };

  // Trigger onload if the image is already cached
  if (piggyBank.complete) {
    piggyBank.onload();
  }
}

/**
 * Computes bonus payments for relative piggy bank tasks based on trial performance.
 * 
 * @param {string} trialphase - The trial phase identifier to filter trials by
 * @returns {Object} Bonus calculation results
 * @returns {number} returns.earned - Actual bonus earned from the last trial's total reward (converted to currency units)
 * @returns {number} returns.min - Minimum possible bonus based on task parameters
 * @returns {number} returns.max - Maximum possible bonus based on task duration and parameters
 * 
 * @description
 * Calculates three bonus values:
 * - earned: Takes the final total_reward and converts to currency (×0.01)
 * - min: Sum of minimum rewards (1 × magnitude ÷ ratio) across all trials
 * - max: Sum of maximum rewards (10 × duration × magnitude ÷ ratio) across all trials
 * 
 * Returns zero values if no trials found or calculations result in NaN.
 */
function computeRelativePiggyTasksBonus(trialphase) {
    const trials = jsPsych.data.get().filter({trialphase});

    if (trials.count() === 0) {
        // console.log(`No trials found for ${trialphase}. Returning default values.`);
        return { earned: 0, min: 0, max: 0 };
    }

    const earned = trials.select('total_reward').values.slice(-1)[0] * 0.01;
    const values = trials.values();

    const min = values.reduce((sum, trial) => 
        sum + (1 * trial.timeline_variables.magnitude * 0.01 / trial.timeline_variables.ratio), 0);

    const max = values.reduce((sum, trial) => 
        sum + (10 * trial.trial_duration / 1000 * 
            (trial.timeline_variables.magnitude * 0.01 / trial.timeline_variables.ratio)), 0);

    return { 
        earned: isNaN(earned) ? 0 : earned, 
        min: isNaN(min) ? 0 : min, 
        max: isNaN(max) ? 0 : max
    };
};

export {
    shakePiggy,
    updatePiggyTails,
    computeRelativePiggyTasksBonus
}
