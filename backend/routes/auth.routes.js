/**
 * ruts de autenticacion
 * define los endpoints para registro login y gestion de perfil
 */

//importar router de express
const express = require('express');
const router = express.Router();

//importar controladores de autenticacion
const {
    registrar,
    login,
    getMe,
    updateMe,
    changePassword
} = require ('../controllers/auth.controller');

//importar middleware
const { verificarAuth } = require('../middleware/auth');

//rutas publicas
router.post('/registrar', registrar);

router.post('/login', login);

//rutas protegidas

router.get('/me', verificarAuth, getMe);

router.put('/me', verificarAuth, updateMe);

router.put('/change-password', verificarAuth, changePassword);

//exportar router
module.exports = router;