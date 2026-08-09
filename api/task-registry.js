// api/task-registry.js
// This module defines a registry for tasks in the API, allowing for easy management and execution of tasks.

import { computeRelativeCardChoosingBonus, createCardChoosingTimeline, createPostLearningTestTimeline } from '@tasks/card-choosing/index.js';
import { createDelayDiscountingTimeline } from '@tasks/delay-discounting/index.js';
import { createMaxPressTimeline } from '@tasks/max-press-test/task.js';
import { createVigourTimeline, computeRelativePiggyTasksBonus, createPITTimeline, createVigourTestTimeline } from '@tasks/piggy-banks/index.js';
import { createPavlovianLotteryTimeline } from '@tasks/pavlovian-lottery/task.js';
import { createControlTimeline, computeRelativeControlBonus } from '@tasks/control/index.js';
import { createOpenTextTimeline } from '@tasks/open-text/index.js';
import { createReversalTimeline, computeRelativeReversalBonus } from '@tasks/reversal/index.js';
import { createAcceptabilityTimeline } from '@tasks/acceptability-judgment/index.js';

export const TaskRegistry = {
  PILT: {
    name: 'PILT',
    description: 'A task measuring probabilistic instrumental learning in a card choosing scenario',
    createTimeline: createCardChoosingTimeline,
    computeBonus: computeRelativeCardChoosingBonus,
    defaultConfig: {
        task_name: "pilt",
        n_choices: 2,
        valence: "mixed",
        present_pavlovian: true,
        include_instructions: true,
        session: 'wk0'
    },
    sequences: {
        screening: '@tasks/card-choosing/sequences/PILT/trial1_screening.js',
        wk0: '@tasks/card-choosing/sequences/PILT/trial1_wk0.js',
        wk2: '@tasks/card-choosing/sequences/PILT/trial1_wk2.js',
        wk4: '@tasks/card-choosing/sequences/PILT/trial1_wk4.js',
        wk24: '@tasks/card-choosing/sequences/PILT/trial1_wk24.js',
        wk28: '@tasks/card-choosing/sequences/PILT/trial1_wk28.js',
    },
    requirements: {
      css: ['@tasks/card-choosing/styles.css'],
    },
    resumptionRules: {
        enabled: true,
        granularity: 'block', // or 'trial' for finer control
        statePattern: (taskName) => `${taskName}_block_(\\d+)_start`,
        extractProgress: (lastState, taskName) => {
            const match = lastState.match(new RegExp(`${taskName}_block_(\\d+)_start`));
            return match ? parseInt(match[1]) : 0;
        }
    },
    configOptions: {
        task_name: "The name of the task being tested. Default is 'pilt'.",
        n_choices: "Number of choice options presented. Default is 2.",
        valence: "Valence of the stimuli - can be 'both' (includes both punishment and reward blocks), 'mixed' (includes mixed valence blocks), 'punishment', or 'reward'. Default is 'mixed'.",
        present_pavlovian: "Whether to present stimuli for pavlovian conditioning along with trial outcomes. Default is true.",
        include_instructions: "Whether to show instructions before the task. Default is true.",
        session: "Session identifier to govern session-specific behaviour. Default is 'wk0'. Should be deprecated, with settings exposed."
    }
  },
  WM: {
    name: 'WM',
    description: 'Anne Collins\'s RLWM task',
    createTimeline: createCardChoosingTimeline,
    computeBonus: computeRelativeCardChoosingBonus,
    defaultConfig: {
        task_name: "wm",
        n_choices: 3,
        valence: "reward",
        present_pavlovian: false,
        include_instructions: true,
        session: 'wk0'
    },
    sequences: {
        wk0: '@tasks/card-choosing/sequences/WM/trial1_wk0.js',
        wk2: '@tasks/card-choosing/sequences/WM/trial1_wk2.js',
        wk4: '@tasks/card-choosing/sequences/WM/trial1_wk4.js',
        wk24: '@tasks/card-choosing/sequences/WM/trial1_wk24.js',
        wk28: '@tasks/card-choosing/sequences/WM/trial1_wk28.js',
    },
    requirements: {
      css: ['@tasks/card-choosing/styles.css'],
    },
    resumptionRules: {
        enabled: true,
        granularity: 'block', // or 'trial' for finer control
        statePattern: (taskName) => `${taskName}_block_(\\d+)_start`,
        extractProgress: (lastState, taskName) => {
            const match = lastState.match(new RegExp(`${taskName}_block_(\\d+)_start`));
            return match ? parseInt(match[1]) : 0;
        }
    },
    configOptions: {
        task_name: "The name of the task being tested. Default is 'pilt'.",
        n_choices: "Number of choice options presented. Default is 2.",
        valence: "Valence of the stimuli - can be 'both' (includes both punishment and reward blocks), 'mixed' (includes mixed valence blocks), 'punishment', or 'reward'. Default is 'mixed'.",
        present_pavlovian: "Whether to present stimuli for pavlovian conditioning along with trial outcomes. Default is true.",
        include_instructions: "Whether to show instructions before the task. Default is true.",
        session: "Session identifier to govern session-specific behaviour. Default is 'wk0'. Should be deprecated, with settings exposed."
    }
  },
  post_PILT_test: {
    name: 'Post PILT Test',
    description: 'A test phase that evaluates learning performance in notional extinction after completing the PILT task',
    createTimeline: createPostLearningTestTimeline,
    defaultConfig: {
        task_name: "pilt_test",
        test_confidence_every: 4,
        session: 'wk0'
    },
    requirements: {
      css: ['@tasks/card-choosing/styles.css'],
    },
    sequences: {
      wk0: '@tasks/card-choosing/sequences/PILT-test/trial1_wk0.js',
      wk2: '@tasks/card-choosing/sequences/PILT-test/trial1_wk2.js',
      wk4: '@tasks/card-choosing/sequences/PILT-test/trial1_wk4.js',
      wk24: '@tasks/card-choosing/sequences/PILT-test/trial1_wk24.js',
      wk28: '@tasks/card-choosing/sequences/PILT-test/trial1_wk28.js',
    },
    resumptionRules: {
      enabled: true
    },
    configOptions: {
        task_name: "The name of the test phase - can be 'pilt_test' or 'wm_test'. Default is 'pilt_test'.",
        test_confidence_every: "How often (in trials) to elicit confidence ratings in the test phase. Default is every 4 trials.",
    }
  },
  post_WM_test: {
    name: 'Post WM Task Test',
    description: 'A test phase that evaluates learning performance in notional extinction after completing the RLWM task',
    createTimeline: createPostLearningTestTimeline,
    defaultConfig: {
        task_name: "wm_test",
        test_confidence_every: 4,
        session: 'wk0'
    },
    requirements: {
      css: ['@tasks/card-choosing/styles.css'],
    },
    sequences: {
      wk0: '@tasks/card-choosing/sequences/WM-test/trial1_wk0.js',
      wk2: '@tasks/card-choosing/sequences/WM-test/trial1_wk2.js',
      wk4: '@tasks/card-choosing/sequences/WM-test/trial1_wk4.js',
      wk24: '@tasks/card-choosing/sequences/WM-test/trial1_wk24.js',
      wk28: '@tasks/card-choosing/sequences/WM-test/trial1_wk28.js',
    },
    resumptionRules: {
      enabled: true
    },
    configOptions: {
        task_name: "The name of the test phase - can be 'pilt_test' or 'wm_test'. Default is 'wm_test'.",
        test_confidence_every: "How often (in trials) to elicit confidence ratings in the test phase. Default is every 4 trials.",
    }
  },
  vigour_test: {
    name: 'Vigour Test',
    description: 'A test of knowledge of the stimulus-reward contingencies in the vigour task',
    createTimeline: createVigourTestTimeline,
    computeBonus: () => 0, // No bonus computation for this task
    defaultConfig: {
    },
    requirements: {
      css: ['@tasks/piggy-banks/styles.css'],
    },
    resumptionRules: {
      enabled: true
    },
    configOptions: {
    }
  },
  reversal: {
    name: 'reversal',
    description: 'A task measuring probabilistic instrumental reversal learning, using a two squirrel cover story.',
    createTimeline: createReversalTimeline,
    computeBonus: computeRelativeReversalBonus,
    defaultConfig: {
      task_name: "reversal",
      n_trials: 150,
      session: 'wk0',
      preferredOrientation: "landscape",
      pauseTimelineOnWrongOrientation: true
    },
    sequences: {
        screening: '@tasks/reversal/sequences/trial1_screening.js',
        wk0: '@tasks/reversal/sequences/trial1_wk0.js',
        wk2: '@tasks/reversal/sequences/trial1_wk2.js',
        wk4: '@tasks/reversal/sequences/trial1_wk4.js',
        wk24: '@tasks/reversal/sequences/trial1_wk24.js',
        wk28: '@tasks/reversal/sequences/trial1_wk28.js',
    },
    requirements: {
      css: ['@tasks/reversal/styles.css'],
    },
    resumptionRules: {
        enabled: true
    },
    configOptions: {
        task_name: "The name of the task as it would appear in the bonus object. Default is 'reversal'.",
        n_trials: "Total number of trials in the reversal task. Default is 150.",
        session: "Session identifier to govern session-specific behaviour. Default is 'wk0'. Should be deprecated, with settings exposed.",
        preferredOrientation: "Preferred device orientation on phones ('portrait' or 'landscape'). On a phone held in the other orientation, a 'please rotate' overlay blocks the task until it is rotated; tablets and desktop are exempt. Default is 'landscape' for reversal.",
        pauseTimelineOnWrongOrientation: "Whether the timeline should wait before starting the next trial while the phone is held in the wrong orientation. The active trial and its response deadline continue running. Default is true for reversal."
    }
  },
  delay_discounting: {
    name: 'Delay Discounting Task',
    description: 'Measure preferences for smaller-sooner vs larger-later monetary rewards',
    createTimeline: createDelayDiscountingTimeline,
    computeBonus: () => 0, // No bonus computation for this task
    defaultConfig: {
      default_response_deadline: 4000,
      long_response_deadline: 6000,
    },
    requirements: {
      css: ['@tasks/delay-discounting/styles.css'],
    },
    resumptionRules: {
        enabled: true,
    },
    configOptions: {
        default_response_deadline: "Default response deadline in milliseconds. Default is 4000 (4 seconds).",
        long_response_deadline: "Extended response deadline in milliseconds for trials where no deadline warning is displayed. This allows a softer regime for participant populations who need it. Default is 6000 (6 seconds)."
    }
  },
  vigour: {
    name: 'Vigour Task',
    description: 'A task measuring instrumental action vigour as a function of reward rate',
    createTimeline: createVigourTimeline,
    computeBonus: () => computeRelativePiggyTasksBonus('vigour_trial'), 
    defaultConfig: {
      task_name: "vigour",
      preferredOrientation: "portrait",
    },
    configOptions: {
      task_name: "The name of the task as it would appear in the bonus object. Default is 'vigour'.",
      preferredOrientation: "Preferred device orientation on phones ('portrait' or 'landscape'). On a phone held in the other orientation, a 'please rotate' overlay blocks the task until it is rotated; tablets and desktop are exempt. Default is 'portrait' for vigour."
    },
    requirements: {
      css: ['@tasks/piggy-banks/styles.css'],
    },
    resumptionRules: {
        enabled: true,
    }
  },
  PIT: {
    name: 'Pavlovian-Instrumental Transfer Task',
    description: 'A task measuring instrumental action vigour in notional extinction, as a function of instrumental reward rate and Pavlovian cues',
    createTimeline: createPITTimeline,
    computeBonus: () => computeRelativePiggyTasksBonus('pit_trial'),
    defaultConfig: {
      task_name: "PIT",
    },
    configOptions: {
      task_name: "The name of the task as it would appear in the bonus object. Default is 'PIT'."
    },
    requirements: {
      css: ['@tasks/piggy-banks/styles.css'],
    },
    resumptionRules: {
        enabled: true,
    }
  },
  control: {
    name: 'Control Task',
    description: 'Measure control-seeking, information-seeking, and reward-seeking behaviour',
    createTimeline: createControlTimeline,
    computeBonus: computeRelativeControlBonus,
    defaultConfig: {
      session: "wk0",
      max_instruction_fails: 3,
      default_response_deadline: 4000,
      long_response_deadline: 6000,
      task_name: "control",
      warning_expected_n_back: 2
    },
    requirements: {
      css: ['@tasks/control/styles.css'],
    },
    resumptionRules: {
        enabled: true,
    },
    configOptions: {
        session: "Session identifier to govern session-specific behaviour and select stimuli. Default is 'wk0'.",
        max_instruction_fails: "Maximum number of instruction quiz failures allowed before continuing to the task. Default is 3.",
        default_response_deadline: "Default response deadline in milliseconds. Default is 4000 (4 seconds).",
        long_response_deadline: "Extended response deadline in milliseconds for trials where no deadline warning is displayed. This allows a softer regime for participant populations who need it. Default is 6000 (6 seconds).",
        task_name: "The name of the task as it would appear in the bonus object, and for monitoring warnings. Default is 'control'.",
        warning_expected_n_back: "How many jsPsych trials back to check for the previous deadline warning. Default is 2."
    }
  },
  max_press_test: {
    name: 'Max Press Test',
    description: 'A test of maximum key press speed',
    createTimeline: createMaxPressTimeline,
    computeBonus: () => 0, // No bonus computation for this task
    defaultConfig: {
      duration: 7000,  
      validKey: 'j',
      minSpeed: 3.0 
    },
    configOptions: {
        duration: "Duration of the max press test in milliseconds. Default is 7000 (7 seconds).",
        validKey: "The key that participants should press during the test. Default is 'j'.",
        minSpeed: "Minimum speed in presses per second required to pass the test. Default is 3.0, which was the 5th percentile in pilots 7 & 8."
    },
    requirements: {
      css: ['@tasks/max-press-test/styles.css'],
    },
    resumptionRules: {
        enabled: true,
    }
  },
  pavlovian_lottery: {
    name: 'Pavlovian Conditioning Lottery',
    description: 'A lottery task for conditioning Pavlovian associations between visual cues and monetary rewards',
    createTimeline: createPavlovianLotteryTimeline,
    computeBonus: () => 0, // No bonus computation for this task
    defaultConfig: {
      initial_movement_delay: 50,
      reel_spin_duration: 1500,
      winning_highlight_delay: 450,
      max_result_display_time: 4000,
      continue_message_delay: 1500,
      session: "wk0"
    },
    configOptions: {
        initial_movement_delay: "Initial delay before the slot reel starts moving, in milliseconds. Default is 50.",
        reel_spin_duration: "Duration for which the slot reel spins, in milliseconds. Default is 1500.",
        winning_highlight_delay: "Delay before highlighting the winning outcome, in milliseconds. Default is 450.",
        max_result_display_time: "Maximum time to display the result before automatically continuing, in milliseconds. Default is 4000.",
        continue_message_delay: "Delay before showing the 'Press any key to continue' message, in milliseconds. Default is 1500.",
        session: "Session identifier to select the appropriate stimulus set. Default is 'wk0'.",
    },
    requirements: {
      css: ['@tasks/pavlovian-lottery/styles.css'],
    },
    resumptionRules: {
        enabled: true,
    }
  },
  open_text: {
    name: 'Open Text Questions',
    description: 'A task for answering open text questions',
    createTimeline: createOpenTextTimeline,
    computeBonus: () => 0, // No bonus computation for this task
    defaultConfig: {
      min_words: 30,
      prevent_paste: true,
      writing_time: 120,
      warning_time: 90,
      qs_read_time: 7,
      oq_timelimit_text: 'two minutes',
      no_skip: true,
      timeout_alert_duration: 4,
      max_timeout: 5,
      warning_text: `Didn't catch a response - moving on.`
    },
    configOptions: {
      min_words: "Minimum number of words required for each response. Default is 30.",
      prevent_paste: "Whether to prevent pasting text into the response box. Default is true.",
      writing_time: "Time in seconds allocated for writing each response. Default is 120 seconds.",
      warning_time: "Time in seconds before the end of writing time to display a warning. Default is 90 seconds.",
      qs_read_time: "Extra time in seconds allocated to read  the question before writing time starts. Default is 7 seconds.", 
      oq_timelimit_text: "Text to display indicating the time limit for answering each question. Default is 'two minutes'.",
      no_skip: "Whether to prevent skipping questions if no response is given or time runs out. Default is true.",
      timeout_alert_duration: "Duration in seconds of the timeout/empty response alert. Default is 4 seconds.",
      max_timeout: "Maximum number of timeouts or empty responses allowed before the participant is asked to return their submission. Default is 5.",
      warning_text: "Text to display when a response is not captured before moving on. Default is `Didn't catch a response - moving on.`"
    },
    requirements: {
      css: ['@tasks/open-text/styles.css'],
    },
    resumptionRules: {
        enabled: true,
    }
  },
  acceptability_judgment: {
    name: 'Acceptability Judgment',
    description: 'Measure participant acceptability of a preceding task',
    createTimeline: createAcceptabilityTimeline,
    computeBonus: () => 0, // No bonus computation for this task
    defaultConfig: {
      task_name: "task",
      game_description: "game you have just completed"
    },
    configOptions: {
      task_name: "Short identifier for the task (used in data field names). Default is 'task'.",
      game_description: "Human-readable description of the game/task. Default is 'game you have just completed'."
    },
    resumptionRules: {
        enabled: false,
    }
  }
};

// Global settings that apply to all tasks unless overridden
export const globalConfig = {
    max_warnings_per_task: 3, 
    warning_expected_n_back: 1,
    default_response_deadline: 4000,
    long_response_deadline: 6000,
    interimWarning: 5,
    finalWarning: 15
}

export const globalConfigOptions = {
    max_warnings_per_task: "Maximum number of deadline warnings allowed per task. Default is 3.",
    warning_expected_n_back: "How many jsPsych trials back to check for the previous deadline warning. Default is 1.",
    default_response_deadline: "Default response deadline in milliseconds. Default is 4000.",
    long_response_deadline: "Long response deadline in milliseconds. Default is 6000.",
    interimWarning: "Show message about abiding by instructions after participant receives this many warnings in a task. Default is 5.",
    finalWarning: "Show message about abiding by instructions after participant receives this many warnings in a task. Default is 15."
}
