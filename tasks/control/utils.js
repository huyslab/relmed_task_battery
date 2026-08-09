import { 
  controlConfig, 
  EXPLORE_SEQUENCE, 
  PREDICT_SEQUENCE, 
  REWARD_SEQUENCE, 
  EXPLORE_SEQUENCE_SCREENING, 
  PREDICT_SEQUENCE_SCREENING 
} from "./configuration.js"

import { createPreloadTrial, kickOut, fullscreen_prompt, noChoiceWarning, updateState, saveDataREDCap, canBeWarned, updateBonusState } from "@utils/index.js"

/**
 * Creates preload trial for control task assets
 * @param {Object} settings - Task settings including session information
 * @returns {Object} jsPsych preload trial configuration
 */
export const controlPreload = (settings) => {
  // Core control task images used across all sessions
  const image_assets = [
    ...([
      "200p.png",
      "ocean.png",
      "ocean_above.png",
      "simple_island.png",
      "simple_ship_blue.png",
      "simple_ship_green.png",
      "simple_ship_red.png",
      "simple_ship_yellow.png",
      "left.png",
      "fuel.png",
      "scroll.png",
      "icon-reward.png",
      "icon-predict.png",
      "icon-explore.png"
    ].map(s => "./assets/images/control/" + s)),
    // Session-specific island images with different reward types
    ...([
      "simple_island_i1.png", //wk0: banana
      "simple_island_i2.png", //wk0: coconut
      "simple_island_i3.png", //wk0: grape
      "simple_island_i4.png", //wk0: orange
      "island_icon_i1.png",
      "island_icon_i2.png",
      "island_icon_i3.png",
      "island_icon_i4.png"
    ].map(s => "./assets/images/control/session-specific/" + settings.sessionInfo.stimulusSet + "/" + s)),
  ];

  return createPreloadTrial(
    image_assets,
    "control"
  );
} 

// Control rating timeline for measuring sense of agency
const controlRating = (settings) => {
  return {
    timeline: [{
      type: jsPsychHtmlButtonResponse,
      stimulus: `<p><span class="highlight-txt">How <strong>in control</strong> do you feel at this moment?</span></p>`,
      choices: ["1<br>Not at all", "2", "3<br>I don't know", "4", "5<br>Completely in control"],
      trial_duration: 10000,
      post_trial_gap: 400,
      data: {
        trialphase: "control_controllability"
      },
      on_finish: function (data) {
        updateState(`control_trial_${jsPsych.evaluateTimelineVariable('trial')}`, false);

        // Track warnings for participants who don't respond
        if (data.response === null) {
          var up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
          console.log("n_warnings: " + up_to_now);
          jsPsych.data.addProperties({
              n_warnings: up_to_now + 1
          });
        }
      }
    },
    noChoiceWarning("response", "", settings)
  ]
  };
}

/**
 * Creates the main control task timeline with explore, predict, and reward phases
 * @param {Object} settings - Task configuration including session type and response deadlines
 * @returns {Array} Complete jsPsych timeline for the control task
 */
