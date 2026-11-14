const router = require('express').Router();
router.use('/auth', require('./auth'));
router.use('/client', require('./client'));
router.use('/staff', require('./staff'));
router.use('/admin', require('./admin'));
router.use('/', require('./shared'));
module.exports = router;
