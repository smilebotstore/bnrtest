/**
 * Netlify Serverless Function Handler
 * Wraps Express application into an AWS Lambda / Netlify Serverless handler using serverless-http.
 */
const serverless = require('serverless-http');
const app = require('../../backend/app');

// Handle serverless invocation
const handler = serverless(app);

module.exports.handler = async (event, context) => {
    // Avoid open event loop waits in serverless container
    context.callbackWaitsForEmptyEventLoop = false;
    return await handler(event, context);
};
