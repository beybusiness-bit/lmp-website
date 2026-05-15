#!/usr/bin/env node
/**
 * sync-projects.js
 *
 * p/index.html 템플릿을 기반으로, 저장소 내 모든 프로젝트 플레이어 파일을 동기화한다.
 * Vercel 빌드 시(buildCommand) 자동 실행되므로 p/index.html만 수정하면
 * 모든 프로젝트에 자동 반영된다.
 *
 * 프로젝트 파일 판별 기준:
 *   {디렉토리}/index.html 에 `const PROJECT_ID = '{디렉토리명}'` 패턴이 존재하면 대상으로 처리.
 *
 * OG 메타태그·타이틀 보존:
 *   기존 파일에서 og: 메타태그와 <title>을 추출해 새 템플릿에 다시 주입한다.
 *   admin에서 설정한 SNS 공유 미리보기 정보가 동기화 후에도 유지된다.
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'p', 'index.html');

const TEMPLATE_ID_LINE = "new URLSearchParams(location.search).get('id') || ''";

if (!fs.existsSync(TEMPLATE)) {
  console.error('❌ p/index.html 템플릿을 찾을 수 없습니다.');
  process.exit(1);
}

const templateContent = fs.readFileSync(TEMPLATE, 'utf8');

const entries = fs.readdirSync(ROOT, { withFileTypes: true });
const projectDirs = entries
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(name => {
    const htmlPath = path.join(ROOT, name, 'index.html');
    if (!fs.existsSync(htmlPath)) return false;
    const content = fs.readFileSync(htmlPath, 'utf8');
    return content.includes(`const PROJECT_ID = '${name}'`);
  });

if (projectDirs.length === 0) {
  console.log('동기화할 프로젝트 파일이 없습니다.');
  process.exit(0);
}

let syncedCount = 0;
projectDirs.forEach(projectId => {
  const outPath = path.join(ROOT, projectId, 'index.html');

  // 기존 파일에서 OG 메타태그와 타이틀 추출 (보존)
  let ogBlock = null;
  let titleTag = null;

  if (fs.existsSync(outPath)) {
    const existing = fs.readFileSync(outPath, 'utf8');

    // og: 메타태그 + description 메타태그 추출
    const ogMatches = existing.match(/<meta\s[^>]*property="og:[^"]*"[^>]*>/g) || [];
    const descMatch = existing.match(/<meta\s[^>]*name="description"[^>]*>/g) || [];
    const allOg = [...ogMatches, ...descMatch];
    if (allOg.length > 0) {
      ogBlock = allOg.join('\n');
    }

    // <title> 추출 (기본값이 아닌 경우만)
    const titleMatch = existing.match(/<title>([^<]*)<\/title>/);
    if (titleMatch && titleMatch[1] !== '준비 포털') {
      titleTag = titleMatch[0];
    }
  }

  // 템플릿 기반으로 새 파일 생성
  let newContent = templateContent.replace(TEMPLATE_ID_LINE, `'${projectId}'`);

  // OG 태그 복원 (기존에 있었으면)
  if (ogBlock) {
    newContent = newContent.replace('<!-- OG_META -->', ogBlock);
  }

  // 타이틀 복원 (기존에 프로젝트 이름으로 설정됐으면)
  if (titleTag) {
    newContent = newContent.replace(/<title>[^<]*<\/title>/, titleTag);
  }

  fs.writeFileSync(outPath, newContent, 'utf8');
  console.log(`✅ ${projectId}/index.html 동기화 완료${ogBlock ? ' (OG 태그 보존)' : ''}`);
  syncedCount++;
});

console.log(`\n총 ${syncedCount}개 프로젝트 파일 동기화 완료.`);