export function createCoreControlTimeline(settings) {

  // Confidence rating after prediction trials (not shown in screening)
  const confidenceRating = {
    timeline: [{
      type: jsPsychHtmlButtonResponse,
      stimulus: `<p><span class="highlight-txt">How <strong>confident</strong> are you that your last choice was correct?</span></p>`,
      choices: ["1<br>Not at all", "2", "3", "4", "5<br>Very confident"],
      trial_duration: 10000,
      post_trial_gap: 400,
      data: {
          trialphase: "control_confidence"
      },
      on_finish: function (data) {
        // Track warnings for non-responses
        if (data.response === null) {
          var up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
          console.log("n_warnings: " + up_to_now);
          jsPsych.data.addProperties({
              n_warnings: up_to_now + 1
          });
        }
      }
    }],
    // Only show confidence rating if participant made a choice and not in screening
    conditional_function: function () {
      const last_trial_choice = jsPsych.data.get().last(1).select('response').values[0];
      return last_trial_choice !== null && settings.sessionInfo.variant !== 'screening';
    }
  };

  // Build exploration phase trials
  const controlExploreTimeline = [];
  (settings.sessionInfo.variant === 'screening' 
    ? EXPLORE_SEQUENCE_SCREENING 
    : EXPLORE_SEQUENCE).forEach(t => {
    controlExploreTimeline.push({
      timeline: [
        kickOut(settings),
        fullscreen_prompt,
        {
          type: jsPsychExploreShip,
          left: jsPsych.timelineVariable('left'),
          right: jsPsych.timelineVariable('right'),
          near: jsPsych.timelineVariable('near'),
          current: jsPsych.timelineVariable('current'),
          // Adaptive response deadline based on warning history
          explore_decision: () => {
            if (canBeWarned(settings, 1)) {
              return settings.default_response_deadline
            } else {
              console.log("No warning will be shown; using long deadline");
              return settings.long_response_deadline
            }
          },
          explore_effort: 3000,
          island_path: `./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}`,
          base_rule: controlConfig(settings).baseRule,
          post_trial_gap: 0,
          save_timeline_variables: true,
          on_start: function (trial) {
            // Add extra time if coming from a rating trial
            const last_trialphase = jsPsych.data.getLastTrialData().values()[0].trialphase;
            if (last_trialphase === "control_confidence" || last_trialphase === "control_controllability") {
              trial.explore_decision += 2000;
            }
          },
          on_finish: function (data) {
            // Count total control trials across all phases
            const n_trials = jsPsych.data.get().filter([{trialphase: "control_explore"}, {trialphase: "control_predict_homebase"}, {trialphase: "control_reward"}]).count();
            data.n_control_trials = n_trials;
            console.log("Trial number: " + n_trials + " (explore)");

            updateState(`control_trial_${jsPsych.evaluateTimelineVariable('trial')}`, false);

            // Save data to REDCap every 24 trials
            if (n_trials % 24 === 0) {
              saveDataREDCap(3);
            }

            // Track non-response warnings
            if (data.response === null) {
              var up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
              jsPsych.data.addProperties({
                  n_warnings: up_to_now + 1
              });
            }
          }
        },
        {
          // Show feedback only if participant made a choice
          timeline: [{
            type: jsPsychExploreShipFeedback,
            feedback_duration: 3000,
            base_rule: controlConfig(settings).baseRule,
            control_rule: controlConfig(settings).controlRule,
            effort_threshold: controlConfig(settings).effort_threshold,
            island_path: `./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}`,
            scale: controlConfig(settings).scale,
            post_trial_gap: 0
          }],
          conditional_function: function () {
            const lastTrialChoice = jsPsych.data.getLastTrialData().values()[0].response;
            return lastTrialChoice !== null;
          }
        },
        noChoiceWarning("response", 
          `<main class="main-stage">
            <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
          </main>`,
          settings
        )
      ],
      timeline_variables: [t]
    });
  });

  // Initialize warning counter for exploration phase
  controlExploreTimeline[0]["on_timeline_start"] = () => {
    updateState(`control_task_start`);
    jsPsych.data.addProperties({
        control_n_warnings: 0
    });
  }

  // Build prediction phase trials
  const controlPredTimeline = [];
  (settings.sessionInfo.variant === 'screening' 
    ? PREDICT_SEQUENCE_SCREENING 
    : PREDICT_SEQUENCE).forEach(t => {
    controlPredTimeline.push({
      timeline: [
        kickOut(settings),
        fullscreen_prompt,
        {
          type: jsPsychPredictHomeBase,
          ship: jsPsych.timelineVariable('ship'),
          // Adaptive response deadline
          predict_decision: () => {
            if (canBeWarned(settings, 1)) {
              return settings.default_response_deadline
            } else {
              console.log("No warning will be shown; using long deadline");
              return settings.long_response_deadline
            }
          },
          // Different island choices for screening vs main sessions
          choices: settings.sessionInfo.variant === 'screening' ? ["i1", "i2", "i3"] : ["i2", "i3", "i4", "i1"],
          post_trial_gap: 0,
          save_timeline_variables: true,
          control_rule: controlConfig(settings).controlRule,
          island_path: `./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}`,
          on_start: function (trial) {
            // Add extra time if coming from feedback
            const last_trialphase = jsPsych.data.getLastTrialData().values()[0].trialphase;
            if (last_trialphase === "control_explore_feedback") {
              trial.predict_decision += 2000;
            }
          },
          on_finish: function (data) {
            const n_trials = jsPsych.data.get().filter([{trialphase: "control_explore"}, {trialphase: "control_predict_homebase"}, {trialphase: "control_reward"}]).count();
            data.n_control_trials = n_trials;
            console.log("Trial number: " + n_trials + " (predict)");

            updateState(`control_trial_${jsPsych.evaluateTimelineVariable('trial')}`, false);

            if (n_trials % 24 === 0) {
              saveDataREDCap(3);
            }

            if (data.response === null) {
              var up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
              console.log("n_warnings: " + up_to_now);
              jsPsych.data.addProperties({
                  n_warnings: up_to_now + 1
              });
            }
          }
        },
        confidenceRating,
        noChoiceWarning("response", '', settings)
      ],
      timeline_variables: [t]
    });
  });


  // Build reward phase trials
  const controlRewardTimeline = [];
  REWARD_SEQUENCE.forEach((t, index) => {
    const timelineItems = [
      kickOut(settings),
      fullscreen_prompt
    ];
    
    // Show prompt explaining reward phase before first trial
    if (index === 0) {
      timelineItems.push({
        type: jsPsychRewardPrompt,
        target: jsPsych.timelineVariable('target'),
        near: jsPsych.timelineVariable('near'),
        left: jsPsych.timelineVariable('left'),
        right: jsPsych.timelineVariable('right'),
        current: jsPsych.timelineVariable('current'),
        reward_amount: jsPsych.timelineVariable('reward_amount'),
        base_rule: controlConfig(settings).baseRule,
        island_path: `./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}`,
        simulation_options: {
          data: {rt: 1100}
        }
      });
    }
    
    timelineItems.push({
      type: jsPsychRewardShip,
      target: jsPsych.timelineVariable('target'),
      near: jsPsych.timelineVariable('near'),
      left: jsPsych.timelineVariable('left'),
      right: jsPsych.timelineVariable('right'),
      current: jsPsych.timelineVariable('current'),
      reward_amount: jsPsych.timelineVariable('reward_amount'),
      reward_number: jsPsych.timelineVariable('reward_number'),
      base_rule: controlConfig(settings).baseRule,
      control_rule: controlConfig(settings).controlRule,
      effort_threshold: controlConfig(settings).effort_threshold,
      scale: controlConfig(settings).scale,
      island_path: `./assets/images/control/session-specific/${settings.sessionInfo.stimulusSet}`,
      reward_decision: () => {
        if (canBeWarned(settings, 1)) {
            return settings.default_response_deadline
        } else {
          console.log("No warning will be shown; using long deadline");
            return settings.long_response_deadline
        }
      },
      post_trial_gap: 0,
      save_timeline_variables: true,
      on_finish: function (data) {
        const n_trials = jsPsych.data.get().filter([{trialphase: "control_explore"}, {trialphase: "control_predict_homebase"}, {trialphase: "control_reward"}]).count();
        data.n_control_trials = n_trials;
        console.log("Trial number: " + n_trials + " (reward)");

        updateState(`control_trial_${jsPsych.evaluateTimelineVariable('trial')}`, false);

        updateBonusState(settings);

        if (n_trials % 24 === 0) {
          saveDataREDCap(3);
        }

        if (data.response === null) {
          var up_to_now = parseInt(jsPsych.data.get().last(1).select('n_warnings').values);
          console.log("n_warnings: " + up_to_now);
          jsPsych.data.addProperties({
              n_warnings: up_to_now + 1
          });
        }
      }
    });
    
    timelineItems.push(
      noChoiceWarning("response",
        `<main class="main-stage">
          <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
        </main>`,
        settings
      )
    );
    
    // Add brief inter-trial interval with ocean background
    timelineItems.push({
      timeline: [{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <main class="main-stage">
              <img class="background" src="./assets/images/control/ocean.png" alt="Background"/>
        </main>
      `,
      trial_duration: 400,
      choices: ["NO_KEYS"]
      }],
      conditional_function: function () {
        const lastTrialChoice = jsPsych.data.getLastTrialData().values()[0].response;
        return lastTrialChoice !== null;
      }
    });
    
    controlRewardTimeline.push({
      timeline: timelineItems,
      timeline_variables: [t]
    });
  });

  // Initialize reward phase
  controlRewardTimeline[0]["on_timeline_start"] = () => {
    updateState(`control_reward_start`);
    jsPsych.data.addProperties({
        control_n_warnings: 0
    });
  }

  // Final reveal of ship-homebase mappings (for learning validation)
  const controlHomebaseReveal = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      // Create table showing which ship belongs to which island
      let html = `
        <main class="main-stage">
          <img class="background" src="./assets/images/control/ocean_above.png" alt="Background"/>
          <div class="instruction-dialog" style="bottom:unset;">
            <div class="instruction-content" style="font-size: 24px; text-align: center;">
              <h3>Well done!</h3>
              <p>In case you're curious, this was the home base for each ship in today's session:</p>
              <table style="margin: auto; border-collapse: separate; border-spacing: 20px 0px;">
                <tbody>`;
      
      // Show mapping for each ship with a defined homebase
      const shipColors = ["blue", "green", "red", "yellow"];
      shipColors.forEach(color => {
        const homebase = controlConfig(settings).controlRule[color];
        if (homebase) { // Only show ships with defined homebases
          html += `
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <img src="./assets/images/control/simple_ship_${color}.png" alt="${color} ship" style="height: 80px;">
              </td>
              <td style="text-align: center; vertical-align: middle; padding: 0 15px;">
                <div style="font-size: 32px;">→</div>
              </td>
              <td style="text-align: left; vertical-align: middle;">
                <img src="./assets/images/control/Control_stims/${settings.sessionInfo.stimulusSet}/island_icon_${homebase}.png" alt="Island ${homebase}" style="height: 100px;">
              </td>
            </tr>`;
        }
      });
      
      html += `
                </tbody>
              </table>
              <p>Thank you for playing the game!</p>
              <p>You may now press any key to continue.</p>
            </div>
          </div>
        </main>`;
      
      return html;
    },
    choices: "ALL_KEYS",
    response_ends_trial: true,
    post_trial_gap: 400,
    data: { 
      trialphase: 'control_reveal'}
  };

  // Assemble the complete timeline based on session type
  let controlTimeline = [];

  if (settings.sessionInfo.variant === 'screening') {
    // Screening: simpler structure with fewer prediction trials
    let trial = 1;
    for (let i = 0; i < EXPLORE_SEQUENCE_SCREENING.length; i++) {
      controlExploreTimeline[i].timeline_variables[0].trial = trial++;
      controlTimeline.push(controlExploreTimeline[i]);
      // Add prediction trial every 6 exploration trials
      if ((i + 1) % 6 === 0) {
        const num_miniblock = Math.floor(i / 6);
        controlPredTimeline[num_miniblock].timeline_variables[0].trial = trial++;
        controlTimeline.push(controlPredTimeline[num_miniblock]);
      }
    }
  } else {
    // Main sessions: alternating blocks of exploration/prediction and controllability ratings
    let trial = 1;
    let pred_trials = [];
    
    // Exploration phase with interleaved prediction trials and control ratings
    for (let i = 0; i < EXPLORE_SEQUENCE.length; i++) {
      controlExploreTimeline[i].timeline_variables[0].trial = trial++;
      controlTimeline.push(controlExploreTimeline[i]);
      
      // Every 6 trials, add either prediction trials or control rating
      if ((i + 1) % 6 === 0) {
        const num_miniblock = Math.floor(i / 6);
        if (num_miniblock % 2 === 0) {
          // Even miniblocks: add prediction trials
          const indx = [0, 4].map(num => num + num_miniblock / 2 * 4);
          pred_trials = controlPredTimeline.slice(indx[0], indx[1]);
          pred_trials.forEach(t => {
            t.timeline_variables[0].trial = trial++;
          });
          controlTimeline.push(...pred_trials);
        } else {
          // Odd miniblocks: add control rating
          controlTimeline.push({
            ...controlRating(settings),
            timeline_variables: [{trial: trial++}]
          });
        }
      }
    }
    
    // Add reward phase as separate block
    controlRewardTimeline.forEach((t, index) => {
      t.timeline_variables[0].trial = trial++;
    });
    controlTimeline.push(...controlRewardTimeline);
  }

  // Resume from last completed trial if applicable
  if (typeof window.last_state !== "undefined" && window.last_state.includes("control_trial_")) {
    const last_trial = parseInt(window.last_state.split("_")[2]);
    controlTimeline = controlTimeline.slice(last_trial);
  }

  return controlTimeline;
}

/**
 * Computes participant's bonus payment based on reward trial performance
 * @returns {Object} Object with earned, minimum, and maximum possible coins
 */
export const computeRelativeControlBonus = () => {
  // Calculate total coins earned in reward trials
  const earned_sum = jsPsych.data.get().filter({ trialphase: 'control_reward' }).select('reward').sum();
  const min_sum = 0; // Minimum possible (no rewards earned)
  // Maximum possible based on reward amounts available in trials
  const max_sum = jsPsych.data.get().filter({trialphase: 'control_reward'}).select('timeline_variables').values.reduce((sum, value) => sum + value.reward_number, 0);
  
  return {
      earned: earned_sum,
      min: min_sum,
      max: max_sum
  }
}
