var jsPsychReversal = (function (jspsych) {
    "use strict";

    const info = {
        name: "reversal",
        version: "0.1.3",
        parameters: {
            /** Value of left-hand side feedback */
            feedback_left: {
                type: jspsych.ParameterType.FLOAT,
                default: undefined,
            },
            /** Value of right-hand side feedback */
            feedback_right: {
                type: jspsych.ParameterType.FLOAT,
                default: undefined,
            },
            /** Whether right-hand side squirrel is optimal */
            optimal_right: {
                type: jspsych.ParameterType.BOOL,
                default: undefined
            },
            choices: {
                type: jspsych.ParameterType.KEYS,
                default: ['arrowleft', 'arrowright'],
            },
            /** Coin image filenames */
            coin_images: {
                type: jspsych.ParameterType.OBJECT,
                default: {
                    0.01: "1penny.png",
                    1.0: "1pound.png"
                },
            },
            /** Duration of coin toss animation in ms */
            animation_duration: {
                type: jspsych.ParameterType.INT,
                default: 1350
            },
            /** Response deadline */
            response_deadline: {
                type: jspsych.ParameterType.INT,
                default: 3500
            },
            /** Duration of warning message */
            warning_duration: {
                type: jspsych.ParameterType.INT,
                default: 1500
            },
            /** Whether to show response deadline warning */
            show_warning: {
                type: jspsych.ParameterType.BOOL,
                default: true
            },
            /** ITI */
            ITI: {
                type: jspsych.ParameterType.INT,
                default: 300
            },
            images_path: {
                type: jspsych.ParameterType.STRING,
                default: './assets/images/reversal/'
            }
        },
        data: {
            /** Value of left-hand side feedback. */
            feedback_left: {
                type: jspsych.ParameterType.FLOAT,
            },
            /** Value of right-hand side feedback. */
            feedback_right: {
                type: jspsych.ParameterType.FLOAT,
            },
            /** The participants' response (left or right) */
            response: {
                type: jspsych.ParameterType.STRING
            },
            /** Reaction time */
            rt: {
                type: jspsych.ParameterType.INT
            },
            /** Presented feedback */
            chosen_feedback: {
                type: jspsych.ParameterType.FLOAT
            },
            /** Whether optimal option chosen */
            response_optimal: {
                type: jspsych.ParameterType.BOOL
            },
            /** Input modality used for the response (touch, mouse, pen, keyboard, or null) */
            pointer_type: {
                type: jspsych.ParameterType.STRING
            },
            /** Whether device was held in the non-preferred orientation at any point during trial */
            wrong_orientation: {
                type: jspsych.ParameterType.BOOL
            },
            /** Array of ms offsets from trial onset for each entry into wrong orientation */
            wrong_orientation_times: {
                type: jspsych.ParameterType.ARRAY
            },
            /** Viewport width at trial onset (px) */
            viewport_width: {
                type: jspsych.ParameterType.INT
            },
            /** Viewport height at trial onset (px) */
            viewport_height: {
                type: jspsych.ParameterType.INT
            },
            /** Whether viewport geometry changed (resize/orientationchange) during trial */
            viewport_changed: {
                type: jspsych.ParameterType.BOOL
            }
        },
    };

  /**
   * **reversal**
   *
   * jsPsych plugin to display a reversal learning task trial, with two squirrels in a forest,
   * a choice of one of the results in the squirrel tossing a coin.
   * Supports touch/pointer input (tap left or right squirrel) and keyboard (arrow left / arrow right).
   *
   * @author {Yaniv Abir}
   */
    class ReversalPlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
            this.keys = {
                'arrowleft': 'left',
                'arrowright': 'right',
            };
        }

        // Trial procedure
        trial(display_element, trial) {

            // Placeholder for response data
            var response = {
                rt: null,
                key: null,
                response_deadline_warning: false,
                pointer_type: null
            };

            // Check whether in simulation mode
            var simulating = window.simulating || false;

            // Single timestamp for both RT computation and orientation-offset tracking
            var trialOnset = performance.now();

            // Viewport geometry at trial onset
            var viewportWidth = window.innerWidth;
            var viewportHeight = window.innerHeight;
            var viewportChanged = false;

            // Orientation tracking — cache the rotate-overlay element for resize checks
            var rotateOverlay = document.getElementById('rotate-overlay');
            var isRotateGateVisible = function () {
                return !!rotateOverlay && getComputedStyle(rotateOverlay).display !== 'none';
            };
            var gateVisible = isRotateGateVisible();
            var wrongOrientation = false;
            var wrongOrientationTimes = [];
            if (gateVisible) {
                wrongOrientation = true;
                wrongOrientationTimes.push(0);  // offset from trial onset is 0
            }

            var syncGateState = function () {
                var now = performance.now();
                var nowVisible = isRotateGateVisible();
                if (nowVisible && !gateVisible) {
                    wrongOrientation = true;
                    wrongOrientationTimes.push(Math.round(now - trialOnset));
                }
                gateVisible = nowVisible;
            };

            // Create stimuli. Reveal is handled below: synchronously when images are already
            // loaded (the normal case after preload — no blank frame), or after img.decode()
            // when they are not yet ready (slow/uncached load — avoids Safari half-paint flash).
            display_element.innerHTML = this.create_stimuli(trial);
            var stimuliEl = display_element.querySelector('.reversal-stimuli');

            // --- Handler & cleanup declarations (must precede cleanupAll) ---

            // Pointer tap handlers for left/right tap zones
            var leftTapHandler = null;
            var rightTapHandler = null;
            var suppressContextMenu = null;
            var resizeHandler = null;
            var resizeFrame = null;
            var responseDeadlineTimeout = null;

            // Whether the stimulus is actually on screen. Input listeners are attached before
            // the reveal, and on the slow-image path the stimulus sits at opacity 0 until
            // img.decode() resolves - an opacity-0 element still takes taps, and the keyboard
            // listener never depended on visibility at all. Responses are ignored until this
            // turns true, so nothing is answered against a screen the participant cannot see.
            var revealed = false;

            // Collect all active DOM references for cleanup
            var tapLeft = document.getElementById('rev-tap-left');
            var tapRight = document.getElementById('rev-tap-right');

            // Unified cleanup: removes all listeners and cancels stray keyboard responses.
            var cleaned = false;
            var cleanupAll = () => {
                if (cleaned) return;
                cleaned = true;

                if (tapLeft && leftTapHandler) {
                    tapLeft.removeEventListener('pointerdown', leftTapHandler);
                }
                if (tapRight && rightTapHandler) {
                    tapRight.removeEventListener('pointerdown', rightTapHandler);
                }
                if (tapLeft && suppressContextMenu) {
                    tapLeft.removeEventListener('contextmenu', suppressContextMenu);
                }
                if (tapRight && suppressContextMenu) {
                    tapRight.removeEventListener('contextmenu', suppressContextMenu);
                }
                if (resizeHandler) {
                    window.removeEventListener('resize', resizeHandler);
                    window.removeEventListener('orientationchange', resizeHandler);
                }
                if (resizeFrame !== null) {
                    cancelAnimationFrame(resizeFrame);
                    resizeFrame = null;
                }
                this.jsPsych.pluginAPI.cancelAllKeyboardResponses();
            };

            // Trial end procedure
            var finished = false;
            var end_trial = () => {
                // finishTrial twice would write the trial's data row twice and advance the
                // timeline an extra step, silently skipping a trial.
                if (finished) return;
                finished = true;

                cleanupAll();

                // Build trial data
                var trial_data = {
                    feedback_left: trial.feedback_left,
                    feedback_right: trial.feedback_right,
                    optimal_right: trial.optimal_right,
                    response_deadline_warning: response.response_deadline_warning,
                    rt: response.rt,
                    response: response.key,
                    pointer_type: response.pointer_type,
                    wrong_orientation: wrongOrientation,
                    wrong_orientation_times: wrongOrientationTimes,
                    viewport_width: viewportWidth,
                    viewport_height: viewportHeight,
                    viewport_changed: viewportChanged
                };

                // Compute optimality and presented feedback
                if (trial_data.response == null) {
                    trial_data.response_optimal = null;
                    // If response was missed, set feedback to minimal for bonus computation
                    trial_data.chosen_feedback = Math.min(trial.feedback_right, trial.feedback_left);
                } else {
                    trial_data.response_optimal = trial.optimal_right ? trial_data.response == "right" : trial_data.response == "left";
                    trial_data.chosen_feedback = trial_data.response == "right" ? trial.feedback_right : trial.feedback_left;
                }

                // Tell jsPsych to finish trial and pass data
                this.jsPsych.finishTrial(trial_data);
            };

            // ITI blur
            var ITI = () => {
                cleanupAll();

                var bg = document.getElementById('rev-squirrel-bg');
                var fg = document.getElementById('rev-squirrel-fg');

                bg.animate([
                    { filter: "blur(0)", opacity: "1" },
                    { filter: "blur(2px)", opacity: "0" },
                ], { duration: 50, iterations: 1, fill: 'forwards' });

                fg.style.opacity = '0';

                var coin_right = document.getElementById("rev-coin-right");
                var coin_left = document.getElementById("rev-coin-left");

                coin_right.style.opacity = '0';
                coin_left.style.opacity = '0';

                this.jsPsych.pluginAPI.setTimeout(end_trial, simulating ? 20 : trial.ITI);
            };

            // Post response procedure — accepts (side, pointerType) from pointer or keyboard.
            // Ignore input while the rotate gate covers the task. A response made after the
            // phone returns records total wall-clock time, including the rotation interval.
            var after_response = (chosen_side, pointerType) => {
                syncGateState();
                if (!revealed || gateVisible || response.key !== null) return;

                response.rt = Math.max(0, Math.round(performance.now() - trialOnset));
                response.key = chosen_side;   // 'left' or 'right'
                response.pointer_type = pointerType;

                // Set deadline warning to false, since response was made
                response.response_deadline_warning = false;

                if (responseDeadlineTimeout !== null) {
                    clearTimeout(responseDeadlineTimeout);
                    responseDeadlineTimeout = null;
                }

                this.triggerCoinAnimation(chosen_side);

                cleanupAll();

                this.jsPsych.pluginAPI.setTimeout(ITI, simulating ? 80 : trial.animation_duration);
            };

            function showTemporaryWarning(message, duration) {
                if (duration === undefined) duration = 800;

                // Create warning element
                var warningElement = document.createElement('div');
                warningElement.id = 'rev-warning-temp';
                warningElement.innerText = message;

                // Style the warning with modern CSS
                warningElement.style.cssText =
                    'position: fixed;' +
                    'left: 50%;' +
                    'top: 50%;' +
                    'transform: translate(-50%, -50%);' +
                    'z-index: 9999;' +
                    'background-color: rgba(244, 206, 92, 0.9);' +
                    'padding: 15px 25px;' +
                    'border-radius: 8px;' +
                    'width: min(92vw, 440px);' +
                    'box-sizing: border-box;' +
                    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;' +
                    'font-size: 24px;' +
                    'font-weight: 500;' +
                    'color: #182b4b;' +
                    'opacity: 0;' +
                    'transition: opacity 0.2s ease;' +
                    'text-align: center;' +
                    'letter-spacing: 0.0px;';

                // Add to document body
                document.body.appendChild(warningElement);

                // Force reflow to ensure transition works
                warningElement.offsetHeight;

                // Show warning with fade-in effect
                warningElement.style.opacity = '1';

                // Remove after duration with fade-out effect
                setTimeout(function () {
                    warningElement.style.opacity = '0';
                    setTimeout(function () {
                        warningElement.remove();
                    }, 200); // Wait for fade out transition
                }, duration);
            }

            // Warn that responses need to be quicker
            var deadline_warning = () => {
                cleanupAll();

                // Document that warning was shown
                response.response_deadline_warning = true;

                // Display message
                showTemporaryWarning("Didn't catch a response - moving on", trial.warning_duration - 200);

                // End trial
                this.jsPsych.pluginAPI.setTimeout(() => {
                    // Remove message
                    var el = document.getElementById('rev-deadline-warning');
                    if (el) el.innerText = '';

                    // Call ITI and then end of trial
                    ITI();
                }, trial.warning_duration);
            };

            // --- Set up pointer listeners on tap zones ---

            var makeTapHandler = function (side) {
                return function (event) {
                    if (!event.isPrimary) return;       // ignore multi-touch
                    if (event.button !== 0) return;     // ignore right-click / middle-click
                    event.preventDefault();
                    after_response(side, event.pointerType || 'unknown');
                };
            };
            leftTapHandler = makeTapHandler('left');
            rightTapHandler = makeTapHandler('right');

            suppressContextMenu = function (e) {
                e.preventDefault();  // suppress right-click / long-press context menu
            };

            if (tapLeft) {
                tapLeft.addEventListener('pointerdown', leftTapHandler);
                tapLeft.addEventListener('contextmenu', suppressContextMenu);
            }
            if (tapRight) {
                tapRight.addEventListener('pointerdown', rightTapHandler);
                tapRight.addEventListener('contextmenu', suppressContextMenu);
            }

            // --- Keyboard response listener (parallel to pointer) ---
            this.jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: function (resp) {
                    var side = this.keys[resp.key.toLowerCase()];
                    if (side) {
                        after_response(side, 'keyboard');
                    }
                }.bind(this),
                valid_responses: trial.choices,
                rt_method: "performance",
                // A valid key pressed behind the rotate overlay must not consume the listener.
                persist: true,
                allow_held_key: false
            });

            // --- Viewport + orientation change listener ---

            resizeHandler = function () {
                viewportChanged = true;
                syncGateState();
                if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
                resizeFrame = requestAnimationFrame(function () {
                    resizeFrame = null;
                    syncGateState();
                });
            };
            window.addEventListener('resize', resizeHandler);
            window.addEventListener('orientationchange', resizeHandler);

            // Start the response-deadline clock. trialOnset is reset to the reveal moment so
            // RT is measured from actual stimulus visibility, not DOM creation.
            var startDeadline = () => {
                // The decode() promise can settle after the trial is already over (an aborted
                // run, or a decode slower than the rest of the trial). Arming a deadline then
                // would leave a timer jsPsych's own end-of-trial cleanup has already passed,
                // free to fire during a later trial.
                if (cleaned) return;

                revealed = true;
                trialOnset = performance.now();
                viewportWidth = window.innerWidth;
                viewportHeight = window.innerHeight;
                viewportChanged = false;
                gateVisible = isRotateGateVisible();
                wrongOrientation = gateVisible;
                wrongOrientationTimes = gateVisible ? [0] : [];

                if (trial.response_deadline > 0) {
                    var deadlineCallback = trial.show_warning ? deadline_warning : ITI;
                    responseDeadlineTimeout = this.jsPsych.pluginAPI.setTimeout(() => {
                        responseDeadlineTimeout = null;
                        deadlineCallback();
                    }, trial.response_deadline);
                }
            };

            // Reveal the stimuli. If every image is already loaded (the normal case once the
            // task preload has run), show synchronously in this same JS turn — the browser
            // paints the new scene directly over the previous one with no blank frame between
            // trials. Only when an image is not yet ready (slow/uncached load) do we hide and
            // wait for img.decode(), which avoids Safari painting a half-decoded bitmap.
            var imgs = Array.from(display_element.querySelectorAll('img'));
            var allReady = imgs.every(function (img) {
                return img.complete && img.naturalWidth > 0;
            });

            if (allReady) {
                startDeadline();
            } else {
                stimuliEl.style.opacity = '0';
                Promise.all(imgs.map(function (img) {
                    return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
                })).then(() => {
                    stimuliEl.style.opacity = '1';
                    startDeadline();
                });
            }
        }

        // Create stimuli
        create_stimuli(trial) {

            var stimulus =
                '<div class="rev-squirrel-empty">' +
                    '<img id="rev-squirrel-empty" src="' + trial.images_path + 'squirrels_empty.png"></img>' +
                '</div>' +
                '<div class="rev-squirrel-bg">' +
                    '<img id="rev-squirrel-bg" src="' + trial.images_path + 'squirrels_bg.png"></img>' +
                '</div>' +
                '<div id="rev-coin-left" class="rev-coin-side">' +
                    '<img src="' + trial.images_path + trial.coin_images[trial.feedback_left] + '"></img>' +
                '</div>' +
                '<div id="rev-coin-right" class="rev-coin-side">' +
                    '<img src="' + trial.images_path + trial.coin_images[trial.feedback_right] + '"></img>' +
                '</div>' +
                '<div class="rev-squirrel-fg">' +
                    '<img id="rev-squirrel-fg" src="' + trial.images_path + 'squirrels_fg.png"></img>' +
                '</div>' +
                '<div id="rev-deadline-warning">' +
                '</div>' +
                // Tap zones only on touch devices; keyboard users interact via arrow keys only
                (navigator.maxTouchPoints > 0 ?
                    '<div id="rev-tap-left" class="rev-tap-zone rev-tap-left"></div>' +
                    '<div id="rev-tap-right" class="rev-tap-zone rev-tap-right"></div>' : '');

            return '<div class="reversal-stimuli">' + stimulus + '</div>';
        }

        // Trigger animation
        // Function to trigger the coin animation
        triggerCoinAnimation(side) {
            var coinElement = document.getElementById('rev-coin-' + side);
            var animClass = 'rev-coin-' + side + '-animate';

            coinElement.style.opacity = '1'; // reveal now that a response was made
            coinElement.classList.remove(animClass);
            void coinElement.offsetWidth;  // trigger reflow for CSS animation restart
            coinElement.classList.add(animClass);
        }

        create_simulation_data(trial, simulation_options) {

            // Pick a random valid key for simulation
            var sim_key = this.jsPsych.pluginAPI.getValidKey(trial.choices).toLowerCase();
            var response_side = this.keys[sim_key];

            // Define default simulated values
            var default_data = {
                feedback_right: trial.feedback_right,
                feedback_left: trial.feedback_left,
                rt: this.jsPsych.randomization.sampleExGaussian(500, 50, 1 / 150, true),
                key: sim_key,
                response: response_side,
                pointer_type: 'touch',
                wrong_orientation: false,
                wrong_orientation_times: [],
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
                viewport_changed: false
            };

            // Compute chosen_feedback and response_optimal
            default_data.chosen_feedback = response_side === 'right' ? trial.feedback_right : trial.feedback_left;
            default_data.response_optimal = trial.optimal_right ? response_side === 'right' : response_side === 'left';

            var data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
            this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
            return data;
        }

        simulate(trial, simulation_mode, simulation_options, load_callback) {
            if (simulation_mode == 'data-only') {
                load_callback();
                this.simulate_data_only(trial, simulation_options);
            }
            if (simulation_mode == 'visual') {
                this.simulate_visual(trial, simulation_options, load_callback);
            }
        }

        simulate_data_only(trial, simulation_options) {
            var data = this.create_simulation_data(trial, simulation_options);
            this.jsPsych.finishTrial(data);
        }

        simulate_visual(trial, simulation_options, load_callback) {
            var data = this.create_simulation_data(trial, simulation_options);

            var display_element = this.jsPsych.getDisplayElement();
            this.trial(display_element, trial);
            load_callback();

            if (data.rt !== null) {
                this.jsPsych.pluginAPI.pressKey(data.key, data.rt);
            }
        }
    }
    ReversalPlugin.info = info;

    return ReversalPlugin;
})(jsPsychModule);
