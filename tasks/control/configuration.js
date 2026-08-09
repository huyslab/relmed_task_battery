/**
 * Creates control task configuration based on session settings
 * @param {Object} settings - Session settings including session type
 * @returns {Object} Configuration object containing rules, thresholds, and naming conventions
 */
const controlConfig = (settings) => {
  return {
    // Base rule: defines island transitions when ships drift due to insufficient fuel
    // Maps current island to destination island following ocean currents
    baseRule: settings.sessionInfo.variant === 'screening'
      ? { 
        i1: "i2",  // Island 1 drifts to Island 2
        i2: "i3",  // Island 2 drifts to Island 3
        i3: "i1",  // Island 3 drifts to Island 1 (circular pattern)
        i4: undefined  // Island 4 not used in screening
      }
      : {
        i1: "i2",  // Full session uses all 4 islands
        i2: "i3",
        i3: "i4", 
        i4: "i1"   // Complete circular drift pattern
      },

    // Control rule: defines each ship's home base island when sufficiently fueled
    controlRule: settings.sessionInfo.variant === 'screening'
      ? {
        red: "i2",      // Red ship's home base
        yellow: undefined,  // Yellow ship not used in screening
        green: "i3",    // Green ship's home base
        blue: "i1"      // Blue ship's home base
      }
      : {
        red: "i2",     // Full session ship-to-island mappings
        yellow: "i3",
        green: "i4",
        blue: "i1"
      },

    // Effort thresholds: minimum key presses needed for different current strengths
    // [weak currents, medium currents, strong currents]
    effort_threshold: [6, 12, 18],

    // Scale factor for fuel requirements (multiplies base thresholds)
    scale: 2,

    // Island naming conventions across different sessions. Keyed by session key, and
    // deliberately kept here rather than in the session registry - it is control's content,
    // not a property of the session. A new session needs an entry added here.
    i1_name: {
      screening: "strawberry",
      wk0: "banana",
      wk2: "apple", 
      wk4: "lime",
      wk24: "raspberry",
      wk28: "peach"
    }
  };
}

