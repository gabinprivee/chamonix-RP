const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(guildId) {
  return path.join(DATA_DIR, `${guildId}.json`);
}

function defaultData() {
  return {
    config: {
      absence: { requestChannel: null, validationChannel: null, approverRole: null, tiers: [] },
      reactionRole: { channelId: null, messageId: null, emoji: null, roleId: null, excludedRoleId: null, link: null },
      rankup: { thresholdRole: null, ladder: [] },
      service: { channelId: null, adminRole: null },
      sanction: { requiredRole: null, logChannel: null, types: [] },
      avis: { channelId: null },
      annonce: { channelId: null, authorizedRole: null }
    },
    absences: {},
    service: {}
  };
}

function load(guildId) {
  const fp = filePath(guildId);
  if (!fs.existsSync(fp)) {
    const data = defaultData();
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    return data;
  }
  const raw = fs.readFileSync(fp, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    data = defaultData();
  }
  const def = defaultData();
  data.config = data.config || {};
  for (const key of Object.keys(def.config)) {
    data.config[key] = { ...def.config[key], ...(data.config[key] || {}) };
  }
  if (!data.absences) data.absences = {};
  if (!data.service) data.service = {};
  return data;
}

function save(guildId, data) {
  fs.writeFileSync(filePath(guildId), JSON.stringify(data, null, 2));
}

module.exports = { load, save };
