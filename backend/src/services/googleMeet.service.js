const loadGoogleapis = async () => {
  try {
    // Dynamic import so the server can still boot even if `googleapis` isn't installed.
    const mod = await import('googleapis');
    return mod?.google || null;
  } catch {
    return null;
  }
};

const normalizePrivateKey = (key) => {
  if (!key) return key;
  // Private keys in env files often contain escaped newlines.
  return key.replace(/\\n/g, '\n');
};

export const createGoogleMeetLink = async ({
  topic,
  description,
  startTime,
  endTime,
  timezone = 'UTC',
}) => {
  const getFallback = () => {
    const fallbackId = Math.random().toString(36).substring(2, 12);
    return {
      googleMeetUrl: `https://meet.jit.si/coordo-${fallbackId}`,
      googleMeetId: `jitsi-${fallbackId}`
    };
  };

  const google = await loadGoogleapis();
  if (!google) return getFallback();

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY ? normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY) : '';
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!serviceAccountEmail || !privateKey) return getFallback();

  // Note: This uses a service account (no OAuth user consent flow).
  // The calendarId must be accessible to the service account.
  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: topic,
    description: description || '',
    start: { dateTime: startTime, timeZone: timezone },
    end: { dateTime: endTime, timeZone: timezone },
    conferenceData: {
      createRequest: {
        // Google Meet conference
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const resp = await calendar.events.insert({
    calendarId,
    requestBody: event,
    conferenceDataVersion: 1,
  });

  const entryPoints = resp?.data?.conferenceData?.entryPoints || [];
  const meetEntry = entryPoints.find((e) => e.entryPointType === 'video') || entryPoints[0];
  
  const googleMeetUrl = meetEntry?.uri || resp?.data?.hangoutLink || '';
  
  // If Google Calendar successfully created the event but refused to attach a Meet link 
  // (common with non-Workspace service accounts), fallback to Jitsi.
  if (!googleMeetUrl) {
    return getFallback();
  }

  return {
    googleMeetUrl,
    googleMeetId: resp?.data?.id || '',
  };
};