// Main session exploration trials: 72 trials with ship choices, locations, and current strengths
// Each trial specifies: left ship, right ship, nearby island, and current strength (1-3)
const EXPLORE_SEQUENCE = [{"left":"blue","right":"yellow","near":"i4","current":1},{"left":"green","right":"yellow","near":"i3","current":1},{"left":"blue","right":"green","near":"i1","current":2},{"left":"yellow","right":"blue","near":"i2","current":2},{"left":"yellow","right":"red","near":"i1","current":3},{"left":"green","right":"yellow","near":"i2","current":1},{"left":"green","right":"blue","near":"i3","current":2},{"left":"blue","right":"green","near":"i3","current":1},{"left":"red","right":"yellow","near":"i1","current":2},{"left":"blue","right":"red","near":"i4","current":2},{"left":"yellow","right":"red","near":"i1","current":1},{"left":"green","right":"red","near":"i3","current":2},{"left":"green","right":"blue","near":"i4","current":1},{"left":"yellow","right":"blue","near":"i1","current":3},{"left":"blue","right":"green","near":"i2","current":3},{"left":"red","right":"yellow","near":"i2","current":2},{"left":"green","right":"yellow","near":"i4","current":1},{"left":"red","right":"yellow","near":"i4","current":1},{"left":"green","right":"blue","near":"i4","current":3},{"left":"yellow","right":"blue","near":"i2","current":3},{"left":"blue","right":"green","near":"i4","current":2},{"left":"blue","right":"red","near":"i3","current":1},{"left":"red","right":"green","near":"i4","current":2},{"left":"green","right":"yellow","near":"i2","current":2},{"left":"yellow","right":"red","near":"i2","current":1},{"left":"red","right":"green","near":"i2","current":2},{"left":"green","right":"red","near":"i3","current":1},{"left":"yellow","right":"green","near":"i4","current":2},{"left":"green","right":"red","near":"i3","current":3},{"left":"blue","right":"yellow","near":"i4","current":3},{"left":"red","right":"blue","near":"i2","current":2},{"left":"yellow","right":"green","near":"i1","current":3},{"left":"blue","right":"yellow","near":"i3","current":3},{"left":"green","right":"blue","near":"i2","current":2},{"left":"red","right":"green","near":"i4","current":1},{"left":"red","right":"blue","near":"i3","current":3},{"left":"red","right":"green","near":"i1","current":2},{"left":"red","right":"yellow","near":"i4","current":2},{"left":"blue","right":"red","near":"i4","current":3},{"left":"green","right":"red","near":"i2","current":1},{"left":"green","right":"yellow","near":"i3","current":2},{"left":"yellow","right":"red","near":"i2","current":3},{"left":"green","right":"yellow","near":"i1","current":1},{"left":"red","right":"blue","near":"i1","current":1},{"left":"blue","right":"yellow","near":"i4","current":2},{"left":"yellow","right":"green","near":"i3","current":3},{"left":"green","right":"red","near":"i4","current":3},{"left":"blue","right":"red","near":"i1","current":2},{"left":"red","right":"yellow","near":"i3","current":1},{"left":"red","right":"green","near":"i1","current":3},{"left":"red","right":"yellow","near":"i3","current":3},{"left":"red","right":"blue","near":"i2","current":1},{"left":"yellow","right":"green","near":"i4","current":3},{"left":"blue","right":"red","near":"i2","current":3},{"left":"red","right":"blue","near":"i3","current":2},{"left":"yellow","right":"blue","near":"i3","current":1},{"left":"green","right":"blue","near":"i3","current":3},{"left":"red","right":"blue","near":"i4","current":1},{"left":"blue","right":"yellow","near":"i1","current":2},{"left":"yellow","right":"blue","near":"i3","current":2},{"left":"yellow","right":"green","near":"i2","current":3},{"left":"green","right":"blue","near":"i2","current":1},{"left":"yellow","right":"green","near":"i1","current":2},{"left":"yellow","right":"red","near":"i3","current":2},{"left":"blue","right":"red","near":"i1","current":3},{"left":"yellow","right":"blue","near":"i1","current":1},{"left":"blue","right":"green","near":"i1","current":3},{"left":"blue","right":"yellow","near":"i2","current":1},{"left":"yellow","right":"red","near":"i4","current":3},{"left":"blue","right":"green","near":"i1","current":1},{"left":"red","right":"green","near":"i1","current":1},{"left":"green","right":"red","near":"i2","current":3}];

// Main session prediction trials: 24 trials asking participants to predict ship home bases
// Each trial specifies which ship color to make predictions about
const PREDICT_SEQUENCE = [{"ship":"red"},{"ship":"yellow"},{"ship":"blue"},{"ship":"green"},{"ship":"yellow"},{"ship":"green"},{"ship":"blue"},{"ship":"red"},{"ship":"green"},{"ship":"blue"},{"ship":"yellow"},{"ship":"red"},{"ship":"green"},{"ship":"blue"},{"ship":"red"},{"ship":"yellow"},{"ship":"blue"},{"ship":"green"},{"ship":"red"},{"ship":"yellow"},{"ship":"yellow"},{"ship":"green"},{"ship":"red"},{"ship":"blue"}];

