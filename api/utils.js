import { loadSequence, loadCSS, bonusTrial, setExperimentPauseReason } from '@utils/index.js';
import { TaskRegistry, globalConfig, globalConfigOptions } from './task-registry.js';
import { messages } from './messages.js';
import { ModuleRegistry } from './module-registry.js';
import { getSession, listSessions } from './session-registry.js';

const PHONE_MIN_SCREEN_DIMENSION = 500;

/**
 * Classifies the physical device rather than the current browser pane. On tablets,
 * split-screen and Stage Manager can make the viewport phone-width without turning the
 * device into a phone that should be orientation-gated.
 * @param {{width: number, height: number}} screenSize - Device screen dimensions in CSS px
 * @returns {boolean} Whether the device has a phone-sized physical screen
 */
export function isPhoneSizedScreen(screenSize) {
    const width = Number(screenSize?.width);
    const height = Number(screenSize?.height);
    return width > 0 && height > 0 && Math.min(width, height) <= PHONE_MIN_SCREEN_DIMENSION;
}

/**
 * Get a task from the registry with global config merged
 * @param {string} taskName - Name of the task to retrieve
 * @returns {Object} Task object with merged global configuration
 */
export function getTask(taskName) {
  if (!(taskName in TaskRegistry)) {
    throw new Error(`Task "${taskName}" not found. Available tasks: ${Object.keys(TaskRegistry).join(', ')}`);
  }

  let task = TaskRegistry[taskName];

  // Add global settings to task
  task.defaultConfig = { ...globalConfig, ...task.defaultConfig };
  task.configOptions = { ...globalConfigOptions, ...task.configOptions };

  return task;
}

/**
 * Create a timeline for a specific task with all required assets loaded
 * @param {string} taskName - Name of the task
 * @param {Object} config - Task configuration object
 * @returns {Promise<Array>} Timeline array for the task
 */
