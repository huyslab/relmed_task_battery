import { loadSequence, loadCSS, bonusTrial } from '@utils/index.js';
import { TaskRegistry, globalConfig, globalConfigOptions } from './task-registry.js';
import { messages } from './messages.js';
import { ModuleRegistry } from './module-registry.js';

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

    // Load task-specific sequence if available
    if (task.sequences) {
        const sequenceName = mergedConfig.sequence;
        const sequencePath = task.sequences?.[sequenceName];

        console.log(`Loading sequence for task ${taskName}: ${sequenceName} from ${sequencePath}`);

        if (sequencePath) {
            console.log(`Loading sequence using script loading: ${sequencePath}`);
            
            try {
                await loadSequence(sequencePath);
                console.log(`Successfully loaded sequence: ${sequenceName}`);
            } catch (error) {
                console.warn(`Failed to load sequence ${sequencePath}, continuing without it:`, error);
                // Continue without the sequence - let the task handle missing sequences gracefully
            }
        }
    }
    
    return task.createTimeline(mergedConfig);
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
 * Check whether a module element applies to the given session and context
 * @param {Object} element - Module element, optionally with `sessions` and `contexts` arrays
 * @param {Object} settings - Settings with `session` and `context`
 * @returns {boolean} True if the element should be included
 */
export function isElementIncluded(element, settings = {}) {
    if (element.sessions && !element.sessions.includes(settings.session)) return false;
    if (element.contexts && !element.contexts.includes(settings.context)) return false;
    return true;
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

    // Create timeline for each element in the module that applies to this session / context
    const settings = { ...module.moduleConfig, ...config };
    const timelines = module.elements.filter(element => isElementIncluded(element, settings)).map(element => {
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
        const restrictions = [
            element.sessions ? `sessions: ${element.sessions.join('/')}` : null,
            element.contexts ? `contexts: ${element.contexts.join('/')}` : null
        ].filter(Boolean);
        const suffix = restrictions.length ? ` [${restrictions.join('; ')}]` : '';
        if (element.type === 'task') {
            info += `  ${num}. ${element.name}`;
            if (element.config) {
                const configItems = Object.entries(element.config).map(([k, v]) => `${k}: ${v}`);
                info += ` (${configItems.join(', ')})`;
            }
            info += `${suffix}\n`;
        } else if (element.type === 'instructions') {
            info += `  ${num}. [Instructions: ${element.config?.text || 'unknown'}]${suffix}\n`;
        } else if (element.type === 'bonus') {
            info += `  ${num}. [Bonus]${suffix}\n`;
        }
    });

    return info;
}