// Reward phase trials: 24 trials where participants navigate to collect rewards
// Each trial specifies target island, current strength, viable ships, and reward amount
const REWARD_SEQUENCE = [{"target":"i1","near":"i2","left":"red","right":"blue","current":1,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"50p","reward_number":0.5},{"target":"i2","near":"i4","left":"blue","right":"red","current":1,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"£2","reward_number":2.0},{"target":"i1","near":"i2","left":"blue","right":"green","current":1,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"£2","reward_number":2.0},{"target":"i3","near":"i1","left":"red","right":"yellow","current":3,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"£2","reward_number":2.0},{"target":"i4","near":"i1","left":"blue","right":"green","current":3,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"50p","reward_number":0.5},{"target":"i1","near":"i4","left":"blue","right":"green","current":3,"island_viable":true,"left_viable":true,"right_viable":false,"reward_amount":"50p","reward_number":0.5},{"target":"i3","near":"i4","left":"yellow","right":"green","current":2,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"50p","reward_number":0.5},{"target":"i4","near":"i3","left":"green","right":"blue","current":3,"island_viable":true,"left_viable":true,"right_viable":false,"reward_amount":"£2","reward_number":2.0},{"target":"i2","near":"i3","left":"green","right":"red","current":2,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"£2","reward_number":2.0},{"target":"i3","near":"i4","left":"yellow","right":"blue","current":1,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"50p","reward_number":0.5},{"target":"i4","near":"i2","left":"red","right":"green","current":1,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"£2","reward_number":2.0},{"target":"i1","near":"i3","left":"blue","right":"red","current":2,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"£2","reward_number":2.0},{"target":"i2","near":"i1","left":"red","right":"green","current":1,"island_viable":true,"left_viable":true,"right_viable":false,"reward_amount":"50p","reward_number":0.5},{"target":"i4","near":"i2","left":"green","right":"blue","current":1,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"50p","reward_number":0.5},{"target":"i3","near":"i1","left":"green","right":"yellow","current":2,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"£2","reward_number":2.0},{"target":"i2","near":"i1","left":"blue","right":"red","current":3,"island_viable":true,"left_viable":false,"right_viable":true,"reward_amount":"50p","reward_number":0.5},{"target":"i3","near":"i4","left":"blue","right":"yellow","current":1,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"£2","reward_number":2.0},{"target":"i1","near":"i3","left":"green","right":"blue","current":2,"island_viable":false,"left_viable":false,"right_viable":true,"reward_amount":"50p","reward_number":0.5},{"target":"i3","near":"i1","left":"yellow","right":"red","current":3,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"50p","reward_number":0.5},{"target":"i4","near":"i1","left":"green","right":"red","current":2,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"£2","reward_number":2.0},{"target":"i2","near":"i4","left":"red","right":"blue","current":3,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"£2","reward_number":2.0},{"target":"i4","near":"i3","left":"red","right":"green","current":2,"island_viable":true,"left_viable":false,"right_viable":true,"reward_amount":"50p","reward_number":0.5},{"target":"i2","near":"i4","left":"red","right":"green","current":2,"island_viable":false,"left_viable":true,"right_viable":false,"reward_amount":"50p","reward_number":0.5},{"target":"i1","near":"i4","left":"red","right":"blue","current":3,"island_viable":true,"left_viable":false,"right_viable":true,"reward_amount":"£2","reward_number":2.0}];

// Screening session sequences (shorter versions for practice/screening)

// Screening exploration trials: 24 trials using only 3 ships and 3 islands
const EXPLORE_SEQUENCE_SCREENING = [{"left":"green","right":"blue","near":"i1","current":1},{"left":"red","right":"green","near":"i2","current":3},{"left":"green","right":"blue","near":"i3","current":3},{"left":"red","right":"green","near":"i1","current":1},{"left":"blue","right":"green","near":"i3","current":2},{"left":"red","right":"blue","near":"i2","current":1},{"left":"blue","right":"red","near":"i3","current":1},{"left":"green","right":"blue","near":"i1","current":2},{"left":"green","right":"red","near":"i2","current":2},{"left":"green","right":"blue","near":"i2","current":1},{"left":"red","right":"blue","near":"i1","current":1},{"left":"blue","right":"red","near":"i1","current":3},{"left":"blue","right":"green","near":"i3","current":1},{"left":"red","right":"blue","near":"i1","current":2},{"left":"green","right":"red","near":"i3","current":2},{"left":"red","right":"blue","near":"i2","current":3},{"left":"blue","right":"green","near":"i2","current":3},{"left":"red","right":"blue","near":"i3","current":2},{"left":"green","right":"red","near":"i3","current":1},{"left":"red","right":"blue","near":"i3","current":3},{"left":"green","right":"red","near":"i1","current":3},{"left":"blue","right":"green","near":"i2","current":2},{"left":"blue","right":"red","near":"i2","current":2},{"left":"blue","right":"green","near":"i1","current":3}];

// Screening prediction trials: 4 trials testing knowledge of ship home bases
const PREDICT_SEQUENCE_SCREENING = [{"ship":"red"},{"ship":"blue"},{"ship":"green"},{"ship":"red"}];

export { 
  controlConfig, 
  EXPLORE_SEQUENCE, 
  PREDICT_SEQUENCE, 
  REWARD_SEQUENCE, 
  EXPLORE_SEQUENCE_SCREENING, 
  PREDICT_SEQUENCE_SCREENING 
};