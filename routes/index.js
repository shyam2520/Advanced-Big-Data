var express = require('express');
var router = express.Router();
const [healthCheck,client] = require('../middlewares/healthCheck');
const planRouter = require('./planEndpoint');
/* GET home page. */
router.get('/test', healthCheck, function (req, res, next) {
  res.status(200).send('Connected to Redis');
});


router.use('/v1', planRouter);
router.use((req, res) => {

  res.status(404).send('Not Found');
})

module.exports = router;