export async function createTaskTimeline(taskName, config = {}) {
    // Get task
    const task = getTask(taskName);

    // Merge configurations with defaults
    const mergedConfig = { ...globalConfig, ...task.defaultConfig, ...config };

    // Attach task object for internal use
    mergedConfig.__task = task;

    // Resolve the session once, here, so every task - including every task inside a module,
    // which is built through this same function - reads its stimulus set, rule variant and
    // resumption policy from the registry rather than comparing session strings itself.
    // Tasks with no session at all (the medication questionnaire, vigour) get null.
    mergedConfig.sessionInfo = mergedConfig.session ? getSession(mergedConfig.session) : null;

    // Load required CSS assets
    if (task.requirements?.css) {
        console.log(`Loading CSS assets for task ${taskName}:`, task.requirements.css);
        
        try {
            await Promise.all(
                task.requirements.css.map(cssPath => loadCSS(cssPath))
            );
            console.log(`Successfully loaded all CSS assets for task ${taskName}`);
        } catch (error) {
            console.warn(`Some CSS assets failed to load for task ${taskName}:`, error);
        }
    }

    // Load the trial sequence for this session. The session key is the lookup - a task's
    // sequences map is keyed by the same canonical keys as the session registry.
    if (task.sequences) {
        const sessionKey = mergedConfig.session;
        const sequencePath = task.sequences[sessionKey];

        // A task that needs a sequence and has none for this session cannot run. Failing here
        // is what keeps a half-added session from starting and then breaking mid-task (WM and
        // the post-learning tests deliberately have no screening sequence, for instance).
        if (!sequencePath) {
            throw new Error(
                `Task "${taskName}" has no trial sequence for session "${sessionKey}". ` +
                `Available: ${Object.keys(task.sequences).join(', ')}. ` +
                `Known sessions: ${listSessions().join(', ')}.`
            );
        }

        console.log(`Loading sequence for task ${taskName}: ${sessionKey} from ${sequencePath}`);

        try {
            await loadSequence(sequencePath);
            console.log(`Successfully loaded sequence: ${sessionKey}`);
        } catch (error) {
            throw new Error(`Failed to load sequence ${sequencePath} for task "${taskName}": ${error.message}`);
        }
    }
    
    // Build the task's timeline
    const timeline = await task.createTimeline(mergedConfig);

    // Gate the task to its preferred device orientation on phones. The overlay markup and CSS
    // live in the experiment entry HTML, keyed off <body data-preferred-orientation="...">;
    // vigour's wrong_orientation logging keys off the overlay's actual visibility.
    const orientation = mergedConfig.preferredOrientation;
    // Touch devices get an orientation hint, but only physical phone screens get the blocking
    // gate. A tablet's viewport may become narrow in split-screen without requiring rotation.
    const touchCapable = navigator.maxTouchPoints > 0;
    const phoneSizedDevice = touchCapable && isPhoneSizedScreen(window.screen);
    if (touchCapable && (orientation === 'portrait' || orientation === 'landscape')) {
        // Phone SVG shapes shared by both orientations
        const shapes = `
            <rect x="2" y="2" width="56" height="96" rx="10" fill="#182b4b"/>
            <rect x="6" y="14" width="48" height="72" rx="5" fill="#e2e8f2"/>
            <circle cx="30" cy="7" r="3" fill="#4a6fa5"/>
            <rect x="20" y="90" width="20" height="4" rx="2" fill="#4a6fa5"/>`;
        // Landscape icon uses an SVG matrix to remap portrait 60×100 space to landscape 100×60
        // (matrix(0,1,-1,0,100,0) maps (x,y)→(100-y, x)), avoiding CSS-rotate layout artefacts
        const phoneIcon = orientation === 'portrait'
            ? `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg" style="width:70px;height:116px;display:block;margin:0 auto 20px;">${shapes}</svg>`
            : `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" style="width:116px;height:70px;display:block;margin:0 auto 20px;"><g transform="matrix(0,1,-1,0,100,0)">${shapes}</g></svg>`;
        const orientationLabel = orientation === 'portrait' ? 'portrait (upright)' : 'landscape (on its side)';

        // Shown before the gate activates so users know how to hold their device
        const orientationHintTrial = {
            type: jsPsychHtmlButtonResponse,
            stimulus: function() {
                if (phoneSizedDevice) {
                    return `<div style="text-align:center;max-width:min(500px,92vw);margin:0 auto;">
                        ${phoneIcon}
                        <p>For this task, please hold your phone in <strong>${orientationLabel}</strong> mode.</p>
                    </div>`;
                }
                return `<div style="text-align:center;max-width:min(500px,92vw);margin:0 auto;">
                    <p>You can hold your tablet in whichever orientation feels comfortable — just keep it consistent throughout the task.</p>
                </div>`;
            },
            choices: ['Got it'],
            data: { trialphase: 'orientation_hint' },
            simulation_options: { data: { response: 0 } }
        };

        const taskTimeline = Array.isArray(timeline) ? timeline : [timeline];
        const preloadTrial = taskTimeline[0]?.type === jsPsychPreload ? taskTimeline[0] : null;
        const gatedTimeline = preloadTrial ? taskTimeline.slice(1) : taskTimeline;
        const pauseTimelineOnWrongOrientation = mergedConfig.pauseTimelineOnWrongOrientation === true;
        let timelinePausedForOrientation = false;
        let orientationChangeHandler = null;
        let orientationChangeFrame = null;

        const syncOrientationPause = () => {
            if (!pauseTimelineOnWrongOrientation) return;

            const overlay = document.getElementById('rotate-overlay');
            const gateVisible = !!overlay && getComputedStyle(overlay).display !== 'none';
            if (gateVisible === timelinePausedForOrientation) return;

            timelinePausedForOrientation = gateVisible;
            setExperimentPauseReason('orientation', gateVisible);
        };

        const startOrientationPauseController = () => {
            if (!pauseTimelineOnWrongOrientation) return;

            orientationChangeHandler = () => {
                syncOrientationPause();
                if (orientationChangeFrame !== null) cancelAnimationFrame(orientationChangeFrame);
                orientationChangeFrame = requestAnimationFrame(() => {
                    orientationChangeFrame = null;
                    syncOrientationPause();
                });
            };
            window.addEventListener('resize', orientationChangeHandler);
            window.addEventListener('orientationchange', orientationChangeHandler);
            orientationChangeHandler();
        };

        const stopOrientationPauseController = () => {
            if (orientationChangeHandler) {
                window.removeEventListener('resize', orientationChangeHandler);
                window.removeEventListener('orientationchange', orientationChangeHandler);
                orientationChangeHandler = null;
            }
            if (orientationChangeFrame !== null) {
                cancelAnimationFrame(orientationChangeFrame);
                orientationChangeFrame = null;
            }
            if (timelinePausedForOrientation) {
                timelinePausedForOrientation = false;
                setExperimentPauseReason('orientation', false);
            }
        };

        return [
            ...(preloadTrial ? [preloadTrial] : []),
            orientationHintTrial,
            {
                timeline: gatedTimeline,
                on_timeline_start: () => {
                    if (!phoneSizedDevice) return;

                    document.body.setAttribute('data-preferred-orientation', orientation);
                    startOrientationPauseController();
                },
                on_timeline_finish: () => {
                    if (!phoneSizedDevice) return;

                    stopOrientationPauseController();
                    document.body.removeAttribute('data-preferred-orientation');
                }
            }
        ];
    }
    return timeline;
}

