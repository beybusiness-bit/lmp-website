// ================================================================
// lazymaxpotential.kr — Google Apps Script 백엔드
// 역할: 폼 응답을 Google Sheets에 기록하는 전용 백엔드
//       (사용자 인증은 Firebase Firestore에서 처리 — 여기서 담당 안 함)
//
// 배포: 웹앱 → 다음 사용자로 실행: 나(본인) → 액세스: 모든 사용자(익명 포함)
// ================================================================

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
      return json({ success: true, sheetId: newSS.getId(), url: newSS.getUrl() });
    } catch (err) {
      return json({ success: false, error: err.message });
    }
  }

  return json({ success: false, error: '알 수 없는 action: ' + action });
}

// ================================================================
// POST 요청 — 폼 응답 행 추가
// body: {
//   action: 'submitForm',
//   sheetId: '스프레드시트ID',
//   headers: ['제출일시', '항목1', ...],  // 시트 비어있을 때만 사용
//   row:     ['2025-05-04 14:30', '값1', ...]
// }
// ================================================================
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action || '';

    if (action === 'submitForm') {
      const sheetId = data.sheetId;
      const row     = data.row     || [];
      const headers = data.headers || [];

      if (!sheetId) return json({ success: false, error: 'sheetId 없음' });

      const ss    = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName('응답') || ss.getActiveSheet();

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
