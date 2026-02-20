const path = require('path');
const config = require('../../../config/config');

function registerConfigRoutes(gameServer) {
  gameServer.app.get('/app-config.js', (req, res) => {
    res
      .type('application/javascript')
      .send(`window.SHARED_CONFIG = ${JSON.stringify(require('../../../config/shared'))};`);
  });

  gameServer.app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', '..', 'public', 'index.html'));
  });

  gameServer.app.get('/api/version', (req, res) => {
    res.json({
      version: config.APP_VERSION,
      commitSha: config.COMMIT_SHA,
      environment: config.NODE_ENV,
    });
  });

  gameServer.app.get('/api/config', (req, res) => {
    res.json(require('../../../config/shared'));
  });
}

module.exports = registerConfigRoutes;
