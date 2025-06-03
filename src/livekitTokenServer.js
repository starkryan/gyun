// server.js
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

const createToken = async () => {
  // If this room doesn't exist, it'll be automatically created when the first
  // participant joins
  const roomName = 'quickstart-room';
  // Identifier to be used for participant.
  // It's available as LocalParticipant.identity with livekit-client SDK
  const participantName = 'quickstart-username';

  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in environment variables.');
  }

  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantName,
    // Token to expire after 10 minutes
    ttl: '10m', // Default is 6 hours, '10m' is a good short-term value for testing
  });
  at.addGrant({ roomJoin: true, room: roomName });

  return await at.toJwt();
};

const app = express();
const port = 3000; // You might want to make this configurable via process.env.PORT

app.get('/getToken', async (req, res) => {
  try {
    const token = await createToken();
    res.send(token);
  } catch (error) {
    console.error('Failed to create token:', error);
    res.status(500).send('Failed to generate token');
  }
});

app.listen(port, () => {
  console.log(`LiveKit token server listening on port ${port}`);
  console.log(`Access token endpoint: http://localhost:${port}/getToken`);
  console.log('Ensure LIVEKIT_API_KEY and LIVEKIT_API_SECRET are set via development.env');
});
