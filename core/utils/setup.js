/**
 * Experiment setup and initialization utilities
 * Handles dynamic script loading and experiment launch coordination
 */

// Import communication utility for sending messages to parent window
import { ALLOWED_PARENT_ORIGINS, signalLoadSuccess, updateState } from './data-handling.js';
import { preventParticipantTermination } from './participation-validation.js';
import { formatDateString } from './calculations.js';

/**
 * Dynamically loads a JavaScript file with Promise-based interface
 * More robust than fetch() for loading sequence files
 * @param {string} scriptSrc - Path to the JavaScript file to load
 * @returns {Promise} Resolves when script is loaded successfully
 */
function loadSequence(scriptSrc) {
    return new Promise((resolve, reject) => {

        // Resolve any path aliases using the import map
        const resolvedPath = resolvePath(scriptSrc);

        // Check if script is already loaded
        const existingScript = document.querySelector(`script[src="${resolvedPath}"]`);
        if (existingScript) {
            console.log(`Script already loaded: ${resolvedPath}`);
            resolve();
            return;
        }

        // Create a new script element for dynamic loading
        const script = document.createElement("script");
        
        // Set the src attribute to the provided script path
        script.src = resolvedPath;
        script.type = "text/javascript";
        
        // Success handler
        script.onload = () => {
            console.log("Script loaded successfully:", resolvedPath);
            resolve();
        };
        
        // Error handler
        script.onerror = () => {
            console.error("Failed to load script:", resolvedPath);
            reject(new Error(`Failed to load sequence script: ${resolvedPath}`));
        };
        
        // Append the script to the document's head to trigger loading
        document.head.appendChild(script);
    });
}

/**
 * Resolves path aliases using the import map defined in the HTML file
 * @param {string} path - The path that may contain aliases
 * @returns {string} The resolved path
 */
function resolvePath(path) {
    // Get the import map from the document
    const importMapScript = document.querySelector('script[type="importmap"]');
    
    if (importMapScript) {
        try {
            const importMap = JSON.parse(importMapScript.textContent);
            const imports = importMap.imports || {};
            
            // Check if path starts with any alias from the import map
            for (const [alias, actualPath] of Object.entries(imports)) {
                if (path.startsWith(alias)) {
                    return path.replace(alias, actualPath);
                }
            }
        } catch (error) {
            console.warn('Failed to parse import map:', error);
        }
    }
    
    // Return original path if no mapping found
    return path;
}

/**
 * Asynchronously loads a CSS stylesheet into the document head.
 * Checks if the CSS is already loaded to prevent duplicates.
 * 
 * @async
 * @function loadCSS
 * @param {string} cssPath - The path or URL to the CSS file to load
 * @returns {Promise<void>} A promise that resolves when the CSS is successfully loaded
 * @throws {Error} Throws an error if the CSS file fails to load
 * 
 * @example
 * // Load a CSS file
 * await loadCSS('/styles/main.css');
 * 
 * @example
 * // Handle loading errors
 * try {
 *   await loadCSS('/styles/theme.css');
 * } catch (error) {
 *   console.error('CSS loading failed:', error);
 * }
 */
