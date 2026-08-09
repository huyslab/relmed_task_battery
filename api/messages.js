
/**
 * RELMED Task Battery - Messages Module
 * 
 * This module contains standardized messages and instructions displayed to participants
 * during different phases of the RELMED experiment sessions. It includes:
 * 
 * - Start and end messages for different session types (full_battery, screening)
 * - Formatted warning messages for response timeouts
 * - Dynamic content based on session settings (e.g., week 0 vs other weeks)
 * 
 * The messages support HTML formatting and can include optional fields passed on to the jsPsych instructions trial object.
 */

import { endExperiment } from '@utils/index.js';

const formatted_warning_msg = `
    <div id='vigour-warning-temp' style="
    background-color: rgba(244, 206, 92, 0.9);
    padding: 15px 25px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 24px;
    font-weight: 500;
    color: #182b4b;
    transition: opacity 0.2s ease;
    text-align: center;
    letter-spacing: 0.0px;
    ">Didn't catch a response - moving on</div>
`;


// The pilot runs as two modules in one visit (see api/module-registry.js), which meet the
// same participant on the same device. The pages that aren't about a specific module's
// contents are written once here so the two can't drift apart.

/** Second page of both pilot modules' opening instructions: what a missed response looks like */
const pilot_warning_page = `
    <p>If at some point you are taking too long to respond, you might see a message like this:</p><br>
    ${formatted_warning_msg}
    <br><p>It is perfectly natural to take a bit longer when you are learning something new. However, if you see this message a few times, it may be a sign that you are overthinking your choices.</p>
    <p>If at any point you feel like you need some assistance, you can find our contact details by pressing the question mark in the top right corner. We are happy to help.</p>`;

// Where to get help, shown at the end of each pilot module. The wording is fixed - only the
// markup around it belongs to us, so the URLs are the same strings, made clickable.
const pilot_signposting_message = `
    <p>If you are feeling low, anxious, or having upsetting thoughts or images, you can get help from your GP or these websites:</p>
    <ul>
        <li>NHS mental health: <a href="https://www.nhs.uk/mental-health/" target="_blank" rel="noopener noreferrer">https://www.nhs.uk/mental-health/</a></li>
        <li>Mind: <a href="https://www.mind.org.uk" target="_blank" rel="noopener noreferrer">https://www.mind.org.uk</a></li>
        <li>Samaritans: <a href="https://www.samaritans.org.uk" target="_blank" rel="noopener noreferrer">https://www.samaritans.org.uk</a></li>
    </ul>
    <p><b>If you ever think about harming yourself or someone else, go to your nearest hospital emergency department or call 999 straight away.</b></p>`;

export const messages = {
    full_battery: {
        start_message: (settings) => { 
            return [`<p><b>Thank you for taking part in this session!</b></p>
                <p>The purpose of this session is to examine how people learn from positive and negative feedback while playing games.
                <p>You will play a few simple trial-and-error learning games. Your goal in each game is to win as many coins as possible.</p>
                <p>The games may feel a bit fast-paced because we're interested in your quick, intuitive decisions. Since they're designed around learning from experience, making mistakes is completely expected. Over time, you'll figure out better choices and improve your performance.</p>
                ` + (settings.session === "wk0" ?  `<b>Please read the instructions carefully. They may differ from the training session.</b>` : ""),
                `
                <p>If at some point you are taking too long to respond, you might see a message like this:</p><br>
                ${formatted_warning_msg}
                <br><p>It is perfectly natural to take a bit longer when you are learning something new. However, if you see this message a few times, it may be a sign that you are overthinking your choices.</p>
                <p>If at any point you feel like you need some assistance, you can find our contact details by pressing the question mark in the top right corner. We are happy to help.</p>`
            ];
        },
        end_message: {
            message: `<p>Thank you for completing this session!</p>
                <p>Please call the experimenter.</p>`,
            on_start: endExperiment
        },
        break_message: {
            message: `<p>You can now take a short break.</p><p>Please ring the bell when you are ready to continue.</p>`,
            key_forward: 'c',
            show_clickable_nav: false
        }
    },
    pilot_1: {
        start_message: [
            `<p><b>Thank you for taking part in this session!</b></p>
            <p>We are studying how people learn from rewards, and how medication affects that.</p>
            <p>The session comes in two parts, and this is the first one. You will start with a few short questions about your medicine. After that you will play a simple game. Your goal is to win as many coins as possible, and you will earn a bonus payment based on the coins you collect.</p>
            <p>The game may feel a bit fast-paced because we're interested in your quick, intuitive decisions. Since it's designed around learning from experience, making mistakes is completely expected. Over time, you'll figure out better choices and improve your performance.</p>`,
            pilot_warning_page
        ],
        signposting_message: pilot_signposting_message,
        end_message: {
            message:
                `<p>Thank you for completing the first part of this session!</p>
                <p>There is one more part to go: another game, and a few questions about how you have been feeling. Please start it when you are ready - you can take a short break first if you would like one.</p>
                <p>When you click next, your data will be uploaded to the secure server. This may take up to two minutes. Please don't close or refresh your browser at this time.</p>`,
            on_finish: endExperiment
        }
    },
    pilot_2: {
        start_message: [
            `<p><b>Welcome back!</b></p>
            <p>This is the second and last part of the session. You will play one more game, and then answer a few short questions about how you have been feeling.</p>
            <p>As before, your goal in the game is to win as many coins as possible, and you will earn a bonus payment based on the coins you collect.</p>`,
            pilot_warning_page
        ],
        signposting_message: pilot_signposting_message,
        end_message: {
            message:
                `<p>Thank you for completing this session!</p>
                <p>When you click next, your data will be uploaded to the secure server. This may take up to two minutes. Please don't close or refresh your browser at this time.</p>`,
            on_finish: endExperiment
        }
    },
    screening: {
        start_message: [
            `<p><b>Welcome to the first RELMED training session!</b></p>
            <p>Over the next twenty minutes, you will try out the main tasks comprising the home assessments in the RELMED study.
            <p>You will start by playing a few simple trial-and-error learning games. Your goal in each game is to win as many coins as possible.</p>
            <p>The games may feel a bit fast-paced because we're interested in your quick, intuitive decisions. Since they're designed around learning from experience, making mistakes is completely expected. Over time, you'll figure out better choices and improve your performance.</p>
            `,
            `
            <p>If at some point you are taking too long to respond, you might see a message like this:</p><br>
            ${formatted_warning_msg}
            <br><p>It is perfectly natural to take a bit longer when you are learning something new. However, if you see this message a few times, it may be a sign that you are overthinking your choices.</p>
            <p>If at any point you feel like you need some assistance, you can find our contact details by pressing the question mark in the top right corner. We are happy to help.</p>`
        ],
        end_message:  {
            message: 
                `<p>Thank you for completing this module!</p>
                <p>When you click next, your data will be uploaded to the secure server. This may take up to two minutes. Please don't close or refresh your browser at this time.</p>`,
            on_finish: endExperiment
        }
    }
}

