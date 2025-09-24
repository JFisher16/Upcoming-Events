// netlify/functions/events.js
// Works on free Netlify. Includes CORS + a sample response if env vars aren’t set yet.

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const url = process.env.TOUCHPOINT_EVENTS_URL;
    const key = process.env.TOUCHPOINT_API_KEY;

    let raw;

    if (url && key) {
      // Real TouchPoint fetch — swap headers to match your tenant
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` }
      });
      if (!res.ok) {
        return { statusCode: res.status, headers, body: JSON.stringify({ error: 'Upstream error' }) };
      }
      raw = await res.json();
    } else {
      // ✅ Mock data so you can test everything before the API is ready
      raw = {
        items: [
          {
            id: 'sample-1',
            Name: 'CityBridge Worship Night',
            StartDateTime: new Date(Date.now() + 86400000).toISOString(),
            EndDateTime: new Date(Date.now() + 90000000).toISOString(),
            LocationName: 'Main Auditorium',
            Description: 'An evening of worship and prayer.',
            ThumbnailUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
            DetailUrl: 'https://www.citybridgechurch.org/events'
          },
          {
            id: 'sample-2',
            Name: 'Student Gathering',
            StartDateTime: new Date(Date.now() + 3*86400000).toISOString(),
            EndDateTime: new Date(Date.now() + 3*86400000 + 7200000).toISOString(),
            LocationName: 'Student Center',
            Description: 'Food, games, teaching.',
            ThumbnailUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe',
            DetailUrl: 'https://www.citybridgechurch.org/events'
          }
        ]
      };
    }

    // Normalize → the shape your Squarespace script expects
    const items = raw.items || raw || [];
    const events = items.map(ev => ({
      id: ev.id || ev.EventId || ev.MeetingId,
      title: ev.title || ev.Name || ev.EventName,
      start: ev.start || ev.StartDate || ev.StartDateTime,
      end: ev.end || ev.EndDate || ev.EndDateTime,
      location: ev.location || ev.LocationName || ev.Room || '',
      image: ev.imageUrl || ev.ThumbnailUrl || '',
      summary: ev.summary || ev.Description || '',
      detailUrl: ev.url || ev.DetailUrl || '',
      tags: ev.tags || ev.Categories || []
    }));

    const now = new Date();
    const upcoming = events
      .filter(e => e.start ? new Date(e.start) >= now : true)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    return { statusCode: 200, headers, body: JSON.stringify({ events: upcoming }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
