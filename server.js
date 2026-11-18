/**
 * Local Development Server
 */
const app = require('./backend/app');
const config = require('./config');

const port = config.port || 3000;

app.listen(port, () => {
    console.log(`=================================================`);
    console.log(` Bank Nusantara Roblox (BNR) Backend Server`);
    console.log(` Running on: http://localhost:${port}`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(`=================================================`);
});
