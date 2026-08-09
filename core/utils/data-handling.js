import { preventRefresh} from "./participation-validation.js"

/**
 * Data handling and communication utilities
 * Manages data saving, state updates, and communication with parent windows/servers
 */

/**
 * Parent origins this task battery is allowed to exchange messages with.
 * Shared by postToParent (outgoing) and the parent message listener (incoming), so a new
 * deployment domain only ever has to be added in one place.
 */
const ALLOWED_PARENT_ORIGINS = [
    'http://localhost:3000',
    'https://relmed.ac.uk',
    'https://www.relmed.ac.uk',
    'https://beta.relmed.ac.uk'
];

/**
 * Resolves the origin of the embedding page.
 *
 * document.referrer holds the parent page's URL. Cross-origin referrer policy trims it to
 * the bare origin ("https://relmed.ac.uk/"), but same-origin embedding keeps the full path
 * ("https://relmed.ac.uk/participant") - and a host may serve its participant page from a
 * sub-path rather than the domain root. Parsing out the origin rather than string-matching
 * the referrer is what makes both cases work.
 *
 * @returns {string|null} The parent origin, or null if it cannot be determined
 */
function getParentOrigin() {
    let candidate = document.referrer;

    if (!candidate) {
        // No referrer (e.g. opened directly): fall back to the parent's own origin, which is
        // only readable when we are same-origin with it.
        try {
            candidate = window.parent.location.origin;
        } catch (error) {
            return null;
        }
    }

    try {
        return new URL(candidate).origin;
    } catch (error) {
        return null;
    }
}

// Latches once postToParent has reported a rejected parent origin, so the warning doesn't
// repeat on every trial's state/bonus update.
let warnedAboutParentOrigin = false;

/**
 * Sends messages to parent window with security validation
 * Used for communication between iframe and parent window in web experiments
 * @param {Object} message - Message object to send to parent
 * @param {Function} fallback - Callback function to execute if messaging fails
 */
function postToParent(message, fallback = () => {}) {
    try {
        if (window.parent && window.parent.postMessage) {
            const parentOrigin = getParentOrigin();

            if (parentOrigin && ALLOWED_PARENT_ORIGINS.includes(parentOrigin)) {
                window.parent.postMessage(message, parentOrigin);
            } else {
                // Warn once, not per call: state and bonus updates post on every trial, so a
                // non-allowlisted host (local dev, examples/) would otherwise bury the console.
                if (!warnedAboutParentOrigin) {
                    warnedAboutParentOrigin = true;
                    console.warn("Parent origin does not match any allowed origins:", parentOrigin);
                }
                fallback();
            }
        } else {
            console.warn("Parent window or postMessage is unavailable.");
            fallback();
        }
    } catch (error) {
        console.warn("Failed to send message to parent window:", error);

        // Implement a fallback or handle the error
        fallback();
    }
}

// Latches once the load signal has actually reached the parent, so the two call sites
// (the entry page, ahead of its async timeline build, and enterExperiment, which covers
// entry pages that don't signal for themselves) only ever produce one message.
let loadSuccessSignalled = false;

/**
 * Tells the embedding website that the task booted successfully.
 *
 * Both My RELMED and mymeds start a timeout when they create the task iframe and show a
 * "Task failed to load" dialog if this message doesn't arrive in time (5s on mymeds - see
 * TaskFrame.js). Sent from experiment entry rather than only from preload trials, so tasks
 * that have no assets to preload aren't reported as broken. Safe to call more than once.
 */
function signalLoadSuccess() {
    if (loadSuccessSignalled) return;

    console.log("load_successful");

    // Latch before posting, and release again from the fallback, so a call made while the
    // parent is unreachable doesn't suppress a later one that would have got through.
    loadSuccessSignalled = true;
    postToParent({ message: "load_successful" }, () => { loadSuccessSignalled = false; });
}

/**
 * Updates experiment state and optionally saves data
 * Coordinates state management between client and server
 * @param {string} state - Current experiment state identifier
 * @param {boolean} save_data - Whether to save data to REDCap (default: true)
 */
function updateState(state, save_data = true) {

    // Save data to REDCap
    if (!state.includes("no_resume") && save_data){
        saveDataREDCap();
    }

    // Update bonus state
    // updateBonusState();

    console.log(state);
    postToParent({
        state: state
    });
}

/**
 * Saves experimental data to REDCap database with retry mechanism
 * Handles both RELMED and Prolific data submission contexts
 * @param {number} retry - Number of retry attempts remaining (default: 1)
 * @param {Object} extra_fields - Additional fields to include in data submission
 * @param {Function} callback - Callback function to execute after successful submission
 */
