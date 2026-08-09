// Mirrors api/utils.js' physical-screen phone threshold. CSS still checks the viewport's
// live orientation, but this threshold decides whether the body gate is enabled at all.
export const GATE_MIN_DIMENSION_THRESHOLD = 500;

export const TASKS = {
  // readySelector must uniquely match the real per-trial stimulus - both tasks reuse markup
  // across instructions/ready/trial screens, so each selector below adds whatever DOM feature
  // only the real trial has (vigour: excludes the instructions wrapper; reversal: requires the
  // coin divs). Keep this in mind if a future task's readySelector needs the same treatment.
  vigour: {
    url: '/examples/vigour.html',
    preferredOrientation: 'portrait',
    rotateMessageSelector: '.rotate-msg-portrait',
    // #piggy-container also appears in the instructions demo (generateInstructStimulus)
    // and the "tap to begin" confirmation screen (startConfirmation) - both wrap it in
    // #instruction-container, which the real per-trial stimulus (generateTrialStimulus)
    // never has. Excluding that is required to land on the actual trial, not instructions.
    readySelector: '.experiment-wrapper:not(:has(#instruction-container)) #piggy-container',
  },
  reversal: {
    url: '/examples/reversal.html',
    preferredOrientation: 'landscape',
    rotateMessageSelector: '.rotate-msg-landscape',
    // .reversal-stimuli also appears in the touch "tap either squirrel to begin" ready
    // screen (task.js touchReadyTrial re-uses the same squirrel markup) - only the real
    // per-trial stimulus (plugin-reversal.js create_stimuli) additionally renders the coin
    // divs, so requiring one of those is what actually pins this to a real trial.
    readySelector: '.reversal-stimuli:has(#rev-coin-left)',
  },
};