async function loadCSS(cssPath) {
    return new Promise((resolve, reject) => {
        // Resolve any path aliases using the import map
        const resolvedPath = resolvePath(cssPath);

        // Check if CSS is already loaded
        const existingLink = document.querySelector(`link[href="${resolvedPath}"]`);
        if (existingLink) {
            console.log(`CSS already loaded: ${resolvedPath}`);
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = resolvedPath;
        
        link.onload = () => {
            console.log(`Successfully loaded CSS: ${resolvedPath}`);
            resolve();
        };
        
        link.onerror = () => {
            console.warn(`Failed to load CSS: ${resolvedPath}`);
            reject(new Error(`Failed to load CSS: ${resolvedPath}`));
        };
        
        document.head.appendChild(link);
    });
}

/**
 * Creates a jsPsych preload trial for loading images before task execution
 * @param {string[]} images - Array of image file paths to preload
 * @param {string} task_name - Name of the task for trial identification
 * @returns {Object} jsPsych preload trial configuration object
 */
function createPreloadTrial(images, task_name) {
    return {
        type: jsPsychPreload,
        images: images,
        post_trial_gap: 800,
        data: {
            trialphase: `${task_name}_preload`,
        },
        // No load_successful signal here - enterExperiment sends one for every task, whether
        // or not it has assets. That message is the website's boot heartbeat and deliberately
        // says nothing about whether the stimuli actually arrived; this trial reports that.
        continue_after_error: true,
        on_finish: (data) => {
            const failed = [
                ...(data.failed_images || []),
                ...(data.failed_audio || []),
                ...(data.failed_video || [])
            ];

            if (data.success === false || failed.length > 0) {
                console.error(`Preload failed for ${task_name}:`, failed);
            }
        }
    };
}

/**
 * URL parameters that must not be forward-filled onto every trial row.
 *
 * jsPsych's addProperties applies to all existing and future trials, so a stringified study
 * configuration or bonus state would be duplicated across the whole dataset. These are
 * captured once instead and sent as their own fields in the REDCap payload (see
 * saveDataREDCap); session_state is additionally already parsed into window.session_state.
 */
const BULKY_URL_PARAMS = ['study_object', 'session_state'];

// Save URL parameters to jsPsych data, minus the bulky ones recorded once elsewhere
function saveUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams.entries()) {
        if (BULKY_URL_PARAMS.includes(key)) continue;
        params[key] = value;
    }

    // Keep the study configuration for provenance, recorded once in the REDCap payload.
    // On a parse failure the raw text goes to a separate global rather than window.studyObject,
    // so the payload's study_object field is always an object or null - never sometimes a
    // string that silently reads back as undefined during analysis.
    const studyObject = urlParams.get('study_object');
    if (studyObject) {
        try {
            window.studyObject = JSON.parse(studyObject);
        } catch (error) {
            console.warn("Could not parse study_object URL parameter:", error);
            window.studyObjectRaw = studyObject;
        }
    }

    jsPsych.data.addProperties(params);
    console.log("URL parameters saved to data:", params);
}

/**
 * Attaches any buffered pause/resume events to the trial that just finished, then clears
 * the buffer. Installed automatically by listenToParentMessages.
 * @param {Object} data - The finished trial's data object
 */
function flushPauseResumeEvents(data) {
    if (window.pause_resume_events?.length) {
        data.pause_resume_events = window.pause_resume_events;
        window.pause_resume_events = [];
    }
}

// Guards against a second registration if enterExperiment is ever composed into a timeline
// more than once - two listeners would double every pause/resume event and pause twice, and
// re-running setup would discard events already buffered but not yet flushed.
let parentMessageListenerInstalled = false;

// jsPsych exposes a single timeline pause state, but more than one feature can own it. Only
// transition the timeline when the first reason is added or the final reason is removed.
const experimentPauseReasons = new Set();

function setExperimentPauseReason(reason, paused) {
    const wasPaused = experimentPauseReasons.size > 0;
    if (paused) {
        experimentPauseReasons.add(reason);
    } else {
        experimentPauseReasons.delete(reason);
    }

    const isPaused = experimentPauseReasons.size > 0;
    if (isPaused === wasPaused) return;

    if (isPaused) {
        jsPsych.pauseExperiment();
    } else {
        jsPsych.resumeExperiment();
    }
}

/**
 * Listens for control messages from the embedding website.
 *
 * Both hosting sites post {message: "pause_task"} / {message: "resume_task"} into the task
 * iframe when the participant leaves the task - on mymeds that fires on fullscreen exit
 * where supported, and on tab/app switch (Page Visibility) on iOS, where fullscreen isn't
 * available (see TaskFrame.js). Without this the participant keeps burning response
 * deadlines while the task isn't on screen, and the interruption goes unrecorded.
 *
 * Owns both halves of the feature: events are buffered on window.pause_resume_events, and
 * the on_trial_finish hook that drains that buffer into the trial data is chained onto
 * jsPsych here rather than left for each entry HTML to remember to wire up.
 */
