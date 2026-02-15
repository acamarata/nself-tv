const express = require('express');
const { Server: SSDPServer } = require('node-ssdp');
const xml2js = require('xml2js');
const { Pool } = require('pg');
const os = require('os');
const { createLogger, requestIdMiddleware } = require('../../lib/logger');

const app = express();
const port = process.env.PORT || 3101;
const logger = createLogger('dlna-server');

// Add request ID middleware
app.use(requestIdMiddleware(logger));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get server IP
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const serverIP = getServerIP();
const serverURL = `http://${serverIP}:${port}`;

// SSDP Server for device discovery
const ssdp = new SSDPServer({
  location: `${serverURL}/device.xml`,
  sourcePort: 1900,
  udn: 'uuid:nself-tv-dlna-server',
  ttl: 1800,
});

ssdp.addUSN('upnp:rootdevice');
ssdp.addUSN('urn:schemas-upnp-org:device:MediaServer:1');
ssdp.addUSN('urn:schemas-upnp-org:service:ContentDirectory:1');
ssdp.addUSN('urn:schemas-upnp-org:service:ConnectionManager:1');

// Device description XML
app.get('/device.xml', (req, res) => {
  const deviceDesc = {
    root: {
      $: {
        xmlns: 'urn:schemas-upnp-org:device-1-0',
      },
      specVersion: {
        major: 1,
        minor: 0,
      },
      device: {
        deviceType: 'urn:schemas-upnp-org:device:MediaServer:1',
        friendlyName: 'ɳSelf TV Media Server',
        manufacturer: 'ɳSelf',
        manufacturerURL: 'https://nself.org',
        modelDescription: 'ɳSelf TV DLNA/UPnP Media Server',
        modelName: 'ɳSelf TV',
        modelNumber: '0.9.0',
        modelURL: 'https://nself.org/tv',
        serialNumber: '00000001',
        UDN: 'uuid:nself-tv-dlna-server',
        serviceList: {
          service: [
            {
              serviceType: 'urn:schemas-upnp-org:service:ContentDirectory:1',
              serviceId: 'urn:upnp-org:serviceId:ContentDirectory',
              SCPDURL: '/ContentDirectory.xml',
              controlURL: '/ContentDirectory/control',
              eventSubURL: '/ContentDirectory/event',
            },
            {
              serviceType: 'urn:schemas-upnp-org:service:ConnectionManager:1',
              serviceId: 'urn:upnp-org:serviceId:ConnectionManager',
              SCPDURL: '/ConnectionManager.xml',
              controlURL: '/ConnectionManager/control',
              eventSubURL: '/ConnectionManager/event',
            },
          ],
        },
      },
    },
  };

  const builder = new xml2js.Builder();
  res.set('Content-Type', 'text/xml');
  res.send(builder.buildObject(deviceDesc));
});

// ContentDirectory service description
app.get('/ContentDirectory.xml', (req, res) => {
  const scpd = {
    scpd: {
      $: { xmlns: 'urn:schemas-upnp-org:service-1-0' },
      specVersion: { major: 1, minor: 0 },
      actionList: {
        action: [
          {
            name: 'Browse',
            argumentList: {
              argument: [
                { name: 'ObjectID', direction: 'in', relatedStateVariable: 'A_ARG_TYPE_ObjectID' },
                { name: 'BrowseFlag', direction: 'in', relatedStateVariable: 'A_ARG_TYPE_BrowseFlag' },
                { name: 'Filter', direction: 'in', relatedStateVariable: 'A_ARG_TYPE_Filter' },
                { name: 'StartingIndex', direction: 'in', relatedStateVariable: 'A_ARG_TYPE_Index' },
                { name: 'RequestedCount', direction: 'in', relatedStateVariable: 'A_ARG_TYPE_Count' },
                { name: 'SortCriteria', direction: 'in', relatedStateVariable: 'A_ARG_TYPE_SortCriteria' },
                { name: 'Result', direction: 'out', relatedStateVariable: 'A_ARG_TYPE_Result' },
                { name: 'NumberReturned', direction: 'out', relatedStateVariable: 'A_ARG_TYPE_Count' },
                { name: 'TotalMatches', direction: 'out', relatedStateVariable: 'A_ARG_TYPE_Count' },
                { name: 'UpdateID', direction: 'out', relatedStateVariable: 'A_ARG_TYPE_UpdateID' },
              ],
            },
          },
        ],
      },
      serviceStateTable: {
        stateVariable: [
          { name: 'A_ARG_TYPE_ObjectID', dataType: 'string' },
          { name: 'A_ARG_TYPE_Result', dataType: 'string' },
          { name: 'A_ARG_TYPE_BrowseFlag', dataType: 'string', allowedValueList: { allowedValue: ['BrowseMetadata', 'BrowseDirectChildren'] } },
          { name: 'A_ARG_TYPE_Filter', dataType: 'string' },
          { name: 'A_ARG_TYPE_SortCriteria', dataType: 'string' },
          { name: 'A_ARG_TYPE_Index', dataType: 'ui4' },
          { name: 'A_ARG_TYPE_Count', dataType: 'ui4' },
          { name: 'A_ARG_TYPE_UpdateID', dataType: 'ui4' },
        ],
      },
    },
  };

  const builder = new xml2js.Builder();
  res.set('Content-Type', 'text/xml');
  res.send(builder.buildObject(scpd));
});

