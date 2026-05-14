// ================================================================
// lazymaxpotential.kr — Google Apps Script 백엔드
// 역할: 폼 응답을 Google Sheets에 기록하는 전용 백엔드
//       (사용자 인증은 Firebase Firestore에서 처리 — 여기서 담당 안 함)
//
// 배포: 웹앱 → 다음 사용자로 실행: 나(본인) → 액세스: 모든 사용자(익명 포함)
// ================================================================

// 새로 생성되는 모든 시트에 자동 편집자 공유할 계정 목록
const SHARED_EDITORS = ['itsbeybusiness@gmail.com', 'baekeun0@gmail.com'];

// ── 권한 부여용 테스트 함수 (GAS 편집기에서 한 번 실행 후 삭제해도 됨) ──
function testCreateSheet() {
  const ss = SpreadsheetApp.create('권한 테스트 (삭제하세요)');
  Logger.log('OK: ' + ss.getUrl());
  DriveApp.getFileById(ss.getId()).setTrashed(true); // 생성 후 바로 휴지통으로
}

// ── 공통 JSON 응답 ──
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// GET 요청 — 새 스프레드시트 생성
// ?action=createSheet&title=폼제목&headers=["제출일시","항목1","항목2"]
// ================================================================
function doGet(e) {
  const action = e.parameter.action || '';

  if (action === 'createSheet') {
    const title = e.parameter.title || '폼 응답';
    let headers = [];
    try { headers = JSON.parse(e.parameter.headers || '[]'); } catch (_) {}
    try {
      const newSS = SpreadsheetApp.create(title);
      const sheet = newSS.getActiveSheet();
      sheet.setName('응답');
      if (headers.length) {
        const headerRow = sheet.getRange(1, 1, 1, headers.length);
        headerRow.setValues([headers]);
        headerRow.setFontWeight('bold');
        headerRow.setBackground('#f3f3f3');
        sheet.setFrozenRows(1);
      }
      // 지정된 계정에 편집 권한 자동 공유
      SHARED_EDITORS.forEach(function(email) {
        try { DriveApp.getFileById(newSS.getId()).addEditor(email); } catch(_) {}
      });
      return json({ success: true, sheetId: newSS.getId(), url: newSS.getUrl() });
    } catch (err) {
      return json({ success: false, error: err.message });
    }
  }

  if (action === 'getCalendars') {
    try {
      const cals = CalendarApp.getAllCalendars();
      return json({ success: true, calendars: cals.map(c => ({ id: c.getId(), name: c.getName() })) });
    } catch(err) { return json({ success: false, error: err.message }); }
  }

  if (action === 'getCalendarEvents') {
    try {
      const calId = e.parameter.calendarId;
      const cal   = calId ? CalendarApp.getCalendarById(calId) : CalendarApp.getDefaultCalendar();
      if (!cal) return json({ success: false, error: '캘린더를 찾을 수 없습니다.' });
      const start = new Date(e.parameter.start);
      const end   = new Date(e.parameter.end);
      const events = cal.getEvents(start, end)
        .filter(ev => !ev.isAllDayEvent())
        .map(ev => ({
          id: ev.getId(), title: ev.getTitle(),
          start: ev.getStartTime().toISOString(),
          end:   ev.getEndTime().toISOString()
        }));
      return json({ success: true, events });
    } catch(err) { return json({ success: false, error: err.message }); }
  }

  return json({ success: false, error: '알 수 없는 action: ' + action });
}

// ================================================================
// POST 요청 — 폼 응답 행 추가 / 일괄 추가
// ================================================================
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action || '';

    if (action === 'bulkAppend') {
      const sheetId  = data.sheetId;
      const sheetTab = data.sheetTab || '응답';
      const rows     = data.rows || [];
      if (!sheetId) return json({ success: false, error: 'sheetId 없음' });
      const ss    = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName(sheetTab) || ss.getActiveSheet();
      rows.forEach(function(row) { sheet.appendRow(row); });
      return json({ success: true, count: rows.length });
    }

    if (action === 'submitForm') {
      const sheetId  = data.sheetId;
      const sheetTab = data.sheetTab || '응답';
      const row      = data.row     || [];
      const headers  = data.headers || [];

      if (!sheetId) return json({ success: false, error: 'sheetId 없음' });

      const ss    = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName(sheetTab) || ss.getActiveSheet();

      if (sheet.getLastRow() === 0 && headers.length) {
        const headerRow = sheet.getRange(1, 1, 1, headers.length);
        headerRow.setValues([headers]);
        headerRow.setFontWeight('bold');
        headerRow.setBackground('#f3f3f3');
        sheet.setFrozenRows(1);
      }

      sheet.appendRow(row);
      return json({ success: true });
    }

    if (action === 'saveFilesToDrive') {
      const folderName = data.folderName || '폼_파일모음';
      const files = data.files || [];
      try {
        var folder;
        var folderIter = DriveApp.getFoldersByName(folderName);
        if (folderIter.hasNext()) {
          folder = folderIter.next();
        } else {
          folder = DriveApp.createFolder(folderName);
          SHARED_EDITORS.forEach(function(email) {
            try { folder.addEditor(email); } catch(_) {}
          });
        }
        var savedCount = 0;
        files.forEach(function(f) {
          try {
            var response = UrlFetchApp.fetch(f.url, {muteHttpExceptions: true});
            if (response.getResponseCode() !== 200) return;
            var blob = response.getBlob();
            var contentType = blob.getContentType() || 'application/octet-stream';
            var ext = contentType.split('/').pop().replace('jpeg','jpg');
            blob.setName(f.fileName + '.' + ext);
            folder.createFile(blob);
            savedCount++;
          } catch(err) {}
        });
        return json({ success: true, savedCount: savedCount, folderUrl: folder.getUrl() });
      } catch(err) {
        return json({ success: false, error: err.message });
      }
    }

    if (action === 'updateFormRow') {
      const sheetId   = data.sheetId;
      const sheetTab  = data.sheetTab || '응답';
      const responseId = data.responseId;
      const row       = data.row || [];
      if (!sheetId || !responseId) return json({ success: false, error: 'sheetId 또는 responseId 없음' });
      const ss    = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName(sheetTab) || ss.getActiveSheet();
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      // _응답ID가 저장된 마지막 열에서 responseId 검색
      for (var r = 2; r <= lastRow; r++) {
        if (sheet.getRange(r, lastCol).getValue() === responseId) {
          sheet.getRange(r, 1, 1, row.length).setValues([row]);
          return json({ success: true, updated: true });
        }
      }
      // 못 찾으면 새 행 추가
      sheet.appendRow(row);
      return json({ success: true, updated: false });
    }

    if (action === 'createCalendarEvent') {
      const calId = data.calendarId;
      const cal   = calId ? CalendarApp.getCalendarById(calId) : CalendarApp.getDefaultCalendar();
      if (!cal) return json({ success: false, error: '캘린더를 찾을 수 없습니다.' });
      const ev = cal.createEvent(
        data.title,
        new Date(data.start),
        new Date(data.end),
        { description: data.description || '' }
      );
      return json({ success: true, eventId: ev.getId() });
    }

    return json({ success: false, error: '알 수 없는 action: ' + action });
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}
