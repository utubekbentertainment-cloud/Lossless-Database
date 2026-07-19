export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const payload = {
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20231214.00.00",
        gl: "US",
        hl: "en"
      }
    },
    query: query,
    params: "EgWKAQIIAWoMEAMQBBAJEA4QChAF"
  };

  try {
    const ytRes = await fetch('https://music.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    });

    if (!ytRes.ok) {
      throw new Error(`YouTube API returned ${ytRes.status}`);
    }

    const data = await ytRes.json();
    let songs = [];

    // Helper function to recursively find all musicResponsiveListItemRenderer
    function extractSongs(obj) {
      if (!obj) return;
      if (Array.isArray(obj)) {
        for (let item of obj) extractSongs(item);
      } else if (typeof obj === 'object') {
        if (obj.musicResponsiveListItemRenderer) {
          const item = obj.musicResponsiveListItemRenderer;
          const flexColumns = item.flexColumns;
          if (flexColumns && flexColumns.length >= 2) {
            const titleObj = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0];
            const title = titleObj?.text;
            
            const detailsRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            let artist = '';
            for(let run of detailsRuns) {
               if(run.text === ' • ') break;
               if(run.text === 'Song') continue;
               if(run.text === 'Video') continue;
               artist += run.text;
            }
            
            const thumbnails = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';

            if (title && artist) {
              // Prevent duplicates
              if (!songs.find(s => s.title === title && s.artist === artist)) {
                songs.push({ title, artist, thumbnail });
              }
            }
          }
        }
        for (let key in obj) {
          if (key !== 'musicResponsiveListItemRenderer') {
            extractSongs(obj[key]);
          }
        }
      }
    }

    extractSongs(data.contents);

    return new Response(JSON.stringify({ results: songs.slice(0, 15) }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