function saveDataREDCap(retry = 1, extra_fields = {}, callback = () => {}) {

    // Get data, remove stimulus string to reduce payload size
    const jspsych_data = jsPsych.data.get().ignore('stimulus').json();

    // Get interaction data (mouse movements, focus changes, etc.)
    const interaction_data = jsPsych.data.getInteractionData().json();

    // Combine interaction data with jsPsych data. Device info (set once by logDeviceInfo)
    // and the launch context (set once by saveUrlParameters) are sent as their own fields
    // rather than repeated on every trial via addProperties - study_object in particular is
    // a whole study configuration blob, which would otherwise be duplicated onto all ~150
    // trial rows.
    const combined_data = JSON.stringify([
        {
            interaction_data: interaction_data,
            jspsych_data: jspsych_data,
            device_info: window.deviceInfo || null,
            study_object: window.studyObject || null,
            launch_session_state: window.session_state || null
        }
    ]);

    const data_message = {
        data: {
            record_id: window.participantID + "_" + window.module_start_time,
            participant_id: window.participantID,
            sitting_start_time: window.module_start_time,
            session: window.session,
            module: window.module,
            data: combined_data
        },
        ...extra_fields
    };

    console.log("Data to be sent:", data_message);

    if (window.context === "relmed") {
        // Check if we're in a development environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log("Development mode: skipping data save to parent");
            callback();
            return;
        }

        postToParent(
            data_message,
            () => {
                if (retry > 0) {
                    console.warn(`Failed to save data, retrying... (${retry} attempts left)`);
                    // Exponential backoff: 1s, 2s, 4s, etc.
                    const delay = Math.pow(2, (3 - retry)) * 1000;
                    setTimeout(function () {
                        // extra_fields must be forwarded: endExperiment's {message, endTask}
                        // is what tells the website the module finished, and a retry that
                        // dropped it would submit data the site never acts on. callback is
                        // deliberately not forwarded - this branch already fired it below.
                        saveDataREDCap(retry - 1, extra_fields);
                    }, delay);
                } else {
                    console.error('Failed to submit data after retrying.');
                }
                
            }
        );

        callback();

    } else if (window.context === "prolific") {

        // Prepare REDCap record for Prolific context
        var redcap_record = JSON.stringify([{
            record_id: window.participantID + "_" + window.module_start_time,
            participant_id: window.participantID,
            sitting_start_time: window.module_start_time,
            session: window.session,
            module: window.module,
            data: combined_data
        }])
    
        // Submit data via AWS Lambda endpoint for Prolific studies
        fetch('https://h6pgstm0f9.execute-api.eu-north-1.amazonaws.com/prod/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: redcap_record
        })
        .then(data => {
            if (data.status === 200) {
                console.log('Data successfully submitted to REDCap');
            } else {
                console.error('Error submitting data:', data.message);
            }
            return data.json()
        })
        .then(data => {
            console.log(data)
            callback(); // Call the callback function if submission is successful
        }
        )
        .catch(error => {
            console.error('Error:', error);
            if (retry > 0) {
                console.log('Retrying to submit data...');
                setTimeout(function(){
                    // Unlike the relmed branch, callback here only fires on success or on
                    // final failure, so it has to be carried through the retry chain.
                    saveDataREDCap(retry - 1, extra_fields, callback);
                }, 1000);
            } else {
                console.error('Failed to submit data after retrying.');
                callback(error); // Call the callback function with the error if retries are exhausted
            }
        });
    }

}

/**
 * Handles experiment completion and final data submission
 * Removes page refresh prevention and redirects participants appropriately
 */
function endExperiment() {

    // Print end experiment message
    console.log("Experiment finished. Sending final data...");

    // Remove beforeunload event listener to allow page navigation
    window.removeEventListener('beforeunload', preventRefresh);

    // Save data and tell the website the module is done. The two hosting sites read this
    // differently: My RELMED keys off `message`, mymeds checks for a truthy top-level
    // `endTask` field (src/pages/Participant.js) before marking the task finished, closing
    // the iframe and refreshing session state. Sending both satisfies either parent.
    saveDataREDCap(10, {
        message: "endTask",
        endTask: true
    });
}

// Export functions for use in other modules
export {
    ALLOWED_PARENT_ORIGINS,
    getParentOrigin,
    postToParent,
    signalLoadSuccess,
    updateState,
    saveDataREDCap,
    endExperiment
};


