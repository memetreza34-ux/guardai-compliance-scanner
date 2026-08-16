const express = require('express');
const { requireAuth } = require('../auth/supabaseAuth');

const router = express.Router();

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.auth.userId,
      email: req.auth.email,
    },
  });
});

module.exports = { authRoutes: router };