// ConnectionManager service description
app.get('/ConnectionManager.xml', (req, res) => {
  const scpd = {
    scpd: {
      $: { xmlns: 'urn:schemas-upnp-org:service-1-0' },
      specVersion: { major: 1, minor: 0 },
      actionList: {
        action: [
          {
            name: 'GetProtocolInfo',
            argumentList: {
              argument: [
                { name: 'Source', direction: 'out', relatedStateVariable: 'SourceProtocolInfo' },
                { name: 'Sink', direction: 'out', relatedStateVariable: 'SinkProtocolInfo' },
              ],
            },
          },
        ],
      },
      serviceStateTable: {
        stateVariable: [
          { name: 'SourceProtocolInfo', dataType: 'string' },
          { name: 'SinkProtocolInfo', dataType: 'string' },
        ],
      },
    },
  };

  const builder = new xml2js.Builder();
  res.set('Content-Type', 'text/xml');
  res.send(builder.buildObject(scpd));
});

// ContentDirectory Browse action
app.post('/ContentDirectory/control', express.text({ type: 'text/xml' }), async (req, res) => {
  try {
    const parser = new xml2js.Parser();
    const body = await parser.parseStringPromise(req.body);

    const action = Object.keys(body['s:Envelope']['s:Body'][0])[0];

    if (action === 'u:Browse') {
      const args = body['s:Envelope']['s:Body'][0]['u:Browse'][0];
      const objectId = args.ObjectID[0];
      const browseFlag = args.BrowseFlag[0];
      const startingIndex = parseInt(args.StartingIndex[0]) || 0;
      const requestedCount = parseInt(args.RequestedCount[0]) || 100;

      let didlItems = [];
      let totalMatches = 0;

      if (objectId === '0') {
        // Root containers
        didlItems = [
          createContainer('1', '0', 'Movies'),
          createContainer('2', '0', 'TV Shows'),
          createContainer('3', '0', 'Music'),
          createContainer('4', '0', 'Podcasts'),
        ];
        totalMatches = didlItems.length;
      } else {
        // Query media items
        const typeMap = {
          '1': 'movie',
          '2': 'series',
          '3': 'music',
          '4': 'podcast',
        };

        const type = typeMap[objectId];

        const result = await pool.query(`
          SELECT m.id, m.title, m.description, m.year, m.poster_url, mv.url, mv.format, mv.file_size_bytes
          FROM media_items m
          LEFT JOIN media_variants mv ON mv.media_item_id = m.id
          WHERE m.type = $1
          ORDER BY m.created_at DESC
          LIMIT $2 OFFSET $3
        `, [type, requestedCount, startingIndex]);

        const countResult = await pool.query(`
          SELECT COUNT(*) as total FROM media_items WHERE type = $1
        `, [type]);

        totalMatches = parseInt(countResult.rows[0].total);

        didlItems = result.rows.map(row => createItem(row, objectId));
      }

      const didl = createDIDL(didlItems);

      const response = createSOAPResponse('Browse', {
        Result: didl,
        NumberReturned: didlItems.length,
        TotalMatches: totalMatches,
        UpdateID: 0,
      });

      res.set('Content-Type', 'text/xml');
      res.send(response);
    } else {
      res.status(501).send('Action not implemented');
    }
  } catch (error) {
    logger.error('DLNA request failed', { error, action: req.body });
    res.status(500).send('Internal server error');
  }
});

// ConnectionManager GetProtocolInfo action
app.post('/ConnectionManager/control', express.text({ type: 'text/xml' }), (req, res) => {
  const protocols = [
    'http-get:*:video/mp4:*',
    'http-get:*:video/x-matroska:*',
    'http-get:*:audio/mpeg:*',
    'http-get:*:audio/mp4:*',
    'http-get:*:image/jpeg:*',
  ].join(',');

  const response = createSOAPResponse('GetProtocolInfo', {
    Source: protocols,
    Sink: '',
  });

  res.set('Content-Type', 'text/xml');
  res.send(response);
});

// Helper functions
function createContainer(id, parentId, title) {
  return `<container id="${id}" parentID="${parentId}" restricted="1">
    <dc:title>${title}</dc:title>
    <upnp:class>object.container</upnp:class>
  </container>`;
}

function createItem(row, parentId) {
  const mimeType = row.format === 'mp4' ? 'video/mp4' : 'video/x-matroska';

  return `<item id="${row.id}" parentID="${parentId}" restricted="1">
    <dc:title>${escapeXml(row.title)}</dc:title>
    <dc:description>${escapeXml(row.description || '')}</dc:description>
    <upnp:class>object.item.videoItem</upnp:class>
    <res protocolInfo="http-get:*:${mimeType}:*" size="${row.file_size_bytes || 0}">${escapeXml(row.url || '')}</res>
    <upnp:albumArtURI>${escapeXml(row.poster_url || '')}</upnp:albumArtURI>
  </item>`;
}

function createDIDL(items) {
  return `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">
${items.join('\n')}
</DIDL-Lite>`;
}

function createSOAPResponse(action, data) {
  const args = Object.entries(data)
    .map(([key, value]) => `<${key}>${escapeXml(String(value))}</${key}>`)
    .join('');

  return `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action}Response xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
      ${args}
    </u:${action}Response>
  </s:Body>
</s:Envelope>`;
}

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dlna-server' });
});

// Start SSDP advertisement
ssdp.start();
logger.info('SSDP server started', { url: serverURL });

// Start HTTP server
app.listen(port, () => {
  logger.info('DLNA server started', {
    port,
    deviceUrl: `${serverURL}/device.xml`,
    serverIP,
  });
});

// Cleanup on exit
process.on('SIGTERM', () => {
  ssdp.stop();
  process.exit(0);
});

module.exports = app;
