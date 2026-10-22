/**
 * Experiment setup and initialization utilities
 * Handles dynamic script loading and experiment launch coordination
 */

// Import communication utility for sending messages to parent window
import { postToParent } from './data-handling.js';
import { preventParticipantTermination } from './participation-validation.js';

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
        on_start: () => {
            console.log("load_successful");
            postToParent({ message: "load_successful" });
        },
        continue_after_error: true
    };
}

// Save all URL parameters to jsPsych data
function saveUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams.entries()) {
        params[key] = value;
    }
    jsPsych.data.addProperties(params);
    console.log("URL parameters saved to data:", params);
}

/**
 * Creates a jsPsych fullscreen trial that initiates the experiment
 * Handles URL parameter saving and participant termination prevention
 * @type {Object} jsPsych trial configuration for entering fullscreen mode
 */
const enterExperiment = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: '<p>The experiment will switch to full screen mode when you press the button below.</p>',
    on_start: () => {
        // Save all URL parameters to jsPsych data for experiment tracking
        saveUrlParameters();

        jsPsych.data.addProperties({
            n_warnings: 0
        })

        // Prevent participant from terminating experiment unless in debug mode
        if (!(window.debug || (window.participantID && window.participantID.includes("debug")))) {
            preventParticipantTermination();
        }
    }
};


// Export functions for use in other modules
export {
    loadSequence,
    createPreloadTrial,
    saveUrlParameters,
    enterExperiment,
    loadCSS
};

