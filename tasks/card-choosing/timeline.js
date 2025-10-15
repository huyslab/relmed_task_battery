import { 
  preparePILTInstructions,
  testInstructions,
  WM_instructions
} from './instructions.js';
import { 
  preloadAssets,
  buildCardChoosingTask,
  adjustStimuliPaths,
  buildPostLearningTest
} from './utils.js';
import { PAV_TEST_JSON } from './sequences/trial1_pavlovian_test.js';
import { 
  updateState,
  computeBestRest,
  createPreloadTrial,
  applyWithinTaskResumptionRules, 
  getResumptionState
} from '@utils/index.js';

// MAIN EXPORT FUNCTIONS
/**
 * Main function to run card choosing task
 * @param {Object} settings - Settings object containing task_name and other parameters
 * @returns {Array} Timeline array for the complete task
 */
export function createCardChoosingTimeline(settings) {
  let timeline = [];

  // Add preload trial for assets
  timeline.push(
    createPreloadTrial(preloadAssets(settings), settings.task_name)
  );
  
  // Parse json sequence based on task_name
  let structure, instructions;
  if (settings.task_name === "pilt") {
    structure = typeof PILT_json !== "undefined" ? JSON.parse(PILT_json) : null;
    instructions = preparePILTInstructions(settings);
  } else if (settings.task_name === "wm") {
    structure = typeof WM_json !== "undefined" ? JSON.parse(WM_json) : null;
    instructions = WM_instructions;
  } else {
    return timeline; // Return empty timeline for unknown task
  }

  // Add instructions to timeline
  timeline = timeline.concat(instructions);

  // Compute best-rest outcomes for early stopping
  if (structure != null) {
    computeBestRest(structure);
  }

  // Apply resumption rules if enabled
  const lastState = getResumptionState();
  if (settings.__task?.resumptionRules?.enabled) {
      structure = applyWithinTaskResumptionRules(
          structure, 
          lastState, 
          settings.task_name, 
          settings.__task.resumptionRules
      );
      
      console.log(`Applied resumption rules. ${structure.length} blocks remaining.`);
  }


  // Build and add main task blocks
  if (structure != null) {
    let task_blocks = buildCardChoosingTask(structure, true, settings);

    if (task_blocks.length === 0) {
      console.log("No blocks to add");
      timeline = [];
    } else {
      // Set task start state tracking for first block
      if (settings.task_name === "pilt") {
        task_blocks[0]["on_start"] = () => {
          updateState("pilt_task_start");
        };
      } else if (settings.task_name === "wm") {
        task_blocks[0]["on_start"] = () => {
          if (!(["wk24", "wk28"].includes(settings.session))) {
            updateState("no_resume_10_minutes");
          }
          updateState("wm_task_start");
        };
      }
      timeline = timeline.concat(task_blocks);
    }
  } else {
    timeline = [];
  }
  
  return timeline;
}

/**
 * Main function to run post-learning test phase
 * @param {Object} settings - Settings object containing task_name and test parameters
 * @returns {Array} Timeline array for the test phase
 */
export function createPostLearningTestTimeline(settings) {
  let timeline = [];
  
  // Parse test structure based on task type
  let test_structure;
  if (settings.task_name === "pilt_test") {
    console.log("here")
    test_structure = typeof PILT_test_json !== "undefined" ? JSON.parse(PILT_test_json) : null;
    let pav_test_structure = typeof PAV_TEST_JSON !== "undefined" ? JSON.parse(PAV_TEST_JSON) : null;
    
    // Adjust stimulus paths for main test
    adjustStimuliPaths(test_structure, 'card-choosing/stimuli');
    
    // Process and add pavlovian test if available
    if (pav_test_structure) {
      pav_test_structure.forEach(trial => {
        // Set pavlovian-specific paths and properties
        trial.stimulus_left = `./assets/images/pavlovian-stims/${settings.session}/${trial.stimulus_left}`;
        trial.stimulus_right = `./assets/images/pavlovian-stims/${settings.session}/${trial.stimulus_right}`;
        trial.block = "pavlovian";
        trial.feedback_left = trial.magnitude_left;
        trial.feedback_right = trial.magnitude_right;
        trial.EV_left = trial.magnitude_left;
        trial.EV_right = trial.magnitude_right;
        trial.optimal_right = trial.magnitude_right > trial.magnitude_left;
      });
      
      // Prepend pavlovian test to main test
      test_structure = [pav_test_structure].concat(test_structure);
    }
  } else if (settings.task_name === "wm_test") {
    test_structure = typeof WM_test_json !== "undefined" ? JSON.parse(WM_test_json) : null;
    adjustStimuliPaths(test_structure, 'card-choosing/stimuli');
  } else {
    return timeline; // Return empty timeline for unknown task
  }

  // Build test timeline if structure is valid
  if ((test_structure != null) && (test_structure.length == 1 || test_structure[1] != null)) {
    timeline.push(testInstructions(settings.task_name));
    let test_blocks = buildPostLearningTest(test_structure, settings);
    // Set test start state tracking
    test_blocks[0]["on_start"] = () => {
      updateState(`${settings.task_name}_test_task_start`);
    };
    timeline = timeline.concat(test_blocks);
  }

  return timeline;
}

/**
 * Compute relative performance bonus for card choosing task
 * @returns {Object} Object with earned, min, and max possible scores
 */
export const computeRelativeCardChoosingBonus = () => {
    // Get all relevant trials: card choosing plugin with numeric blocks only
    const trials = jsPsych.data.get().filter({trial_type: "card-choosing"}).filterCustom((trial) => {return typeof trial["block"] === "number"}).values();

    let max_sum = 0;
    let min_sum = 0;

    // Calculate theoretical minimum and maximum possible earnings
    trials.forEach(trial => {
        let feedbacks = [];
        if (trial.n_stimuli === 2) {
            feedbacks = [trial.feedback_left, trial.feedback_right];
        } else if (trial.n_stimuli !== 2) {
            feedbacks = [trial.feedback_left, trial.feedback_right, trial.feedback_middle];
        }
        // Only consider numeric feedbacks for calculations
        feedbacks = feedbacks.filter(f => typeof f === "number" && !isNaN(f));
        if (feedbacks.length > 0) {
            max_sum += Math.max(...feedbacks);
            min_sum += Math.min(...feedbacks);
        }
    });

    // Compute the actual sum of coins
    const earned_sum = jsPsych.data.get().filter({trial_type: "card-choosing"}).filterCustom((trial) => {return typeof trial["block"] === "number"}).select("chosen_feedback").sum();

    return {
        earned: earned_sum, 
        min: min_sum, 
        max: max_sum
    }
}