/**
 * Get list of all available task names
 * @returns {Array<string>} Array of task names
 */
export function listTasks() {
  return Object.keys(TaskRegistry);
}

/**
 * Get detailed information about a specific task
 * @param {string} taskName - Name of the task
 * @returns {string} Formatted information string about the task
 */
export function getTaskInfo(taskName) {
    const task = TaskRegistry[taskName];
    if (!task) {
        return `Task "${taskName}" not found in registry.`;
    }

    let info = `\n=== ${task.name} ===\n`;
    info += `${task.description}\n\n`;

    // Merged configuration options with descriptions
    const mergedConfigOptions = { ...globalConfigOptions, ...task.configOptions };
    if (Object.keys(mergedConfigOptions).length > 0) {
        info += `Configuration Options:\n`;
        Object.entries(mergedConfigOptions).forEach(([key, description]) => {
            info += `  ${key}: ${description}\n`;
        });
        info += '\n';
    }

    // Requirements
    if (task.requirements) {
        info += `Requirements:\n`;
        if (task.requirements.css) {
            info += `  CSS: ${task.requirements.css.join(', ')}\n`;
        }
        info += '\n';
    }

    // Resumption rules
    if (task.resumptionRules) {
        info += `Resumption: ${task.resumptionRules.enabled ? 'Enabled' : 'Disabled'}`;
        if (task.resumptionRules.granularity) {
            info += ` (${task.resumptionRules.granularity} level)`;
        }
        info += '\n';
    }

    // Sequences (if available)
    if (task.sequences) {
        info += `\nAvailable Sequences: ${Object.keys(task.sequences).join(', ')}\n`;
    }

    return info;
}

/**
 * Create an instruction trial object with base configuration
 * @param {string|Array} message - Instruction message(s) to display
 * @param {...Object} additionalArgs - Additional configuration objects to merge
 * @returns {Object} Instruction trial configuration object
 */
function instructionTrial(message, ...additionalArgs) {
    // Default configuration for instruction trials
    let defaultArgs = {
        css_classes: ['instructions'], // Apply instructions CSS styling
        show_clickable_nav: true,      // Enable navigation buttons
        data: {trialphase: "instruction"} // Mark trial phase for data collection
    }

    // Create the base jsPsych instructions trial object
    let baseObject = {
        type: jsPsychInstructions,     // Use jsPsych instructions plugin
        pages: message,                // Set the instruction pages content
        ...defaultArgs,                // Apply default configuration
        ...additionalArgs[0]           // Override with any additional arguments
    };

    return baseObject;
}

