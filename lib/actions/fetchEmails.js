const elasticio = require('elasticio-node');
const messages = elasticio.messages;
const MicrosoftGraph = require('msgraph-sdk-javascript');
const ApiClient = require('../apiClient');
const _ = require('lodash');

module.exports.process = processAction;

async function processAction(msg, cfg) {
    console.log('Refreshing an OAuth Token');

    const instance = new ApiClient(cfg, this);

    //checking if refresh token was successful
    let newAccessToken;
    try {
        newAccessToken = await instance.getRefreshedToken();
    } catch (e) {
        throw new Error('Failed to refresh token');
    }

    if (!newAccessToken) {
        return;
    }

    const client = MicrosoftGraph.init({
        defaultVersion: 'v1.0',
        debugLogging: true,
        authProvider: done => {
            done(null, newAccessToken);
        }
    });

    const currentTime = msg.body.time || (new Date()).toISOString();

    const events = await client
        .api(`/me/mailFolders/${cfg.folderId}/messages`)
        .get();

    this.emit('data', messages.newMessageWithBody(events));
}

module.exports.getFolders = function getFolders(cfg, cb) {
    function processData(items) {
        console.log('Processing folder data ...');
        console.log(JSON.stringify(items));
        let result = {};
        _.forEach(items.value, function setItem(item) {
            result[item.id] = item.displayName;
        });
        return result;
    }

    console.log('Getting folder data ...');
    const instance = new ApiClient(cfg);
    return instance
      .get('/me/mailFolders')
      .then(processData)
      .nodeify(cb);
}