function listenToParentMessages() {
    if (parentMessageListenerInstalled) return;
    parentMessageListenerInstalled = true;

    window.pause_resume_events = [];

    // Chain the flush onto whatever on_trial_finish the entry page already configured
    const existingOnTrialFinish = jsPsych.options.on_trial_finish;
    jsPsych.options.on_trial_finish = (data) => {
        flushPauseResumeEvents(data);
        existingOnTrialFinish(data);
    };

    // Only act on genuine state transitions. Native fullscreen entry can emit an initial
    // resume_task even though the experiment was never paused, and duplicate messages
    // should not create duplicate interruption records.
    let experimentPausedByParent = false;

    window.addEventListener("message", (event) => {
        // Check origin and sender for security - an allowlisted origin isn't enough on its
        // own, since any window able to reach this frame could otherwise stall the task.
        if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) return;
        if (event.source !== window.parent) return;

        const msg = event.data?.message;
        console.log("Message received from parent:", msg);

        if (msg === "pause_task" && !experimentPausedByParent) {
            experimentPausedByParent = true;
            console.log("Experiment pause requested by parent");
            window.pause_resume_events.push({ time: jsPsych.getTotalTime(), event: "pause" });
            setExperimentPauseReason('parent', true);
        }

        if (msg === "resume_task" && experimentPausedByParent) {
            experimentPausedByParent = false;
            console.log("Parent experiment pause released");
            window.pause_resume_events.push({ time: jsPsych.getTotalTime(), event: "resume" });
            setExperimentPauseReason('parent', false);
        }
    }, false);
}

/**
 * Captures device, input, and viewport covariates once at experiment entry.
 * Properties that never change during a session (user agent, pixel ratio,
 * screen size, touch capability, fullscreen support/state - the latter is
 * also covered continuously by interaction_data's fullscreenenter/exit
 * events) are stored on window.deviceInfo and sent as their own field in the
 * REDCap payload (see saveDataREDCap), rather than repeated on every trial.
 * Viewport size and orientation are captured once here too - there is no
 * resize/orientationchange listener re-triggering this - but stay on
 * addProperties rather than window.deviceInfo, since jsPsych forward-fills
 * addProperties values onto every subsequent trial. That keeps them
 * available as a per-trial column for tasks other than vigour/reversal
 * (which already record their own freshly-measured per-trial values), but
 * this entry-time snapshot goes stale for any other task if the viewport
 * actually changes mid-session.
 */
function logDeviceInfo() {
    const orientation = (window.screen && window.screen.orientation && window.screen.orientation.type) || null;

    window.deviceInfo = {
        device_user_agent: navigator.userAgent,
        device_pixel_ratio: window.devicePixelRatio || 1,
        screen_width: window.screen ? window.screen.width : null,
        screen_height: window.screen ? window.screen.height : null,
        max_touch_points: navigator.maxTouchPoints || 0,
        touch_capable: ('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0),
        fullscreen_enabled: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
        fullscreen_active: !!(document.fullscreenElement || document.webkitFullscreenElement)
    };

    jsPsych.data.addProperties({
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        device_orientation: orientation
    });

    console.log("Device info logged.");
}

/**
 * Creates a jsPsych fullscreen trial that initiates the experiment
 * Handles URL parameter saving and participant termination prevention
 * @type {Object} jsPsych trial configuration for entering fullscreen mode
 */
const enterExperiment = {
    type: jsPsychCallFunction,
    func: function() {
        // Record the sitting start time now that jsPsych has actually begun running -
        // getStartTime() is unset until jsPsych.run()/simulate() starts the timeline,
        // so this can't be read any earlier (e.g. in the entry HTML before jsPsych.run()).
        window.module_start_time = formatDateString(jsPsych.getStartTime());

        // Save all URL parameters to jsPsych data for experiment tracking
        saveUrlParameters();

        jsPsych.data.addProperties({
            n_warnings: 0
        })

        // Prevent participant from terminating experiment unless in debug mode
        if (!(window.participantID && window.participantID.includes("debug"))) {
            preventParticipantTermination();
        }

        // Capture device/viewport covariates
        logDeviceInfo();

        // Accept pause/resume control messages from the embedding website, and record them
        // against the interrupted trial
        listenToParentMessages();

        // Report a successful load for every task, whether or not it preloads assets, before
        // the website's load timeout fires
        signalLoadSuccess();
    }
};


// Export functions for use in other modules
export {
    loadSequence,
    createPreloadTrial,
    saveUrlParameters,
    listenToParentMessages,
    setExperimentPauseReason,
    enterExperiment,
    loadCSS
};
