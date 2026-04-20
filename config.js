/**
 * Netlify Function: config
 * Path: /.netlify/functions/config
 * Returns public config values to the frontend (keeps sensitive stuff server-side)
 */

export const handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({
    tallyUrl: process.env.TALLY_FORM_URL || '',
  }),
});
