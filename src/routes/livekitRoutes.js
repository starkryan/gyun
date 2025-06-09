const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const logger = require('../utils/logger');

const router = express.Router();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

if (!apiKey || !apiSecret) {
  logger.warn('LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set. LiveKit features will not work.');
}

router.post('/get-token', async (req, res) => {
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit server not configured' });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  res.json({ token });
});

module.exports = router;
