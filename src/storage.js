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
      staffRole: null,
      absence: { requestChannel: null, validationChannel: null, approverRole: null, tiers: [] },
      reactionRole: { channelId: null, messageId: null, emoji: null, roleId: null, excludedRoleId: null, link: null },
      rankup: {
        thresholdRole: null,
        derankThresholdRole: null,
        ladder: [],
        messageUp: null,
        messageDown: null
      },
      service: { channelId: null, adminRole: null, dashboard: { channelId: null, messageId: null } },
      sanction: { requiredRole: null, logChannel: null, types: [] },
      avis: { channelId: null },
      annonce: { channelId: null, authorizedRole: null },
      identity: { channelId: null },
      protection: {
        enabled: false,
        whitelist: [],
        whitelistRoles: [],
        logChannel: null,
        punishment: 'strip_roles',
        dangerousRoles: [],
        antiSpam: { maxMentions: 6, maxMessages: 6, intervalSeconds: 6 },
        escalationThreshold: 3,
        actionFlood: { threshold: 3, windowSeconds: 10 },
        raid: {
          thresholdJoins: 5,
          windowSeconds: 15,
          kickNewAccounts: false,
          newAccountMinDays: 3,
          tempLockdown: false,
          lockdownMinutes: 10
        }
      },
      backup: { channelId: null },
      welcome: { channelId: null, joinMessage: null, leaveMessage: null },
      captcha: { enabled: false, channelId: null, verifiedRole: null, unverifiedRole: null },
      jail: { role: null, logChannel: null },
      tickets: {
        panelChannelId: null,
        logChannel: null,
        reminderHours: 24,
        categories: [],
        counter: 0
      },
      automod: {
        enabled: false,
        bannedWords: [],
        blockInvites: false,
        logChannel: null
      },
      modlog: {
        messageEdit: null,
        messageDelete: null,
        nickname: null,
        voice: null
      },
      rules: {
        channelId: null,
        messageId: null,
        roleId: null,
        text: null,
        acceptedCount: 0
      },
      bda: {
        waitingChannelId: null,
        notifyChannelId: null,
        notifyRoleId: null
      }
    },
    absences: {},
    service: {},
    identities: {},
    jails: {},
    muteHistory: {},
    tickets: {},
    ruleAcceptances: {}
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
    const defVal = def.config[key];
    const isObject = defVal !== null && typeof defVal === 'object' && !Array.isArray(defVal);
    if (isObject) {
      data.config[key] = { ...defVal, ...(data.config[key] || {}) };
      // fusion d'un niveau supplémentaire pour les sous-objets (ex: protection.antiSpam)
      for (const subKey of Object.keys(defVal)) {
        const subDefVal = defVal[subKey];
        const subIsObject = subDefVal !== null && typeof subDefVal === 'object' && !Array.isArray(subDefVal);
        if (subIsObject) {
          data.config[key][subKey] = { ...subDefVal, ...(data.config[key][subKey] || {}) };
        }
      }
    } else if (data.config[key] === undefined) {
      data.config[key] = defVal;
    }
  }
  if (!data.absences) data.absences = {};
  if (!data.service) data.service = {};
  if (!data.identities) data.identities = {};
  if (!data.jails) data.jails = {};
  if (!data.muteHistory) data.muteHistory = {};
  if (!data.tickets) data.tickets = {};
  if (!data.ruleAcceptances) data.ruleAcceptances = {};
  return data;
}

function save(guildId, data) {
  fs.writeFileSync(filePath(guildId), JSON.stringify(data, null, 2));
}

module.exports = { load, save };
