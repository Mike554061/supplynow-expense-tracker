/**
 * Personal Expense Tool - Backend (Google Apps Script)
 * ------------------------------------------------------------------
 * Makes the ledger LIVE + DYNAMIC + SHARED across every device and user,
 * and saves every receipt photo into a Google Drive folder.
 *
 * ONE-TIME SETUP (about 60 seconds):
 *   1. Go to https://script.google.com  -  New project.
 *   2. Delete the sample code, paste ALL of this file, Save.
 *   3. Run the function `setup` once (top toolbar > Run).
 *      - Approve the permissions prompt (it creates a Drive folder + DB file
 *        in YOUR Drive and seeds the 15 current expenses).
 *   4. Deploy > New deployment > type "Web app".
 *        Execute as: Me      Who has access: Anyone
 *      Click Deploy, copy the /exec Web app URL.
 *   5. In the app, open Connect (top right), paste that URL, Save.
 *      (Send Mike the URL and he can bake it in so it's zero-config for all.)
 *
 * Re-deploy note: after editing code, Deploy > Manage deployments > edit >
 * "New version" so the live URL picks up changes.
 */

var APP_FOLDER   = 'Personal Expense Tool';
var DB_FILENAME  = 'ledger-db.json';
var PROP = PropertiesService.getScriptProperties();

/* ---------- one-time provisioning ---------- */
function setup() {
  var folder = getOrCreateFolder_(APP_FOLDER, null);
  var receipts = getOrCreateFolder_('Receipts', folder);
  var inbox = getOrCreateFolder_('Receipt Inbox (drop photos here to match)', folder);
  PROP.setProperty('FOLDER_ID', folder.getId());
  PROP.setProperty('RECEIPTS_ID', receipts.getId());
  PROP.setProperty('INBOX_ID', inbox.getId());

  // create DB file if missing, seeded with the 15 current expenses
  var dbId = PROP.getProperty('DB_ID');
  if (!dbId || !safeFileExists_(dbId)) {
    var seed = seedState_();
    var file = folder.createFile(DB_FILENAME, JSON.stringify(seed), 'application/json');
    PROP.setProperty('DB_ID', file.getId());
  }
  Logger.log('Setup complete.\nFolder: %s\nReceipts: %s\nInbox: %s\nDB: %s',
    folder.getUrl(), receipts.getUrl(), inbox.getUrl(), PROP.getProperty('DB_ID'));
  return 'OK — setup complete. Now Deploy as a Web app.';
}

/* ---------- HTTP entry points ---------- */
function doGet(e)  { return handle_(e, 'GET'); }
function doPost(e) { return handle_(e, 'POST'); }

function handle_(e, method) {
  var out, req = {};
  try {
    if (e && e.postData && e.postData.contents) req = JSON.parse(e.postData.contents);
    else if (e && e.parameter && e.parameter.payload) req = JSON.parse(e.parameter.payload);
    else if (e && e.parameter) req = e.parameter;
    var action = req.action || 'ping';
    out = route_(action, req);
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return json_(out);
}

function route_(action, req) {
  switch (action) {
    case 'ping':    return { ok: true, ready: !!PROP.getProperty('DB_ID'), ts: Date.now() };
    case 'login':   return login_(req);
    case 'pull':    return { ok: true, state: readDB_() };
    case 'push':    return push_(req);
    case 'upload':  return upload_(req);
    case 'inbox':   return { ok: true, images: listInbox_() };
    default:        return { ok: false, error: 'unknown action ' + action };
  }
}

/* ---------- auth ---------- */
function login_(req) {
  var db = readDB_();
  var u = (db.users || []).filter(function (x) {
    return String(x.email).toLowerCase() === String(req.email || '').toLowerCase() && x.pass === req.pass;
  })[0];
  if (!u) return { ok: false, error: 'Invalid email or password.' };
  return { ok: true, user: { email: u.email, name: u.name, admin: !!u.admin }, state: db };
}
function authed_(req) {
  var db = readDB_();
  return (db.users || []).some(function (x) {
    return String(x.email).toLowerCase() === String(req.email || '').toLowerCase() && x.pass === req.pass;
  });
}

/* ---------- state read / write ---------- */
function push_(req) {
  if (!authed_(req)) return { ok: false, error: 'Not authorized' };
  if (!req.state || !req.state.expenses) return { ok: false, error: 'No state' };
  writeDB_(req.state);
  return { ok: true, state: readDB_() };
}
function readDB_() {
  var id = PROP.getProperty('DB_ID');
  if (!id) return seedState_();
  try { return JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString()); }
  catch (e) { return seedState_(); }
}
function writeDB_(state) {
  var id = PROP.getProperty('DB_ID');
  DriveApp.getFileById(id).setContent(JSON.stringify(state));
}