/**
 * Get a message and create an instruction trial from the message registry
 * @param {string} moduleName - Name of the module containing the message
 * @param {string} messageKey - Key of the message to retrieve
 * @param {Object} settings - Settings object to pass to message functions
 * @returns {Object|string} Instruction trial object or empty string if message not found
 */
export function getMessage(moduleName, messageKey, settings={}) {
    if (messages[moduleName] && messages[moduleName][messageKey]) {
        const message = messages[moduleName][messageKey];
        
        let messageContent;
        if (typeof message === 'function') {
            messageContent = message(settings);
        } else {
            messageContent = message;
        }

        // If the message is an object with a 'message' property, extract it and any additional properties
        if (typeof messageContent === 'object' && messageContent !== null && messageContent.hasOwnProperty('message')) {
            const { message: msg, ...additionalArgs } = messageContent;
            return instructionTrial(Array.isArray(msg) ? msg : [msg], additionalArgs);
        }   

        return instructionTrial(Array.isArray(messageContent) ? messageContent : [messageContent]);
    } else {
        console.warn(`Message not found for module: ${moduleName}, key: ${messageKey}`);
        return "";
    }
}

/**
 * Get a module from the registry
 * @param {string} moduleName - Name of the module to retrieve
 * @returns {Object} Module object
 */
export function getModule(moduleName) {
  if (!(moduleName in ModuleRegistry)) {
    throw new Error(`Module "${moduleName}" not found. Available modules: ${Object.keys(ModuleRegistry).join(', ')}`);
  }

  let module = ModuleRegistry[moduleName];

  return module;
}

/**
 * Create a timeline for a module by processing all its elements
 * @param {string} moduleName - Name of the module
 * @param {Object} config - Module configuration object
 * @returns {Promise<Array>} Flattened timeline array for all module elements
 */
export async function createModuleTimeline(moduleName, config) {
    // Get module
    const module = getModule(moduleName);

    // Pre-fetch task objects and attach to task elements
    module.elements.forEach(element => {
        if (element.type === "task") {
            element.__task = getTask(element.name);
        }
    });

    // Create timeline for each element in the module
    const timelines = module.elements.map(element => {
        if (element.type === "task") {
            return createTaskTimeline(element.name, { ...module.moduleConfig, ...element.config, ...config });
        }
        if (element.type === "instructions") {
            return getMessage(moduleName, element.config.text, { ...module.moduleConfig, ...element.config, ...config });
        }
        if (element.type === "bonus") {
            return bonusTrial(module);
        }
        return null;
    });

    const result = await Promise.all(timelines);
    return result.flat();
}

/**
 * Get list of all available module names
 * @returns {Array<string>} Array of module names
 */
export function listModules() {
  return Object.keys(ModuleRegistry);
}

/**
 * Get detailed information about a specific module
 * @param {string} moduleName - Name of the module
 * @returns {string} Formatted information string about the module
 */
export function getModuleInfo(moduleName) {
    const module = ModuleRegistry[moduleName];
    if (!module) {
        return `Module "${moduleName}" not found in registry.`;
    }

    let info = `\n=== ${module.name} ===\n`;
    
    // Add module config if it exists
    if (module.moduleConfig) {
        info += `Module Config:\n`;
        Object.entries(module.moduleConfig).forEach(([key, value]) => {
            info += `  ${key}: ${value}\n`;
        });
        info += '\n';
    }

    // Add elements list
    info += `Sequence: (${module.elements.length} elements total):\n`;
    module.elements.forEach((element, index) => {
        const num = (index + 1).toString().padStart(2, '0');
        if (element.type === 'task') {
            info += `  ${num}. ${element.name}`;
            if (element.config) {
                const configItems = Object.entries(element.config).map(([k, v]) => `${k}: ${v}`);
                info += ` (${configItems.join(', ')})`;
            }
            info += '\n';
        } else if (element.type === 'instructions') {
            info += `  ${num}. [Instructions: ${element.config?.text || 'unknown'}]\n`;
        }
    });

    return info;
}
