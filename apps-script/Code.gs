// ================================================================
// lazymaxpotential.kr — Google Apps Script 백엔드
// 배포: 웹앱 → 액세스: 모든 사용자(익명 포함)
// ================================================================

const MAIN_SHEET_ID = '1e6nyZ4fv-QPPX1SZqgakM4eJmBO1Rp-sdfkUtJFgwK8';

// ── 공통 JSON 응답 ──
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── CORS 허용 헤더 (OPTIONS preflight 처리) ──
function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

// ================================================================
// GET 요청 처리
// ================================================================
function doGet(e) {
  const action = e.parameter.action || '';

  // ── 셀러 인증 ──
  if (action === 'auth') {
    const phone = (e.parameter.phone || '').replace(/\D/g, '');
    try {
      const ss = SpreadsheetApp.openById(MAIN_SHEET_ID);
      const sheet = ss.getSheetByName('sellers');
      if (!sheet) return json({ success: false, error: 'sellers 시트 없음' });
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).replace(/\D/g, '') === phone)
          return json({ success: true, seller: { name: rows[i][0], phone: rows[i][1] } });
      }
      return json({ success: false });
    } catch (err) {
      return json({ success: false, error: err.message });
    }
  }

  // ── 폼용 새 스프레드시트 생성 ──
  // ?action=createSheet&title=폼제목&headers=["제출일시","이름","연락처"]
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
      // 편집 권한을 공유 — 관리자가 직접 열 수 있도록
      newSS.addEditor(Session.getActiveUser().getEmail());
      return json({ success: true, sheetId: newSS.getId(), url: newSS.getUrl() });
    } catch (err) {
      return json({ success: false, error: err.message });
    }
  }

  return json({ success: false, error: '알 수 없는 action: ' + action });
}

// ================================================================
// POST 요청 처리 — 폼 응답 제출
// ================================================================
// body JSON:
// {
//   action: 'submitForm',
//   sheetId: '스프레드시트ID',
//   headers: ['제출일시', '항목1', '항목2', ...],   // 시트가 비어있을 때만 사용
//   row: ['2025-05-04 14:30', '값1', '값2', ...]
// }
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || '';

    if (action === 'submitForm') {
      const sheetId = data.sheetId;
      const row     = data.row     || [];
      const headers = data.headers || [];

      if (!sheetId) return json({ success: false, error: 'sheetId 없음' });

      const ss    = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName('응답') || ss.getActiveSheet();

      // 시트가 비어 있으면 헤더 먼저 작성
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

    return json({ success: false, error: '알 수 없는 action: ' + action });
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}