/* ---------- receipts to Drive ---------- */
function upload_(req) {
  if (!authed_(req)) return { ok: false, error: 'Not authorized' };
  var m = String(req.dataUrl || '').match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return { ok: false, error: 'Bad image data' };
  var bytes = Utilities.base64Decode(m[2]);
  var ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  var name = (req.id || 'receipt') + '_' + Date.now() + '.' + ext;
  var blob = Utilities.newBlob(bytes, m[1], name);
  var folder = DriveApp.getFolderById(PROP.getProperty('RECEIPTS_ID'));
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { ok: true, fileId: file.getId(),
    thumb: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w600',
    view:  'https://drive.google.com/uc?export=view&id=' + file.getId() };
}

/* list unmatched photos dropped into the Inbox folder (for "find photos in drive and match") */
function listInbox_() {
  var id = PROP.getProperty('INBOX_ID');
  if (!id) return [];
  var it = DriveApp.getFolderById(id).getFiles(), out = [];
  while (it.hasNext()) {
    var f = it.next();
    if (f.getMimeType().indexOf('image/') !== 0) continue;
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    out.push({ fileId: f.getId(), name: f.getName(), date: f.getDateCreated().toISOString().slice(0,10),
      thumb: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w600',
      view:  'https://drive.google.com/uc?export=view&id=' + f.getId() });
  }
  return out;
}

/* ---------- helpers ---------- */
function getOrCreateFolder_(name, parent) {
  var it = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
}
function safeFileExists_(id) { try { DriveApp.getFileById(id); return true; } catch (e) { return false; } }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- seed data (mirrors the source spec sheet) ---------- */
function seedState_() {
  var users = [
    { email: 'mike@supplynow.org',  name: 'Mike',  pass: 'Supplynow1!', admin: true  },
    { email: 'aaron@supplynow.org', name: 'Aaron', pass: 'Supplynow1!', admin: false }
  ];
  var rows = [
    ['R001','2026-07-21','Lakewood Hardware','Repairs & Maintenance',9.27,'Personal Credit','Apple Card','Recent unpaid item (Apple Card).'],
    ['R002','2026-07-25','AutoZone','Vehicle Parts',18.98,'Personal Credit','Apple Card','Recent unpaid item (Apple Card).'],
    ['R003','2026-07-27','Alex Cruz','Fuel',50,'Apple Cash','Apple Cash txn 0e9c594d76c2','RHO card declined'],
    ['R004','2026-07-27','Alex Cruz','Fuel',30,'Apple Cash','Apple Cash txn d89cf61b3f7c','RHO card declined'],
    ['R005','2026-07-27','Daniel Hernandez','Fuel',80,'Apple Cash','Apple Cash txn 67f4c12a1f7a','Fuel advance'],
    ['R006','2026-07-27','Daniel Hernandez','Fuel',80,'Apple Cash','Apple Cash txn 482068e31fcc','Fuel advance'],
    ['R007','2026-07-27','Alex Cruz','Fuel',75,'Apple Cash','Apple Cash txn cd2894d731f3','RHO card declined'],
    ['R008','2026-07-28','Damonte Smiley','Fuel',80,'Apple Cash','Apple Cash txn b357d9a860b7','Fuel advance'],
    ['R009','2026-07-29','Shameria New','Fuel',50,'Apple Cash','Apple Cash txn 8fce7ab79e34','Fuel advance'],
    ['R010','2026-07-31','Alex Cruz','Fuel',50,'Apple Cash','Apple Cash txn adf25192861d','Card declined'],
    ['R011','2026-07-31','AutoZone','Vehicle Parts',51.83,'Personal Credit','Apple Card txn D8F89AE7AC70','Recent unpaid item'],
    ['R012','2026-07-31','Lakewood Hardware','Repairs & Maintenance',21.08,'Personal Credit','Apple Card txn 258211CA2263','Recent unpaid item'],
    ['R013','2026-08-03','Daniel Hernandez','Fuel',65,'Apple Cash','','Gas card declined'],
    ['R014','2026-08-03','Marathon','Fuel',150,'Personal Credit','Apple Card — PENDING','Fuel (pending)'],
    ['R015','2026-08-04','Alex Cruz','Fuel',90,'Apple Cash','Apple Cash txn 9c2e040b901a','Fuel card declining']
  ];
  var expenses = rows.map(function (r) {
    return { id:r[0], date:r[1], payee:r[2], cc:r[3], amount:r[4], reimbursed:0,
      method:r[5], ref:r[6], notes:r[7], status:'Submitted', receiptFileId:null, img:null,
      dateReimbursed:null, createdBy:'seed' };
  });
  return { users: users, expenses: expenses, deposits: [] };
}
